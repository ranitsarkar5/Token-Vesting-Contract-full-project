import { useState, useEffect, useCallback } from 'react';
import sorobanService from '../services/sorobanService';
import './VestingDashboard.css';

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
      const claimed = await sorobanService.claimVestedTokens(planId);
      if (claimed > 0) {
        setSuccessMsg(`Claimed ${claimed.toFixed(2)} tokens from Plan #${planId}!`);
        loadPlans();
        setTimeout(() => setSuccessMsg(null), 5000);
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
