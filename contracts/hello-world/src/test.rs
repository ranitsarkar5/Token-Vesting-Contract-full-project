#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, testutils::Address as _};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};

fn create_token_contract(env: &Env, admin: &Address) -> (Address, TokenClient<'static>, TokenAdminClient<'static>) {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token = TokenClient::new(env, &token_address);
    let token_admin = TokenAdminClient::new(env, &token_address);
    (token_address, token, token_admin)
}

#[test]
fn test_create_vesting_plan() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVestingContract, ());
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    
    let (token_id, token, token_admin) = create_token_contract(&env, &admin);
    
    // Mint tokens to the creator
    token_admin.mint(&creator, &2_000_000);

    let now = env.ledger().timestamp();

    // Create a vesting plan
    let plan_id = client.create_vesting_plan(
        &creator,
        &beneficiary,
        &token_id,
        &1_000_000,
        &now,
        &(365 * 24 * 60 * 60), // 1 year duration
        &0,                     // No cliff
    );

    assert_eq!(plan_id, 1);

    // Verify plan was created
    let plan = client.get_plan(&plan_id).unwrap();
    assert_eq!(plan.beneficiary, beneficiary);
    assert_eq!(plan.total_amount, 1_000_000);
    assert_eq!(plan.released_amount, 0);
    
    // Verify tokens were transferred to the contract
    assert_eq!(token.balance(&contract_id), 1_000_000);
    assert_eq!(token.balance(&creator), 1_000_000);
}

#[test]
fn test_vested_amount_before_start() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVestingContract, ());
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    
    let (token_id, _token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1_000_000);

    let now = env.ledger().timestamp();
    let start_time = now + 1000;

    let plan_id = client.create_vesting_plan(
        &creator,
        &beneficiary,
        &token_id,
        &1_000_000,
        &start_time,
        &(365 * 24 * 60 * 60),
        &0,
    );

    // Before vesting starts, nothing should be vested
    let vested = client.vested_amount(&plan_id);
    assert_eq!(vested, 0);
}

#[test]
fn test_vested_amount_at_cliff() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(TokenVestingContract, ());
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    
    let (token_id, _token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&creator, &1_000_000);

    let now = env.ledger().timestamp();
    let cliff = 365 * 24 * 60 * 60; // 1 year cliff

    let plan_id = client.create_vesting_plan(
        &creator,
        &beneficiary,
        &token_id,
        &1_000_000,
        &now,
        &(cliff * 2), // 2 years total duration
        &cliff,       // 1 year cliff
    );

    // Before cliff period, nothing is vested
    let vested_at_6_months = client.vested_amount(&plan_id);
    assert_eq!(vested_at_6_months, 0);
}

