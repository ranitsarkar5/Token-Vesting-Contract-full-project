// Soroban Service - Mock implementation for demonstration
// In production, replace with actual Soroban SDK contract calls

const CONTRACT_ID = process.env.REACT_APP_CONTRACT_ID || 'DEMO_CONTRACT_ID';
const NETWORK = process.env.REACT_APP_NETWORK || 'testnet';

class SorobanService {
  constructor() {
    this.contractId = CONTRACT_ID;
    this.network = NETWORK;
    this.plans = this.loadPlans();
  }

  loadPlans() {
    try {
      const stored = localStorage.getItem('vesting_plans');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  savePlans() {
    localStorage.setItem('vesting_plans', JSON.stringify(this.plans));
  }

  async createVestingPlan(beneficiary, token, amount, startTime, duration, cliffDuration) {
    const planId = Object.keys(this.plans).length + 1;

    const plan = {
      id: planId,
      beneficiary,
      token,
      total_amount: amount,
      released_amount: 0,
      start_time: startTime,
      duration,
      cliff_duration: cliffDuration,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.plans[planId] = plan;
    this.savePlans();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return planId;
  }

  async getVestingPlan(planId) {
    return this.plans[planId] || null;
  }

  calculateVestedAmount(plan) {
    if (!plan) return 0;

    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime <= plan.start_time) {
      return 0;
    }

    // Check cliff period
    if (currentTime < plan.start_time + plan.cliff_duration) {
      return 0;
    }

    // Fully vested
    if (currentTime >= plan.start_time + plan.duration) {
      return plan.total_amount;
    }

    // Linear vesting
    const elapsed = currentTime - plan.start_time;
    return Math.floor((plan.total_amount * elapsed) / plan.duration);
  }

  async getReleasableAmount(planId) {
    const plan = this.plans[planId];
    if (!plan) return 0;

    const vested = this.calculateVestedAmount(plan);
    return Math.max(0, vested - plan.released_amount);
  }

  async claimVestedTokens(planId) {
    const plan = this.plans[planId];
    if (!plan) throw new Error('Plan not found');

    const releasable = await this.getReleasableAmount(planId);
    if (releasable <= 0) return 0;

    plan.released_amount += releasable;
    this.savePlans();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    return releasable;
  }

  async getAllPlans() {
    return Object.values(this.plans);
  }

  async getPlansByBeneficiary(beneficiary) {
    return Object.values(this.plans).filter(p => p.beneficiary === beneficiary);
  }

  async getPlanCount() {
    return Object.keys(this.plans).length;
  }
}

const sorobanService = new SorobanService();
export default sorobanService;
