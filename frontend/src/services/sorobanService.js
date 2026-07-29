/* global BigInt */
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const CONTRACT_ID = 'CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

class SorobanService {
  constructor() {
    this.rpc = new StellarSdk.rpc.Server(RPC_URL);
    this.contractId = CONTRACT_ID;
  }

  // ──────────────────────────────────────────────
  // READ OPERATIONS (free, no wallet needed)
  // ──────────────────────────────────────────────

  async getPlanCount() {
    try {
      // Use a random keypair for simulation to avoid account-not-found or malformed address errors
      const tempKeypair = StellarSdk.Keypair.random();
      const dummyAccount = new StellarSdk.Account(tempKeypair.publicKey(), '0');
      
      const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'get_plan_count',
            args: [],
          })
        )
        .setTimeout(30)
        .build();

      const sim = await this.rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) return 0;
      const result = sim.result?.retval;
      return result ? Number(StellarSdk.scValToNative(result)) : 0;
    } catch (e) {
      console.error('getPlanCount error:', e);
      return 0;
    }
  }

  async getVestingPlan(planId) {
    try {
      const tempKeypair = StellarSdk.Keypair.random();
      const dummyAccount = new StellarSdk.Account(tempKeypair.publicKey(), '0');
      
      const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'get_plan',
            args: [StellarSdk.nativeToScVal(BigInt(planId), { type: 'u64' })],
          })
        )
        .setTimeout(30)
        .build();

      const sim = await this.rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) return null;
      const result = sim.result?.retval;
      if (!result) return null;

      const native = StellarSdk.scValToNative(result);
      return {
        id: planId,
        beneficiary: native.beneficiary?.toString() || '',
        token: native.token?.toString() || '',
        total_amount: Number(native.total_amount || 0),
        released_amount: Number(native.released_amount || 0),
        start_time: Number(native.start_time || 0),
        duration: Number(native.duration || 0),
        cliff_duration: Number(native.cliff_duration || 0),
        created_at: Number(native.created_at || 0),
      };
    } catch (e) {
      console.error(`getVestingPlan(${planId}) error:`, e);
      return null;
    }
  }

  async getAllPlans() {
    const count = await this.getPlanCount();
    const plans = [];
    for (let i = 1; i <= count; i++) {
      const plan = await this.getVestingPlan(i);
      if (plan) plans.push(plan);
    }
    return plans;
  }

  async getPlansByBeneficiary(beneficiary) {
    const all = await this.getAllPlans();
    return all.filter(p => p.beneficiary === beneficiary);
  }

  calculateVestedAmount(plan) {
    if (!plan) return 0;
    const now = Math.floor(Date.now() / 1000);
    if (now <= plan.start_time) return 0;
    if (now < plan.start_time + plan.cliff_duration) return 0;
    if (now >= plan.start_time + plan.duration) return plan.total_amount;
    const elapsed = now - plan.start_time;
    return Math.floor((plan.total_amount * elapsed) / plan.duration);
  }

  // ──────────────────────────────────────────────
  // WRITE OPERATIONS (require wallet signing)
  // ──────────────────────────────────────────────

  async createVestingPlan(beneficiary, token, amount, startTime, duration, cliffDuration, walletAddress) {
    const tokenAddress = (token && token.trim()) ? token.trim() : 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    const account = await this.rpc.getAccount(walletAddress);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: 'create_vesting_plan',
          args: [
            StellarSdk.nativeToScVal(walletAddress, { type: 'address' }),
            StellarSdk.nativeToScVal(beneficiary, { type: 'address' }),
            StellarSdk.nativeToScVal(tokenAddress, { type: 'address' }),
            StellarSdk.nativeToScVal(BigInt(Math.floor(amount)), { type: 'i128' }),
            StellarSdk.nativeToScVal(BigInt(startTime), { type: 'u64' }),
            StellarSdk.nativeToScVal(BigInt(duration), { type: 'u64' }),
            StellarSdk.nativeToScVal(BigInt(cliffDuration), { type: 'u64' }),
          ],
        })
      )
      .setTimeout(30)
      .build();

    const simResult = await this.rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }
    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const txXdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await this.rpc.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${sendResult.errorResult}`);
    }

    // Poll for result
    let getResult;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      getResult = await this.rpc.getTransaction(sendResult.hash);
      if (getResult.status !== 'NOT_FOUND') break;
    }

    if (getResult?.status === 'SUCCESS') {
      return {
        planId: Number(StellarSdk.scValToNative(getResult.returnValue)),
        txHash: sendResult.hash
      };
    }
    throw new Error('Transaction did not complete in time');
  }

  async claimVestedTokens(planId, walletAddress) {
    const account = await this.rpc.getAccount(walletAddress);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: 'claim_vested',
          args: [StellarSdk.nativeToScVal(BigInt(planId), { type: 'u64' })],
        })
      )
      .setTimeout(30)
      .build();

    const simResult = await this.rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }
    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const txXdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await this.rpc.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${sendResult.errorResult}`);
    }

    let getResult;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      getResult = await this.rpc.getTransaction(sendResult.hash);
      if (getResult.status !== 'NOT_FOUND') break;
    }

    if (getResult?.status === 'SUCCESS') {
      return {
        claimed: Number(StellarSdk.scValToNative(getResult.returnValue)),
        txHash: sendResult.hash
      };
    }
    throw new Error('Transaction did not complete in time');
  }
}

const sorobanService = new SorobanService();
export default sorobanService;
