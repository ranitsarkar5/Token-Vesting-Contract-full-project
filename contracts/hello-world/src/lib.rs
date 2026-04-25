#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, symbol_short};

#[contracttype]
#[derive(Clone, Debug)]
pub struct VestingPlan {
    pub beneficiary: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub start_time: u64,
    pub duration: u64,
    pub cliff_duration: u64,
    pub created_at: u64,
}

#[contract]
pub struct TokenVestingContract;

#[contractimpl]
impl TokenVestingContract {
    
    /// PERMISSIONLESS: Anyone can create a vesting plan
    /// Plan ID is auto-generated as counter-based index
    pub fn create_vesting_plan(
        env: Env,
        beneficiary: Address,
        token: Address,
        total_amount: i128,
        start_time: u64,
        duration: u64,
        cliff_duration: u64,
    ) -> u64 {
        // Get the next plan ID
        let plan_count: u64 = env.storage()
            .persistent()
            .get(&symbol_short!("PCNT"))
            .unwrap_or(0);
        
        let plan_id = plan_count + 1;
        
        // Create the vesting plan
        let plan = VestingPlan {
            beneficiary: beneficiary.clone(),
            token: token.clone(),
            total_amount,
            released_amount: 0,
            start_time,
            duration,
            cliff_duration,
            created_at: env.ledger().timestamp(),
        };
        
        // Store the plan using the ID as key in a Map
        let mut plans: Map<u64, VestingPlan> = env.storage()
            .persistent()
            .get(&symbol_short!("PLANS"))
            .unwrap_or(Map::new(&env));
        
        plans.set(plan_id, plan);
        env.storage().persistent().set(&symbol_short!("PLANS"), &plans);
        
        // Increment plan counter
        env.storage().persistent().set(&symbol_short!("PCNT"), &plan_id);
        
        // Transfer tokens from creator to contract (creator must approve first)
        Self::transfer_token_from(env.clone(), token, env.current_contract_address(), total_amount);
        
        plan_id
    }

    /// PERMISSIONLESS: Anyone can claim their vested tokens
    pub fn claim_vested(env: Env, plan_id: u64) -> i128 {
        let mut plans: Map<u64, VestingPlan> = env.storage()
            .persistent()
            .get(&symbol_short!("PLANS"))
            .unwrap();
        
        let mut plan = plans.get(plan_id).unwrap();
        
        // Calculate releasable amount
        let releasable = Self::releasable_amount(env.clone(), plan_id);
        
        if releasable <= 0 {
            return 0;
        }
        
        // Update released amount
        plan.released_amount += releasable;
        plans.set(plan_id, plan.clone());
        env.storage().persistent().set(&symbol_short!("PLANS"), &plans);
        
        // Transfer tokens to beneficiary
        Self::transfer_token(env.clone(), plan.token.clone(), plan.beneficiary.clone(), releasable);
        
        releasable
    }

    /// PERMISSIONLESS: Query vested amount (read-only)
    pub fn vested_amount(env: Env, plan_id: u64) -> i128 {
        let plans: Map<u64, VestingPlan> = env.storage()
            .persistent()
            .get(&symbol_short!("PLANS"))
            .unwrap();
        
        let plan = plans.get(plan_id).unwrap();
        
        let current_time = env.ledger().timestamp();
        
        // Check cliff period
        if current_time < plan.start_time + plan.cliff_duration {
            return 0;
        }
        
        if current_time <= plan.start_time {
            return 0;
        }
        
        let elapsed = current_time - plan.start_time;
        
        if elapsed >= plan.duration {
            return plan.total_amount;
        }
        
        (plan.total_amount as u64 * elapsed / plan.duration) as i128
    }

    /// PERMISSIONLESS: Query releasable amount (read-only)
    pub fn releasable_amount(env: Env, plan_id: u64) -> i128 {
        let plans: Map<u64, VestingPlan> = env.storage()
            .persistent()
            .get(&symbol_short!("PLANS"))
            .unwrap();
        
        let plan = plans.get(plan_id).unwrap();
        
        let vested = Self::vested_amount(env.clone(), plan_id);
        vested - plan.released_amount
    }

    /// PERMISSIONLESS: Query vesting plan details
    pub fn get_plan(env: Env, plan_id: u64) -> VestingPlan {
        let plans: Map<u64, VestingPlan> = env.storage()
            .persistent()
            .get(&symbol_short!("PLANS"))
            .unwrap();
        
        plans.get(plan_id).unwrap()
    }

    /// PERMISSIONLESS: Query total number of plans created
    pub fn get_plan_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&symbol_short!("PCNT"))
            .unwrap_or(0)
    }

    // Internal helper: Transfer token from account to contract
    fn transfer_token_from(env: Env, token: Address, to: Address, amount: i128) {
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer_from(
            &env.current_contract_address(),
            &env.current_contract_address(),
            &to,
            &amount,
        );
    }

    // Internal helper: Transfer token from contract to account
    fn transfer_token(env: Env, token: Address, to: Address, amount: i128) {
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(
            &env.current_contract_address(),
            &to,
            &amount,
        );
    }
}

#[cfg(test)]
mod test;
