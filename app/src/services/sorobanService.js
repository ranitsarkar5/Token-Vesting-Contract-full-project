import { Client, networks } from 'token_vesting';
import { signTransaction } from '@stellar/freighter-api';

class SorobanService {
  constructor() {
    this.client = new Client({
      ...networks.testnet,
      rpcUrl: 'https://soroban-testnet.stellar.org',
    });
  }

  async createVestingPlan(beneficiary, token, amount, startTime, duration, cliffDuration, walletAddress) {
    // Convert to BigInt since the contract expects i128 and u64
    const amountInt = BigInt(Math.floor(amount));
    
    const tx = await this.client.create_vesting_plan({
      beneficiary,
      token,
      total_amount: amountInt,
      start_time: BigInt(startTime),
      duration: BigInt(duration),
      cliff_duration: BigInt(cliffDuration)
    }, { publicKey: walletAddress });

    const response = await tx.signAndSend({ signTransaction });
    return Number(response.result); // Returns plan ID
  }

  async getVestingPlan(planId) {
    try {
      const tx = await this.client.get_plan({ plan_id: BigInt(planId) });
      const plan = tx.result;
      return {
        id: planId,
        beneficiary: plan.beneficiary,
        token: plan.token,
        total_amount: Number(plan.total_amount),
        released_amount: Number(plan.released_amount),
        start_time: Number(plan.start_time),
        duration: Number(plan.duration),
        cliff_duration: Number(plan.cliff_duration),
        created_at: Number(plan.created_at)
      };
    } catch (e) {
      console.error("Error fetching plan:", e);
      return null;
    }
  }

  async getReleasableAmount(planId) {
    try {
      const tx = await this.client.releasable_amount({ plan_id: BigInt(planId) });
      return Number(tx.result);
    } catch (e) {
      return 0;
    }
  }

  async claimVestedTokens(planId, walletAddress) {
    const tx = await this.client.claim_vested({ plan_id: BigInt(planId) }, { publicKey: walletAddress });
    const response = await tx.signAndSend({ signTransaction });
    return Number(response.result);
  }

  async getPlanCount() {
    try {
      const tx = await this.client.get_plan_count();
      return Number(tx.result);
    } catch (e) {
      return 0;
    }
  }

  calculateVestedAmount(plan) {
    if (!plan) return 0;
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime <= plan.start_time) return 0;
    if (currentTime < plan.start_time + plan.cliff_duration) return 0;
    if (currentTime >= plan.start_time + plan.duration) return plan.total_amount;
    
    const elapsed = currentTime - plan.start_time;
    return Math.floor((plan.total_amount * elapsed) / plan.duration);
  }

  async getAllPlans() {
    const count = await this.getPlanCount();
    const plans = [];
    // plan IDs are 1-indexed
    for (let i = 1; i <= count; i++) {
      const plan = await this.getVestingPlan(i);
      if (plan) {
        plans.push(plan);
      }
    }
    return plans;
  }

  async getPlansByBeneficiary(beneficiary) {
    const allPlans = await this.getAllPlans();
    return allPlans.filter(p => p.beneficiary === beneficiary);
  }
}

const sorobanService = new SorobanService();
export default sorobanService;
