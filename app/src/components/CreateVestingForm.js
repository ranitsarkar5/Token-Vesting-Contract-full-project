/* global BigInt */
import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import './CreateVestingForm.css';

const CONTRACT_ID = 'CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const DEFAULT_TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

const sorobanService = {
  createVestingPlan: async (beneficiary, token, amount, startTime, duration, cliffDuration, walletAddress) => {
    const tokenAddress = (token && token.trim()) ? token.trim() : DEFAULT_TOKEN_ADDRESS;
    const account = await rpc.getAccount(walletAddress);

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

    const simResult = await rpc.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
      const rawError = simResult.error;
      const errorMsg = typeof rawError === 'string'
        ? rawError
        : (rawError?.message || JSON.stringify(rawError || {}));

      if (errorMsg.includes('account entry is missing') || errorMsg.includes('Error(Contract, #6)')) {
        throw new Error('Unfunded Testnet Wallet: Your connected Freighter account has no XLM balance on Testnet. Please fund your address using Stellar Testnet Friendbot.');
      }
      if (errorMsg.includes('not enough allowance') || errorMsg.includes('underfunded') || errorMsg.includes('balance')) {
        throw new Error('Insufficient XLM Balance: Your wallet does not have enough XLM tokens to lock into this vesting plan.');
      }
      throw new Error(`Simulation failed: ${errorMsg}`);
    }

    let preparedTx;
    try {
      preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    } catch (assembleErr) {
      const errText = assembleErr?.message || String(assembleErr);
      if (errText.includes('switch is not a function') || errText.includes('assembleTransaction')) {
        throw new Error('Unfunded Testnet Wallet: Your connected Freighter wallet has no XLM balance on Testnet. Please fund your address using Stellar Testnet Friendbot.');
      }
      throw assembleErr;
    }
    const txXdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await rpc.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${sendResult.errorResult}`);
    }

    let getResult;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      getResult = await rpc.getTransaction(sendResult.hash);
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
};


function CreateVestingForm({ wallet }) {
  const [formData, setFormData] = useState({
    beneficiary: '',
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

  const handleDurationPreset = (days) => {
    setFormData(prev => ({ ...prev, durationDays: days.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!wallet) {
        throw new Error('Please connect your Freighter Wallet first to create a vesting plan.');
      }
      if (!formData.beneficiary) {
        throw new Error('Beneficiary address is required');
      }
      const cleanBeneficiary = formData.beneficiary.trim();
      try {
        StellarSdk.Address.fromString(cleanBeneficiary);
      } catch (err) {
        throw new Error(`Invalid Beneficiary Address: ${err.message || 'Must be a valid Stellar address starting with G or C'}`);
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (!formData.durationDays || parseInt(formData.durationDays) <= 0) {
        throw new Error('Duration must be at least 1 day');
      }

      const now = Math.floor(Date.now() / 1000);
      const durationSeconds = parseInt(formData.durationDays) * 86400;
      const cliffSeconds = parseInt(formData.cliffDays || '0') * 86400;

      if (cliffSeconds >= durationSeconds) {
        throw new Error('Cliff period must be shorter than total duration');
      }

      const result = await sorobanService.createVestingPlan(
        cleanBeneficiary,
        DEFAULT_TOKEN_ADDRESS,
        parseFloat(formData.amount),
        now,
        durationSeconds,
        cliffSeconds,
        wallet
      );

      setSuccess({ message: 'Vesting plan created successfully!', planId: result.planId, txHash: result.txHash });
      setFormData({
        beneficiary: '',
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
        {/* Header section with gradient typography */}
        <div className="form-header">
          <div className="header-badge">
            <span className="badge-sparkle">✨</span> Soroban Smart Contract
          </div>
          <h2>Create Vesting Plan</h2>
          <p className="form-subtitle">Lock and stream XLM tokens to any beneficiary address with custom schedules</p>
        </div>

        {/* Connected Wallet Status Banner */}
        {wallet ? (
          <div className="wallet-status-bar connected">
            <div className="status-indicator">
              <span className="pulse-dot"></span>
              <span className="status-text">Freighter Connected</span>
            </div>
            <code className="wallet-address-pill">
              {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 6)}
            </code>
          </div>
        ) : (
          <div className="wallet-status-bar disconnected">
            <span className="status-icon">⚠️</span>
            <span>Freighter Wallet Not Connected. Please connect wallet at top right.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="create-vesting-form">
          {/* Automatic Native XLM Token Card */}
          <div className="token-auto-card">
            <div className="token-card-left">
              <div className="token-icon-glow">🪙</div>
              <div className="token-details">
                <div className="token-name-row">
                  <span className="token-title">Testnet XLM</span>
                  <span className="token-type-tag">Native SAC</span>
                </div>
                <small className="token-subtitle">Default Token Contract (Auto Configured)</small>
              </div>
            </div>
            <div className="token-badge-active">
              <span className="check-icon">✓</span> Ready
            </div>
          </div>

          {/* Beneficiary Address Field */}
          <div className="form-group">
            <label htmlFor="beneficiary">
              <span className="label-icon icon-purple">👤</span>
              Beneficiary Address
            </label>

            <div className="input-wrapper">
              <input
                type="text"
                id="beneficiary"
                name="beneficiary"
                placeholder="G... (Stellar wallet address to receive tokens)"
                value={formData.beneficiary}
                onChange={handleChange}
                className="mono input-enhanced"
                required
              />
              {wallet && (
                <button
                  type="button"
                  className="quick-self-btn"
                  onClick={() => setFormData(prev => ({ ...prev, beneficiary: wallet }))}
                  title="Use connected Freighter wallet address"
                >
                  Use My Address
                </button>
              )}
            </div>
            <small className="field-hint">The Stellar public key (starting with G...) that will receive vested tokens</small>
          </div>

          {/* Total Amount Field */}
          <div className="form-group">
            <label htmlFor="amount">
              <span className="label-icon icon-emerald">💰</span>
              Total Amount (XLM)
            </label>
            <div className="input-wrapper">
              <input
                type="number"
                id="amount"
                name="amount"
                placeholder="e.g. 1000"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className="input-enhanced"
                required
              />
              <span className="currency-suffix">XLM</span>
            </div>
            <small className="field-hint">Total amount of XLM tokens to be locked into vesting</small>
          </div>

          {/* Duration & Cliff Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="durationDays">
                <span className="label-icon icon-cyan">📅</span>
                Vesting Duration (Days)
              </label>
              <input
                type="number"
                id="durationDays"
                name="durationDays"
                placeholder="365"
                min="1"
                value={formData.durationDays}
                onChange={handleChange}
                className="input-enhanced"
                required
              />
              {/* Quick Presets */}
              <div className="preset-buttons-row">
                <button type="button" className={`preset-chip ${formData.durationDays === '30' ? 'active' : ''}`} onClick={() => handleDurationPreset(30)}>30d</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '90' ? 'active' : ''}`} onClick={() => handleDurationPreset(90)}>90d</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '180' ? 'active' : ''}`} onClick={() => handleDurationPreset(180)}>180d</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '365' ? 'active' : ''}`} onClick={() => handleDurationPreset(365)}>1yr</button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cliffDays">
                <span className="label-icon icon-amber">🧊</span>
                Cliff Period (Days)
              </label>
              <input
                type="number"
                id="cliffDays"
                name="cliffDays"
                placeholder="0"
                min="0"
                value={formData.cliffDays}
                onChange={handleChange}
                className="input-enhanced"
              />
              <small className="field-hint">Days before token release begins (0 for immediate)</small>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error" id="form-error">
              <div className="alert-content">
                <span className="alert-icon">⚠️</span>
                <div>
                  <p style={{ margin: 0 }}>{error}</p>
                  {(error.includes('Unfunded') || error.includes('Friendbot') || error.includes('Balance')) && (
                    <a
                      href="https://laboratory.stellar.org/#account-creator?network=testnet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="friendbot-link-btn"
                      style={{
                        display: 'inline-block',
                        marginTop: '10px',
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      Fund Wallet on Testnet (Friendbot) ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success" id="form-success">
              <div className="alert-header-row">
                <span className="alert-icon">🎉</span>
                <strong>{success.message}</strong>
              </div>
              <div className="success-details">
                <p className="plan-id-display mono">Assigned Plan ID: <strong>#{success.planId}</strong></p>
                {success.txHash && (
                  <p className="tx-hash-display mono">
                    Transaction Explorer:{' '}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${success.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {success.txHash.substring(0, 10)}...{success.txHash.substring(success.txHash.length - 10)} ↗
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-btn-vibrant"
            disabled={loading || !wallet}
            id="submit-vesting-btn"
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Signing & Submitting to Soroban...
              </>
            ) : (
              <>
                <span className="btn-glow-layer"></span>
                <span className="btn-text">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Create Vesting Schedule
                </span>
              </>
            )}
          </button>
        </form>

        {/* How It Works Section */}
        <div className="how-it-works">
          <h3>
            <span className="h3-sparkle">💡</span> How Token Vesting Works
          </h3>
          <div className="steps-grid">
            <div className="step-card card-purple">
              <div className="step-number">01</div>
              <div className="step-body">
                <strong>Lock XLM Tokens</strong>
                <p>Tokens are transferred safely from your wallet to the Soroban contract.</p>
              </div>
            </div>
            <div className="step-card card-cyan">
              <div className="step-number">02</div>
              <div className="step-body">
                <strong>Cliff Protection</strong>
                <p>If set, tokens remain locked during the cliff period.</p>
              </div>
            </div>
            <div className="step-card card-emerald">
              <div className="step-number">03</div>
              <div className="step-body">
                <strong>Linear Release</strong>
                <p>Tokens unlock continuously second-by-second over duration.</p>
              </div>
            </div>
            <div className="step-card card-amber">
              <div className="step-number">04</div>
              <div className="step-body">
                <strong>Instant Claim</strong>
                <p>Beneficiary claims unlocked XLM anytime directly from DApp.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateVestingForm;
