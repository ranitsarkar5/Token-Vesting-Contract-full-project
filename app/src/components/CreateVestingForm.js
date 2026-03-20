import { useState } from 'react';
import sorobanService from '../services/sorobanService';
import './CreateVestingForm.css';

function CreateVestingForm({ wallet }) {
  const [formData, setFormData] = useState({
    beneficiary: '',
    tokenAddress: '',
    amount: '',
    durationDays: '365',
    cliffDays: '0',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.beneficiary) throw new Error('Beneficiary address is required');
      if (!formData.tokenAddress) throw new Error('Token address is required');
      if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error('Amount must be greater than 0');
      if (!formData.durationDays || parseInt(formData.durationDays) <= 0) throw new Error('Duration must be at least 1 day');

      const now = Math.floor(Date.now() / 1000);
      const durationSeconds = parseInt(formData.durationDays) * 86400;
      const cliffSeconds = parseInt(formData.cliffDays || '0') * 86400;

      if (cliffSeconds >= durationSeconds) {
        throw new Error('Cliff period must be shorter than total duration');
      }

      const planId = await sorobanService.createVestingPlan(
        formData.beneficiary,
        formData.tokenAddress,
        parseFloat(formData.amount),
        now,
        durationSeconds,
        cliffSeconds
      );

      setSuccess({ message: 'Vesting plan created successfully!', planId });
      setFormData({
        beneficiary: '',
        tokenAddress: '',
        amount: '',
        durationDays: '365',
        cliffDays: '0',
      });
    } catch (err) {
      setError(err.message || 'Failed to create vesting plan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-form-container">
      <div className="form-card">
        <div className="form-header">
          <h2>Create Vesting Plan</h2>
          <p className="form-subtitle">Set up a new permissionless vesting schedule on Soroban</p>
        </div>

        <form onSubmit={handleSubmit} id="create-vesting-form">
          <div className="form-group">
            <label htmlFor="beneficiary">
              <span className="label-icon">👤</span>
              Beneficiary Address
            </label>
            <input
              type="text"
              id="beneficiary"
              name="beneficiary"
              placeholder="G... (Stellar address)"
              value={formData.beneficiary}
              onChange={handleChange}
              className="mono"
              required
            />
            <small>The address that will receive vested tokens</small>
          </div>

          <div className="form-group">
            <label htmlFor="tokenAddress">
              <span className="label-icon">🪙</span>
              Token Contract Address
            </label>
            <input
              type="text"
              id="tokenAddress"
              name="tokenAddress"
              placeholder="C... (Soroban contract address)"
              value={formData.tokenAddress}
              onChange={handleChange}
              className="mono"
              required
            />
            <small>Soroban token contract to vest</small>
          </div>

          <div className="form-group">
            <label htmlFor="amount">
              <span className="label-icon">💰</span>
              Total Amount
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              placeholder="1000"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              required
            />
            <small>Total number of tokens to vest</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="durationDays">
                <span className="label-icon">📅</span>
                Duration (Days)
              </label>
              <input
                type="number"
                id="durationDays"
                name="durationDays"
                placeholder="365"
                min="1"
                value={formData.durationDays}
                onChange={handleChange}
                required
              />
              <small>Total vesting period</small>
            </div>

            <div className="form-group">
              <label htmlFor="cliffDays">
                <span className="label-icon">🧊</span>
                Cliff (Days)
              </label>
              <input
                type="number"
                id="cliffDays"
                name="cliffDays"
                placeholder="0"
                min="0"
                value={formData.cliffDays}
                onChange={handleChange}
              />
              <small>Days before vesting starts</small>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" id="form-error">
              <span>❌</span> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" id="form-success">
              <p><span>✅</span> {success.message}</p>
              <p className="plan-id-display mono">Plan ID: <strong>#{success.planId}</strong></p>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            id="submit-vesting-btn"
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Creating Plan...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Vesting Plan
              </>
            )}
          </button>
        </form>

        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps-grid">
            <div className="step-item">
              <span className="step-num">1</span>
              <span>Tokens vest linearly from start time</span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span>Optional cliff delays initial vesting</span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span>Beneficiary claims tokens anytime after cliff</span>
            </div>
            <div className="step-item">
              <span className="step-num">4</span>
              <span>Plans are immutable once created</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateVestingForm;
