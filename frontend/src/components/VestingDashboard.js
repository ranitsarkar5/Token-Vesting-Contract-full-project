/* global BigInt */
import { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import './VestingDashboard.css';

const CONTRACT_ID = 'CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

const sorobanService = {
  getPlanCount: async () => {
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
            function: 'get_plan_count',
            args: [],
          })
        )
        .setTimeout(30)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) return 0;
      const result = sim.result?.retval;
      return result ? Number(StellarSdk.scValToNative(result)) : 0;
    } catch (e) {
      console.error('getPlanCount error:', e);
      return 0;
    }
  },

  getVestingPlan: async (planId) => {
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

      const sim = await rpc.simulateTransaction(tx);
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
  },

  getAllPlans: async function() {
    const count = await this.getPlanCount();
    const plans = [];
    for (let i = 1; i <= count; i++) {
      const plan = await this.getVestingPlan(i);
      if (plan) plans.push(plan);
    }
    return plans;
  },

  calculateVestedAmount: (plan) => {
    if (!plan) return 0;
    const now = Math.floor(Date.now() / 1000);
    if (now <= plan.start_time) return 0;
    if (now < plan.start_time + plan.cliff_duration) return 0;
    if (now >= plan.start_time + plan.duration) return plan.total_amount;
    const elapsed = now - plan.start_time;
    return Math.floor((plan.total_amount * elapsed) / plan.duration);
  },

  claimVestedTokens: async (planId, walletAddress) => {
    // Step 1: Fetch account sequence
    let account;
    try {
      account = await rpc.getAccount(walletAddress);
    } catch (accErr) {
      throw new Error(
        'Unfunded Testnet Wallet: Your connected Freighter account has no XLM balance on Testnet. Please fund your wallet using Stellar Testnet Friendbot.'
      );
    }

    // Step 2: Build transaction
    let tx;
    try {
      tx = new StellarSdk.TransactionBuilder(account, {
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
    } catch (txBuildErr) {
      throw new Error(`Transaction Building Error: ${txBuildErr.message || 'Invalid parameters supplied'}`);
    }

    // Step 3: Simulate
    let simResult;
    try {
      simResult = await rpc.simulateTransaction(tx);
    } catch (simErr) {
      throw new Error(`Network Error during simulation: ${simErr.message || 'Failed to reach Soroban Testnet RPC'}`);
    }

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const rawError = simResult.error;
      const errorMsg = typeof rawError === 'string'
        ? rawError
        : (rawError?.message || JSON.stringify(rawError || {}));

      if (errorMsg.includes('account entry is missing') || errorMsg.includes('Error(Contract, #6)')) {
        throw new Error('Unfunded Testnet Wallet: Your connected Freighter account has no XLM balance on Testnet. Please fund your address using Stellar Testnet Friendbot.');
      }
      throw new Error(`Simulation failed: ${errorMsg}`);
    }

    // Step 4: Assemble transaction
    let preparedTx;
    try {
      preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    } catch (assembleErr) {
      throw new Error(
        'Unfunded Testnet Wallet / Fee Error: Your wallet needs active testnet XLM balance to cover transaction fees. Please use Stellar Testnet Friendbot to fund your address.'
      );
    }

    // Step 5: Sign with Freighter
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

    // Safely extract string XDR from Freighter response
    const xdrString = typeof signedXdrResponse === 'string'
      ? signedXdrResponse
      : (signedXdrResponse?.signedTxXdr || signedXdrResponse?.xdr || String(signedXdrResponse || ''));

    if (!xdrString || typeof xdrString !== 'string') {
      throw new Error('Wallet Signing Failed: Invalid signed XDR received from Freighter.');
    }

    // Step 6: Submit to Testnet
    let sendResult;
    try {
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
      sendResult = await rpc.sendTransaction(signedTx);
    } catch (sendErr) {
      throw new Error(`Transaction Submission Failed: ${sendErr.message || 'Network submission error'}`);
    }

    if (sendResult.status === 'ERROR') {
      let errDetail = 'Contract execution reverted or claim not authorized.';
      const errStr = JSON.stringify(sendResult.errorResult || {});
      if (errStr.includes('txBadAuth')) {
        errDetail = 'Signature Authorization Failed (txBadAuth): Freighter did not sign the Soroban contract authorization entries. Please try signing again in Freighter.';
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

    // Step 7: Poll transaction result
    let getResult;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        getResult = await rpc.getTransaction(sendResult.hash);
        if (getResult && getResult.status !== 'NOT_FOUND') break;
      } catch (pollErr) {
        console.warn('Polling getTransaction error:', pollErr);
      }
    }

    if (getResult?.status === 'SUCCESS') {
      let claimedStroops = 0;
      try {
        claimedStroops = Number(StellarSdk.scValToNative(getResult.returnValue));
      } catch (e) {
        claimedStroops = 0;
      }
      return {
        claimed: claimedStroops / 10000000,
        txHash: sendResult.hash
      };
    }

    return {
      claimed: 0,
      txHash: sendResult.hash
    };
  }
};


function VestingDashboard({ wallet }) {
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      const allPlans = await sorobanService.getAllPlans();
      const enriched = allPlans.map(plan => {
        const vested = sorobanService.calculateVestedAmount(plan);
        return {
          ...plan,
          vested,
          releasable: Math.max(0, vested - plan.released_amount),
          progress: plan.total_amount > 0
            ? (vested / plan.total_amount) * 100
            : 0,
        };
      });
      setPlans(enriched);
      setLoading(false);
    } catch (err) {
      setError('Failed to load vesting plans');
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    const interval = setInterval(loadPlans, 5000);
    return () => clearInterval(interval);
  }, [loadPlans]);

  useEffect(() => {
    let filtered = plans;
    if (filter === 'mine') {
      filtered = plans.filter(p => p.beneficiary === wallet);
    } else if (filter === 'claimable') {
      filtered = plans.filter(p => p.releasable > 0);
    }
    setFilteredPlans(filtered);
  }, [plans, filter, wallet]);

  const handleClaim = async (planId) => {
    setClaimingId(planId);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await sorobanService.claimVestedTokens(planId, wallet);
      if (result.claimed > 0) {
        setSuccessMsg(
          <span>
            Claimed {result.claimed.toFixed(2)} tokens from Plan #{planId}!
            {result.txHash && (
              <span style={{ marginLeft: '10px' }}>
                Transaction:{' '}
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline' }}
                >
                  {result.txHash.substring(0, 8)}...{result.txHash.substring(result.txHash.length - 8)}
                </a>
              </span>
            )}
          </span>
        );
        loadPlans();
        setTimeout(() => setSuccessMsg(null), 7000);
      } else {
        setError('No tokens available to claim yet');
      }
    } catch (err) {
      setError(`Claim failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  const mineCount = plans.filter(p => p.beneficiary === wallet).length;
  const claimableCount = plans.filter(p => p.releasable > 0).length;

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="loading-spinner" />
        <p>Loading vesting plans...</p>
      </div>
    );
  }

  return (
    <div className="dashboard" id="vesting-dashboard">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div>
            <span className="stat-number">{plans.length}</span>
            <span className="stat-label">Total Plans</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👤</span>
          <div>
            <span className="stat-number">{mineCount}</span>
            <span className="stat-label">My Plans</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔓</span>
          <div>
            <span className="stat-number">{claimableCount}</span>
            <span className="stat-label">Claimable</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dash-toolbar">
        <h2>Vesting Plans</h2>
        <div className="filter-group">
          {[
            { key: 'all', label: `All (${plans.length})` },
            { key: 'mine', label: `Mine (${mineCount})` },
            { key: 'claimable', label: `Claimable (${claimableCount})` },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              id={`filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && <div className="dash-alert dash-alert-error">{error}</div>}
      {successMsg && <div className="dash-alert dash-alert-success">✅ {successMsg}</div>}

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No vesting plans found</h3>
          <p>Create your first plan using the "Create Plan" tab</p>
        </div>
      ) : (
        <div className="plans-grid">
          {filteredPlans.map(plan => (
            <div key={plan.id} className="plan-card" id={`plan-card-${plan.id}`}>
              {/* Card Header */}
              <div className="card-top">
                <span className="card-id">Plan #{plan.id}</span>
                <span className={`card-badge ${plan.releasable > 0 ? 'badge-claimable' : 'badge-locked'}`}>
                  {plan.releasable > 0 ? '🔓 Claimable' : '🔒 Locked'}
                </span>
              </div>

              {/* Details */}
              <div className="card-details">
                <div className="detail-item">
                  <span className="detail-label">Beneficiary</span>
                  <span className="detail-value mono" title={plan.beneficiary}>
                    {plan.beneficiary.substring(0, 8)}...{plan.beneficiary.substring(plan.beneficiary.length - 4)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Token</span>
                  <span className="detail-value mono" title={plan.token}>
                    {plan.token.substring(0, 8)}...{plan.token.substring(plan.token.length - 4)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total</span>
                  <span className="detail-value">{plan.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Released</span>
                  <span className="detail-value">{plan.released_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens</span>
                </div>
              </div>

              {/* Progress */}
              <div className="card-progress">
                <div className="progress-top">
                  <span>Progress</span>
                  <span className="progress-pct">{plan.progress.toFixed(1)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(plan.progress, 100)}%` }}
                  />
                </div>
                <div className="progress-stats">
                  <div className="mini-stat">
                    <span className="mini-label">Vested</span>
                    <span className="mini-value">{plan.vested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-label">Releasable</span>
                    <span className="mini-value accent">{plan.releasable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="card-timeline">
                <div className="timeline-row">
                  <span>Start</span>
                  <span>{new Date(plan.start_time * 1000).toLocaleDateString()}</span>
                </div>
                <div className="timeline-row">
                  <span>End</span>
                  <span>{new Date((plan.start_time + plan.duration) * 1000).toLocaleDateString()}</span>
                </div>
                {plan.cliff_duration > 0 && (
                  <div className="timeline-row">
                    <span>Cliff</span>
                    <span>{Math.round(plan.cliff_duration / 86400)} days</span>
                  </div>
                )}
              </div>

              {/* Claim Button */}
              {plan.releasable > 0 && (
                <button
                  className="claim-btn"
                  onClick={() => handleClaim(plan.id)}
                  disabled={claimingId === plan.id}
                  id={`claim-btn-${plan.id}`}
                >
                  {claimingId === plan.id ? (
                    <>
                      <span className="btn-spinner" />
                      Claiming...
                    </>
                  ) : (
                    <>💰 Claim {plan.releasable.toFixed(2)} Tokens</>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VestingDashboard;
