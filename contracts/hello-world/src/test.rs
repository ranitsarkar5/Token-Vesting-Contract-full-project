#![cfg(test)]

use super::*;
use soroban_sdk::{token::Client as TokenClient, Address, Env, Symbol};
use soroban_sdk::testutils::Address as _;

#[test]
fn test_create_plan() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let beneficiary = Address::generate(&env);

    let vesting_address = env.register(TokenVestingContract, ());
    let vesting_client = TokenVestingContractClient::new(&env, &vesting_address);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_address);

    vesting_client.init(&admin);

    let total_amount = 1000i128;
    token_admin_client.mint(&admin, &total_amount);

    assert_eq!(token_client.balance(&admin), total_amount);
    assert_eq!(token_client.balance(&vesting_address), 0);

    let start_time = 100u64;
    let duration = 1000u64;
    let cliff_duration = 200u64;

    let plan_id = vesting_client.create_plan(
        &beneficiary,
        &token_address,
        &total_amount,
        &start_time,
        &duration,
        &cliff_duration,
    );

    assert_eq!(plan_id, 1);
    assert_eq!(token_client.balance(&admin), 0);
    assert_eq!(token_client.balance(&vesting_address), total_amount);

    let plan = vesting_client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.id, 1);
    assert_eq!(plan.beneficiary, beneficiary);
    assert_eq!(plan.token, token_address);
    assert_eq!(plan.total_amount, total_amount);
    assert_eq!(plan.released_amount, 0);
    assert_eq!(plan.start_time, start_time);
    assert_eq!(plan.duration, duration);
    assert_eq!(plan.cliff_duration, cliff_duration);
}

#[test]
#[should_panic]
fn test_release_fails_before_cliff() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let beneficiary = Address::generate(&env);

    let vesting_address = env.register(TokenVestingContract, ());
    let vesting_client = TokenVestingContractClient::new(&env, &vesting_address);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_address);

    vesting_client.init(&admin);

    let total_amount = 1000i128;
    token_admin_client.mint(&admin, &total_amount);

    let start_time = 100u64;
    let duration = 1000u64;
    let cliff_duration = 200u64;

    let plan_id = vesting_client.create_plan(
        &beneficiary,
        &token_address,
        &total_amount,
        &start_time,
        &duration,
        &cliff_duration,
    );

    // Time is at start_time + 100 (elapsed = 100 < 200 cliff), should panic on release
    vesting_client.release(&plan_id, &(start_time + 100));
}

#[test]
fn test_release_linear() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let beneficiary = Address::generate(&env);

    let vesting_address = env.register(TokenVestingContract, ());
    let vesting_client = TokenVestingContractClient::new(&env, &vesting_address);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_address);

    vesting_client.init(&admin);

    let total_amount = 1000i128;
    token_admin_client.mint(&admin, &total_amount);

    let start_time = 100u64;
    let duration = 1000u64;
    let cliff_duration = 200u64;

    let plan_id = vesting_client.create_plan(
        &beneficiary,
        &token_address,
        &total_amount,
        &start_time,
        &duration,
        &cliff_duration,
    );

    // Time is at start_time + 500 (elapsed = 500 >= 200 cliff)
    // Vested amount = 1000 * 500 / 1000 = 500
    let current_time = start_time + 500;
    let vested = vesting_client.vested_amount(&plan_id, &current_time);
    assert_eq!(vested, 500);

    // Release tokens
    let released = vesting_client.release(&plan_id, &current_time);
    assert_eq!(released, 500);

    // Check balances
    assert_eq!(token_client.balance(&vesting_address), 500);
    assert_eq!(token_client.balance(&beneficiary), 500);

    // Check plan released amount
    let plan = vesting_client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.released_amount, 500);

    // Advance time further to start_time + 750 (elapsed = 750)
    // Vested should be 750. Releasable should be 750 - 500 = 250
    let next_time = start_time + 750;
    let vested_next = vesting_client.vested_amount(&plan_id, &next_time);
    assert_eq!(vested_next, 750);

    let released_next = vesting_client.release(&plan_id, &next_time);
    assert_eq!(released_next, 250);

    assert_eq!(token_client.balance(&vesting_address), 250);
    assert_eq!(token_client.balance(&beneficiary), 750);
}

#[test]
fn test_release_full() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let beneficiary = Address::generate(&env);

    let vesting_address = env.register(TokenVestingContract, ());
    let vesting_client = TokenVestingContractClient::new(&env, &vesting_address);

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_address);

    vesting_client.init(&admin);

    let total_amount = 1000i128;
    token_admin_client.mint(&admin, &total_amount);

    let start_time = 100u64;
    let duration = 1000u64;
    let cliff_duration = 200u64;

    let plan_id = vesting_client.create_plan(
        &beneficiary,
        &token_address,
        &total_amount,
        &start_time,
        &duration,
        &cliff_duration,
    );

    // Time is at start_time + 1500 (elapsed = 1500 > 1000 duration)
    let current_time = start_time + 1500;
    let vested = vesting_client.vested_amount(&plan_id, &current_time);
    assert_eq!(vested, total_amount);

    let released = vesting_client.release(&plan_id, &current_time);
    assert_eq!(released, total_amount);

    assert_eq!(token_client.balance(&vesting_address), 0);
    assert_eq!(token_client.balance(&beneficiary), total_amount);
}
