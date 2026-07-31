/* global BigInt */
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction, getAddress } from '@stellar/freighter-api';
import './VestingDashboard.css';

const CONTRACT_ID = 'CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Smart time formatter: shows hours for <48h, days for longer (User feedback: Ankush Shaw)
function formatTimeRemaining(secondsLeft) {
  if (secondsLeft <= 0) return 'Completed';
  const hours = secondsLeft / 3600;
  if (hours < 48) {
    return `${Math.ceil(hours)}h remaining`;
  }
  const days = Math.ceil(secondsLeft / 86400);
  return `${days}d remaining`;
}

// Format vesting duration in most readable unit
function formatDuration(seconds) {
  const hours = seconds / 3600;
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

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
        total_amount: Number(native.total_amount || 0) / 10000000, // Stroops -> XLM
        released_amount: Number(native.released_amount || 0) / 10000000,
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

  getAllPlans: async function () {
    const count = await this.getPlanCount();
    const plans = [];
    for (let i = 1; i <= count; i++) {
      const plan = await this.getVestingPlan(i);
      if (plan) plans.push(plan);
    }
    return plans;
  },

  calculateVestedAmount: (plan, targetTimestamp = null) => {
    if (!plan) return 0;
    const now = targetTimestamp || Math.floor(Date.now() / 1000);
    if (now <= plan.start_time) return 0;
    if (now < plan.start_time + plan.cliff_duration) return 0;
    if (now >= plan.start_time + plan.duration) return plan.total_amount;
    const elapsed = now - plan.start_time;
    return (plan.total_amount * elapsed) / plan.duration;
  },

  claimVestedTokens: async (planId, walletAddress) => {
    let account;
    try {
      account = await rpc.getAccount(walletAddress);
    } catch (accErr) {
      throw new Error(
        'Unfunded Testnet Account: Your connected wallet has no active XLM balance on Testnet. Please fund using Friendbot.'
      );
    }

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

    const simResult = await rpc.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simResult.error)}`);
    }
    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

    const txXdr = preparedTx.toXDR();
    const signedXdrResponse = await signTransaction(txXdr, {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
      accountToSign: walletAddress,
    });

    const xdrString = typeof signedXdrResponse === 'string'
      ? signedXdrResponse
      : (signedXdrResponse?.signedTxXdr || signedXdrResponse?.xdr || String(signedXdrResponse || ''));

    if (!xdrString) {
      throw new Error('Wallet signature failed.');
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
    const sendResult = await rpc.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${JSON.stringify(sendResult.errorResult || {})}`);
    }

    let getResult;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        getResult = await rpc.getTransaction(sendResult.hash);
        if (getResult && getResult.status !== 'NOT_FOUND') break;
      } catch (pollErr) {
        console.warn('Poll error:', pollErr);
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
        txHash: sendResult.hash,
      };
    }
    return { claimed: 0, txHash: sendResult.hash };
  },
};

function VestingDashboard({ wallet, onNavigateCreate }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [batchClaiming, setBatchClaiming] = useState(false);
  const [filter, setFilter] = useState('all'); // all, mine, claimable, cliff
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null); // for Plan Inspector Modal
  const [calcDate, setCalcDate] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      const allPlans = await sorobanService.getAllPlans();
      const enriched = allPlans.map(plan => {
        const vested = sorobanService.calculateVestedAmount(plan);
        const releasable = Math.max(0, vested - plan.released_amount);
        const progress = plan.total_amount > 0 ? (vested / plan.total_amount) * 100 : 0;
        const now = Math.floor(Date.now() / 1000);
        const inCliff = now < plan.start_time + plan.cliff_duration;
        const isCompleted = vested >= plan.total_amount;

        const now2 = Math.floor(Date.now() / 1000);
        const endTime = plan.start_time + plan.duration;
        const secondsLeft = Math.max(0, endTime - now2);

        return {
          ...plan,
          vested,
          releasable,
          progress,
          inCliff,
          isCompleted,
          secondsLeft,
        };
      });
      setPlans(enriched);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch vesting plans from Soroban network');
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    const interval = setInterval(loadPlans, 6000);
    return () => clearInterval(interval);
  }, [loadPlans]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalLocked = plans.reduce((acc, p) => acc + p.total_amount, 0);
    const totalClaimed = plans.reduce((acc, p) => acc + p.released_amount, 0);
    const myPlans = plans.filter(p => p.beneficiary === wallet);
    const claimablePlans = plans.filter(p => p.beneficiary === wallet && p.releasable > 0);
    const totalClaimableAmount = claimablePlans.reduce((acc, p) => acc + p.releasable, 0);

    return {
      totalLocked,
      totalClaimed,
      myPlansCount: myPlans.length,
      claimablePlans,
      totalClaimableAmount,
    };
  }, [plans, wallet]);

  // Filtered & Searched Plans List
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      // Category filter
      if (filter === 'mine' && plan.beneficiary !== wallet) return false;
      if (filter === 'claimable' && plan.releasable <= 0) return false;
      if (filter === 'cliff' && !plan.inCliff) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = `#${plan.id}`.includes(query) || String(plan.id) === query;
        const matchesBeneficiary = plan.beneficiary.toLowerCase().includes(query);
        const matchesToken = plan.token.toLowerCase().includes(query);
        if (!matchesId && !matchesBeneficiary && !matchesToken) return false;
      }
      return true;
    });
  }, [plans, filter, searchQuery, wallet]);

  const handleClaim = async (planId) => {
    setClaimingId(planId);
    setError(null);
    setSuccessMsg(null);

    try {
      let activeWallet = wallet;
      try {
        const addrRes = await getAddress();
        if (addrRes?.address) activeWallet = addrRes.address;
      } catch (e) {
        console.warn('Freighter refresh:', e);
      }

      const result = await sorobanService.claimVestedTokens(planId, activeWallet);
      setSuccessMsg(`Successfully claimed ${result.claimed.toFixed(2)} XLM from Plan #${planId}!`);
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setError(`Claim failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleBatchClaimAll = async () => {
    if (metrics.claimablePlans.length === 0) return;
    setBatchClaiming(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let activeWallet = wallet;
      try {
        const addrRes = await getAddress();
        if (addrRes?.address) activeWallet = addrRes.address;
      } catch (e) {
        console.warn('Freighter refresh:', e);
      }

      let totalClaimedSum = 0;
      for (const p of metrics.claimablePlans) {
        try {
          const res = await sorobanService.claimVestedTokens(p.id, activeWallet);
          totalClaimedSum += res.claimed;
        } catch (planErr) {
          console.error(`Failed to claim plan #${p.id}:`, planErr);
        }
      }

      setSuccessMsg(`Batch claim complete! Unlocked a total of ${totalClaimedSum.toFixed(2)} XLM.`);
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 7000);
    } catch (err) {
      setError(`Batch claim failed: ${err.message}`);
    } finally {
      setBatchClaiming(false);
    }
  };

  // Inspector Custom Date Calculator
  const calculatedFutureAmount = useMemo(() => {
    if (!selectedPlan || !calcDate) return null;
    const targetTime = Math.floor(new Date(calcDate).getTime() / 1000);
    if (isNaN(targetTime)) return null;
    const vested = sorobanService.calculateVestedAmount(selectedPlan, targetTime);
    return Math.max(0, vested - selectedPlan.released_amount);
  }, [selectedPlan, calcDate]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="loading-spinner" />
        <p>Connecting to Soroban RPC & loading plans...</p>
      </div>
    );
  }

  return (
    <div className="dashboard" id="vesting-dashboard">
      {/* 1-Click Batch Claim All Bar (Human-like feature!) */}
      {wallet && metrics.claimablePlans.length > 0 && (
        <div className="batch-claim-banner animate-slide-down">
          <div className="banner-left">
            <span className="banner-icon">⚡</span>
            <div>
              <strong>Claim Available Tokens</strong>
              <p>You have {metrics.claimablePlans.length} vesting schedules ready to claim ({metrics.totalClaimableAmount.toFixed(2)} XLM)</p>
            </div>
          </div>
          <button
            className="batch-claim-btn"
            onClick={handleBatchClaimAll}
            disabled={batchClaiming}
          >
            {batchClaiming ? (
              <>
                <span className="btn-spinner" />
                Claiming All...
              </>
            ) : (
              <>💰 Claim All ({metrics.totalClaimableAmount.toFixed(2)} XLM) →</>
            )}
          </button>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrap icon-emerald">💎</div>
          <div>
            <span className="stat-number">{metrics.totalLocked.toLocaleString(undefined, { maximumFractionDigits: 1 })} XLM</span>
            <span className="stat-label">Total Value Locked (TVL)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap icon-cyan">🔓</div>
          <div>
            <span className="stat-number">{metrics.totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 1 })} XLM</span>
            <span className="stat-label">Total Claimed Tokens</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap icon-indigo">📜</div>
          <div>
            <span className="stat-number">{plans.length}</span>
            <span className="stat-label">Total Schedules</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap icon-amber">👤</div>
          <div>
            <span className="stat-number">{metrics.myPlansCount}</span>
            <span className="stat-label">My Schedules</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="dash-toolbar">
        <div className="toolbar-left">
          <h2>Vesting Schedules</h2>
          <span className="count-pill">{filteredPlans.length} Found</span>
        </div>

        <div className="toolbar-right">
          {/* Search Box */}
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Plan ID or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="filter-group">
            {[
              { key: 'all', label: `All (${plans.length})` },
              { key: 'mine', label: `My Wallet (${metrics.myPlansCount})` },
              { key: 'claimable', label: `Claimable (${plans.filter(p => p.releasable > 0).length})` },
              { key: 'cliff', label: `In Cliff (${plans.filter(p => p.inCliff).length})` },
            ].map(f => (
              <button
                key={f.key}
                className={`filter-pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      {error && <div className="dash-alert dash-alert-error">⚠️ {error}</div>}
      {successMsg && <div className="dash-alert dash-alert-success">✅ {successMsg}</div>}

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📭</div>
          <h3>No Vesting Plans Match Your Criteria</h3>
          <p>Create a new schedule or change your search filter to see existing plans.</p>
          <button className="btn-create-first" onClick={onNavigateCreate}>
            + Create Vesting Schedule
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {filteredPlans.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${plan.beneficiary === wallet ? 'is-mine' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              {/* Card Header */}
              <div className="card-top">
                <div className="card-id-row">
                  <span className="card-id">Plan #{plan.id}</span>
                  {plan.beneficiary === wallet && (
                    <span className="mine-badge">Mine</span>
                  )}
                </div>

                <span className={`status-badge ${plan.inCliff ? 'badge-cliff' : plan.releasable > 0 ? 'badge-claimable' : 'badge-locked'}`}>
                  {plan.inCliff ? '🧊 In Cliff' : plan.releasable > 0 ? '🔓 Claimable' : plan.isCompleted ? '✓ Completed' : '🔒 Vesting'}
                </span>
              </div>

              {/* Card Details */}
              <div className="card-details">
                <div className="detail-item">
                  <span className="detail-label">Beneficiary</span>
                  <span className="detail-value mono" title={plan.beneficiary}>
                    {plan.beneficiary.substring(0, 6)}...{plan.beneficiary.substring(plan.beneficiary.length - 4)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Locked</span>
                  <span className="detail-value text-emerald">{plan.total_amount.toLocaleString()} XLM</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="card-progress">
                <div className="progress-top">
                  <span>Vested Progress</span>
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
                    <span className="mini-value">{plan.vested.toFixed(1)} XLM</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-label">Available</span>
                    <span className="mini-value text-cyan">{plan.releasable.toFixed(1)} XLM</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-label">Time Left</span>
                    <span className="mini-value">{formatTimeRemaining(plan.secondsLeft)}</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                <button
                  className="inspect-btn"
                  onClick={() => setSelectedPlan(plan)}
                >
                  Inspect Details ↗
                </button>

                {plan.releasable > 0 && plan.beneficiary === wallet && (
                  <button
                    className="claim-btn"
                    onClick={() => handleClaim(plan.id)}
                    disabled={claimingId === plan.id}
                  >
                    {claimingId === plan.id ? 'Claiming...' : `💰 Claim ${plan.releasable.toFixed(1)} XLM`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Inspector Modal */}
      {selectedPlan && (
        <div className="modal-backdrop" onClick={() => setSelectedPlan(null)}>
          <div className="modal-card inspector-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="inspector-header">
              <div>
                <span className="inspector-plan-id">Plan #{selectedPlan.id}</span>
                <h3>Vesting Schedule Breakdown</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedPlan(null)}>×</button>
            </div>

            <div className="inspector-body">
              {/* Status Chips */}
              <div className="inspector-chips-row">
                <span className="chip-item">
                  Token: <strong>XLM (Soroban SAC)</strong>
                </span>
                <span className="chip-item">
                  Beneficiary: <code className="mono">{selectedPlan.beneficiary.substring(0, 6)}...{selectedPlan.beneficiary.substring(selectedPlan.beneficiary.length - 4)}</code>
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="inspector-grid">
                <div className="ins-stat-box">
                  <span className="ins-label">Total Amount</span>
                  <strong className="ins-val">{selectedPlan.total_amount.toLocaleString()} XLM</strong>
                </div>
                <div className="ins-stat-box">
                  <span className="ins-label">Released Amount</span>
                  <strong className="ins-val">{selectedPlan.released_amount.toLocaleString()} XLM</strong>
                </div>
                <div className="ins-stat-box">
                  <span className="ins-label">Releasable Now</span>
                  <strong className="ins-val text-cyan">{selectedPlan.releasable.toFixed(2)} XLM</strong>
                </div>
                <div className="ins-stat-box">
                  <span className="ins-label">Vesting Duration</span>
                  <strong className="ins-val">{formatDuration(selectedPlan.duration)}</strong>
                </div>
                <div className="ins-stat-box">
                  <span className="ins-label">Time Remaining</span>
                  <strong className="ins-val">{formatTimeRemaining(selectedPlan.secondsLeft)}</strong>
                </div>
              </div>

              {/* Timeline Graph */}
              <div className="timeline-card">
                <h4>Schedule Timeline</h4>
                <div className="timeline-dates-row">
                  <div>
                    <span className="t-label">Start Date</span>
                    <strong className="t-val">{new Date(selectedPlan.start_time * 1000).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="t-label">Cliff Expiry</span>
                    <strong className="t-val text-amber">
                      {selectedPlan.cliff_duration > 0 ? new Date((selectedPlan.start_time + selectedPlan.cliff_duration) * 1000).toLocaleDateString() : 'No Cliff'}
                    </strong>
                  </div>
                  <div>
                    <span className="t-label">End Date</span>
                    <strong className="t-val text-emerald">
                      {new Date((selectedPlan.start_time + selectedPlan.duration) * 1000).toLocaleDateString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Interactive Future Date Calculator */}
              <div className="calculator-box">
                <span className="calc-title">🔮 Predict Vested Tokens on Future Date</span>
                <div className="calc-input-row">
                  <input
                    type="date"
                    className="calc-date-input"
                    value={calcDate}
                    onChange={(e) => setCalcDate(e.target.value)}
                  />
                  {calculatedFutureAmount !== null && (
                    <div className="calc-result-tag">
                      Estimated Unlocked: <strong>{calculatedFutureAmount.toFixed(2)} XLM</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedPlan(null)}>Close</button>
              {selectedPlan.releasable > 0 && selectedPlan.beneficiary === wallet && (
                <button
                  className="btn-confirm-vibrant"
                  onClick={() => {
                    handleClaim(selectedPlan.id);
                    setSelectedPlan(null);
                  }}
                >
                  💰 Claim {selectedPlan.releasable.toFixed(2)} XLM Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VestingDashboard;
