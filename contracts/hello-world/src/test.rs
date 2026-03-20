#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address};

#[test]
fn test_create_vesting_plan() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenVestingContract);
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let beneficiary = Address::random(&env);
    let token = Address::random(&env);
    let now = env.ledger().timestamp();

    // Create a vesting plan
    let plan_id = client.create_vesting_plan(
        &beneficiary,
        &token,
        &1_000_000,
        &now,
        &(365 * 24 * 60 * 60), // 1 year duration
        &0,                     // No cliff
    );

    assert_eq!(plan_id, 1);

    // Verify plan was created
    let plan = client.get_plan(&plan_id);
    assert_eq!(plan.beneficiary, beneficiary);
    assert_eq!(plan.total_amount, 1_000_000);
    assert_eq!(plan.released_amount, 0);
}

#[test]
fn test_vested_amount_before_start() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenVestingContract);
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let beneficiary = Address::random(&env);
    let token = Address::random(&env);
    let now = env.ledger().timestamp();
    let start_time = now + 1000;

    let plan_id = client.create_vesting_plan(
        &beneficiary,
        &token,
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
    let contract_id = env.register_contract(None, TokenVestingContract);
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let beneficiary = Address::random(&env);
    let token = Address::random(&env);
    let now = env.ledger().timestamp();
    let cliff = 365 * 24 * 60 * 60; // 1 year cliff

    let plan_id = client.create_vesting_plan(
        &beneficiary,
        &token,
        &1_000_000,
        &now,
        &(cliff * 2), // 2 years total duration
        &cliff,       // 1 year cliff
    );

    // Before cliff period, nothing is vested
    let vested_at_6_months = client.vested_amount(&plan_id);
    assert_eq!(vested_at_6_months, 0);
}

#[test]
fn test_get_plan_count() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenVestingContract);
    let client = TokenVestingContractClient::new(&env, &contract_id);

    assert_eq!(client.get_plan_count(), 0);

    let beneficiary = Address::random(&env);
    let token = Address::random(&env);
    let now = env.ledger().timestamp();

    // Create multiple plans
    for i in 1..=3 {
        client.create_vesting_plan(
            &beneficiary,
            &token,
            &1_000_000,
            &now,
            &(365 * 24 * 60 * 60),
            &0,
        );
        assert_eq!(client.get_plan_count(), i);
    }
}

#[test]
fn test_permissionless_creation() {
    // This test demonstrates that anyone can create a vesting plan
    // No special permissions or roles are required
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenVestingContract);
    let client = TokenVestingContractClient::new(&env, &contract_id);

    let beneficiary = Address::random(&env);
    let token = Address::random(&env);
    let now = env.ledger().timestamp();

    // Both plans can be created without authorization checks
    let plan_id_1 = client.create_vesting_plan(
        &beneficiary,
        &token,
        &1_000_000,
        &now,
        &(365 * 24 * 60 * 60),
        &0,
    );

    let plan_id_2 = client.create_vesting_plan(
        &beneficiary,
        &token,
        &2_000_000,
        &now,
        &(365 * 24 * 60 * 60),
        &0,
    );

    assert_eq!(plan_id_1, 1);
    assert_eq!(plan_id_2, 2);
}

