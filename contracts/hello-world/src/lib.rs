#![no_std]
#[cfg(test)]
mod test;
use soroban_sdk::{contract, contractimpl, contracttype, token::Client as TokenClient, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    NextId,
    Plan(u64),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct VestingPlan {
    pub id: u64,
    pub beneficiary: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub start_time: u64,
    pub duration: u64,
    pub cliff_duration: u64,
}

#[contract]
pub struct TokenVestingContract;

#[contractimpl]
impl TokenVestingContract {
    // Initialize the contract with an admin
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1u64);
    }

    // Get the admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // Create a new vesting plan (requires admin signature)
    pub fn create_plan(
        env: Env,
        beneficiary: Address,
        token: Address,
        total_amount: i128,
        start_time: u64,
        duration: u64,
        cliff_duration: u64,
    ) -> u64 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap_or_else(|| {
            panic!("contract not initialized");
        });
        admin.require_auth();

        if total_amount <= 0 {
            panic!("amount must be positive");
        }
        if duration == 0 {
            panic!("duration must be positive");
        }
        if cliff_duration >= duration {
            panic!("cliff must be shorter than duration");
        }

        let plan_id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextId, &(plan_id + 1));

        let plan = VestingPlan {
            id: plan_id,
            beneficiary: beneficiary.clone(),
            token: token.clone(),
            total_amount,
            released_amount: 0,
            start_time,
            duration,
            cliff_duration,
        };

        // Store the plan
        env.storage().instance().set(&DataKey::Plan(plan_id), &plan);

        // Perform token transfer from admin to this contract
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&admin, &env.current_contract_address(), &total_amount);

        // Publish event
        env.events().publish(
            (Symbol::short("vesting"), Symbol::short("created")),
            (plan_id, beneficiary, total_amount),
        );

        plan_id
    }

    // View vesting plan data
    pub fn get_plan(env: Env, plan_id: u64) -> Option<VestingPlan> {
        env.storage().instance().get(&DataKey::Plan(plan_id))
    }

    // Calculate the vested amount for a plan
    pub fn vested_amount(env: Env, plan_id: u64, current_time: u64) -> i128 {
        let plan: VestingPlan = match Self::get_plan(env.clone(), plan_id) {
            Some(p) => p,
            None => return 0,
        };

        if current_time <= plan.start_time {
            return 0;
        }

        let elapsed = current_time - plan.start_time;

        // Enforce cliff duration
        if elapsed < plan.cliff_duration {
            return 0;
        }

        if elapsed >= plan.duration {
            return plan.total_amount;
        }

        plan.total_amount * elapsed as i128 / plan.duration as i128
    }

    // Release vested tokens to the beneficiary
    pub fn release(env: Env, plan_id: u64, current_time: u64) -> i128 {
        let mut plan: VestingPlan = match Self::get_plan(env.clone(), plan_id) {
            Some(p) => p,
            None => panic!("plan not found"),
        };

        let vested = Self::vested_amount(env.clone(), plan_id, current_time);
        let releasable = vested - plan.released_amount;

        if releasable <= 0 {
            panic!("no tokens to release");
        }

        // Update released amount
        plan.released_amount += releasable;
        env.storage().instance().set(&DataKey::Plan(plan_id), &plan);

        // Perform token transfer from contract to beneficiary
        let token_client = TokenClient::new(&env, &plan.token);
        token_client.transfer(&env.current_contract_address(), &plan.beneficiary, &releasable);

        // Publish event
        env.events().publish(
            (Symbol::short("vesting"), Symbol::short("released")),
            (plan_id, plan.beneficiary, releasable),
        );

        releasable
    }
}