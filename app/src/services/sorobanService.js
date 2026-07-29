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

    // Step 1: Fetch account sequence
    let account;
    try {
      account = await this.rpc.getAccount(walletAddress);
    } catch (accErr) {
      throw new Error(
        'Unfunded Testnet Wallet: Your connected Freighter account has no XLM balance on Testnet. Please fund your wallet using Stellar Testnet Friendbot.'
      );
    }

    // Step 2: Build transaction (convert XLM to 7-decimal stroops)
    let tx;
    try {
      const stroopAmount = BigInt(Math.floor(parseFloat(amount) * 10000000));
      tx = new StellarSdk.TransactionBuilder(account, {
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
              StellarSdk.nativeToScVal(stroopAmount, { type: 'i128' }),
              StellarSdk.nativeToScVal(BigInt(startTime), { type: 'u64' }),
              StellarSdk.nativeToScVal(BigInt(duration), { type: 'u64' }),
              StellarSdk.nativeToScVal(BigInt(cliffDuration), { type: 'u64' }),
            ],
          })
        )
        .setTimeout(30)
        .build();
    } catch (txBuildErr) {
      throw new Error(`Transaction Building Error: ${txBuildErr.message || 'Invalid parameters supplied'}`);
    }

    // Step 3: Simulate
    let simResult;
    try {
      simResult = await this.rpc.simulateTransaction(tx);
    } catch (simErr) {
      throw new Error(`Network Error during simulation: ${simErr.message || 'Failed to reach Soroban Testnet RPC'}`);
    }

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const rawError = simResult.error;
      const errorMsg = typeof rawError === 'string'
        ? rawError
        : (rawError?.message || JSON.stringify(rawError || {}));

      if (errorMsg.includes('account entry is missing') || errorMsg.includes('Error(Contract, #6)')) {
        throw new Error('Unfunded Testnet Wallet: Your connected Freighter account has no XLM balance on Testnet. Please fund your wallet using Stellar Testnet Friendbot.');
      }
      if (errorMsg.includes('not enough allowance') || errorMsg.includes('underfunded') || errorMsg.includes('balance') || errorMsg.includes('Error(Contract, #9)')) {
        throw new Error('Insufficient XLM Balance: Your wallet does not have enough XLM tokens to lock into this vesting plan.');
      }
      throw new Error(`Simulation failed: ${errorMsg}`);
    }

    // Step 4: Assemble
    let preparedTx;
    try {
      preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    } catch (assembleErr) {
      throw new Error(
        'Unfunded Testnet Wallet / Fee Error: Your wallet needs active testnet XLM balance to cover transaction fees and storage. Please use Stellar Testnet Friendbot to fund your address.'
      );
    }

    // Step 5: Sign
    let signedXdrResponse;
    try {
      const txXdr = preparedTx.toXDR();
      signedXdrResponse = await signTransaction(txXdr, {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: walletAddress,
      });
    } catch (signErr) {
      throw new Error(`Wallet Signing Cancelled or Failed: ${signErr.message || 'User rejected signature in Freighter'}`);
    }

    const xdrString = typeof signedXdrResponse === 'string'
      ? signedXdrResponse
      : (signedXdrResponse?.signedTxXdr || signedXdrResponse?.xdr || String(signedXdrResponse || ''));

    if (!xdrString || typeof xdrString !== 'string') {
      throw new Error('Wallet Signing Failed: Invalid signed XDR received from Freighter.');
    }

    // Step 6: Submit
    let sendResult;
    try {
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
      sendResult = await this.rpc.sendTransaction(signedTx);
    } catch (sendErr) {
      throw new Error(`Transaction Submission Failed: ${sendErr.message || 'Network submission error'}`);
    }

    if (sendResult.status === 'ERROR') {
      let errDetail = 'Contract execution reverted or insufficient account balance.';
      const errStr = JSON.stringify(sendResult.errorResult || {});
      if (errStr.includes('txBadAuth')) {
        errDetail = 'Signature Authorization Failed (txBadAuth): Freighter did not sign the Soroban contract authorization entries. Please try signing again or check your active account in Freighter.';
      } else if (typeof sendResult.errorResult === 'string') {
        errDetail = sendResult.errorResult;
      } else if (sendResult.errorResultXdr) {
        errDetail = `Result XDR: ${sendResult.errorResultXdr}`;
      } else if (sendResult.errorResult) {
        try {
          errDetail = JSON.stringify(sendResult.errorResult);
        } catch (e) {
          errDetail = String(sendResult.errorResult);
        }
      }
      throw new Error(`Transaction Execution Failed: ${errDetail}`);
    }

    let getResult;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      getResult = await this.rpc.getTransaction(sendResult.hash);
      if (getResult.status !== 'NOT_FOUND') break;
    }

    if (getResult?.status === 'SUCCESS') {
      return {
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

    // Step 5: Sign
    let signedXdrResponse;
    try {
      const txXdr = preparedTx.toXDR();
      signedXdrResponse = await signTransaction(txXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
    } catch (signErr) {
      throw new Error(`Wallet Signing Cancelled or Failed: ${signErr.message || 'User rejected signature in Freighter'}`);
    }

    const xdrString = typeof signedXdrResponse === 'string'
      ? signedXdrResponse
      : (signedXdrResponse?.signedTxXdr || signedXdrResponse?.xdr || String(signedXdrResponse || ''));

    if (!xdrString || typeof xdrString !== 'string') {
      throw new Error('Wallet Signing Failed: Invalid signed XDR received from Freighter.');
    }

    // Step 6: Submit
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
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
