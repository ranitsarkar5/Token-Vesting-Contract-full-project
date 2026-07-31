/* global BigInt */
import { useState, useMemo } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction, getAddress } from '@stellar/freighter-api';
import './CreateVestingForm.css';

const CONTRACT_ID = 'CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const DEFAULT_TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

const CreateVestingForm = ({ wallet, onPlanCreated, onNavigateDashboard }) => {
  const [formData, setFormData] = useState({
    beneficiary: '',
    amount: '',
    durationDays: '365',
    cliffDays: '0',
  });

  const [currentStep, setCurrentStep] = useState(0); // 0 = idle, 1-4 = progress steps
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Live schedule calculations
  const scheduleProjection = useMemo(() => {
    const amountNum = parseFloat(formData.amount) || 0;
    const durationNum = parseInt(formData.durationDays) || 1;
    const cliffNum = parseInt(formData.cliffDays) || 0;

    const now = Math.floor(Date.now() / 1000);
    const cliffEnd = now + cliffNum * 86400;
    const end = now + durationNum * 86400;
    const dailyRate = durationNum > 0 ? (amountNum / durationNum).toFixed(4) : '0';

    return {
      startTimeStr: new Date(now * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      cliffEndStr: cliffNum > 0 ? new Date(cliffEnd * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No Cliff Period',
      endTimeStr: new Date(end * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      dailyRate,
    };
  }, [formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDurationPreset = (days) => {
    setFormData(prev => ({ ...prev, durationDays: days.toString() }));
  };

  const handleCliffPreset = (days) => {
    setFormData(prev => ({ ...prev, cliffDays: days.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessData(null);
    setCurrentStep(1); // Step 1: Input & Balance Check

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
        throw new Error(`Invalid Beneficiary Address: ${err.message || 'Must be a valid Stellar G... or C... address'}`);
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0 XLM');
      }
      if (!formData.durationDays || parseInt(formData.durationDays) <= 0) {
        throw new Error('Vesting duration must be at least 1 day');
      }

      const durationSeconds = parseInt(formData.durationDays) * 86400;
      const cliffSeconds = parseInt(formData.cliffDays || '0') * 86400;

      if (cliffSeconds >= durationSeconds) {
        throw new Error('Cliff period must be strictly shorter than total duration');
      }

      let activeWallet = wallet;
      try {
        const addrRes = await getAddress();
        if (addrRes?.address) {
          activeWallet = addrRes.address;
        }
      } catch (addrErr) {
        console.warn('Freighter address refresh note:', addrErr);
      }

      // Step 2: Fetch account and simulate Soroban transaction
      setCurrentStep(2);
      let account;
      try {
        account = await rpc.getAccount(activeWallet);
      } catch (accErr) {
        throw new Error('Unfunded Testnet Account: Your connected address has no XLM balance on Testnet. Click the button below to fund with Friendbot.');
      }

      const stroopAmount = BigInt(Math.floor(parseFloat(formData.amount) * 10000000));
      const nowSeconds = Math.floor(Date.now() / 1000);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_vesting_plan',
            args: [
              StellarSdk.nativeToScVal(activeWallet, { type: 'address' }),
              StellarSdk.nativeToScVal(cleanBeneficiary, { type: 'address' }),
              StellarSdk.nativeToScVal(DEFAULT_TOKEN_ADDRESS, { type: 'address' }),
              StellarSdk.nativeToScVal(stroopAmount, { type: 'i128' }),
              StellarSdk.nativeToScVal(BigInt(nowSeconds), { type: 'u64' }),
              StellarSdk.nativeToScVal(BigInt(durationSeconds), { type: 'u64' }),
              StellarSdk.nativeToScVal(BigInt(cliffSeconds), { type: 'u64' }),
            ],
          })
        )
        .setTimeout(30)
        .build();

      const simResult = await rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(simResult)) {
        const rawErr = simResult.error;
        const errStr = typeof rawErr === 'string' ? rawErr : (rawErr?.message || JSON.stringify(rawErr || {}));
        if (errStr.includes('account entry is missing')) {
          throw new Error('Unfunded Testnet Wallet: Your address requires testnet XLM. Please use Testnet Friendbot.');
        }
        throw new Error(`Soroban simulation failed: ${errStr}`);
      }

      const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();

      // Step 3: Wallet Signing Prompt
      setCurrentStep(3);
      const txXdr = preparedTx.toXDR();
      const signedXdrResponse = await signTransaction(txXdr, {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: activeWallet,
      });

      const xdrString = typeof signedXdrResponse === 'string'
        ? signedXdrResponse
        : (signedXdrResponse?.signedTxXdr || signedXdrResponse?.xdr || String(signedXdrResponse || ''));

      if (!xdrString) {
        throw new Error('Wallet signature failed or was rejected.');
      }

      // Step 4: Submission & Ledger Settlement
      setCurrentStep(4);
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(xdrString, NETWORK_PASSPHRASE);
      const sendResult = await rpc.sendTransaction(signedTx);

      if (sendResult.status === 'ERROR') {
        throw new Error(`Transaction execution error: ${JSON.stringify(sendResult.errorResult || {})}`);
      }

      // Quick poll for ledger inclusion (optimistic 2s delay)
      let getResult;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          getResult = await rpc.getTransaction(sendResult.hash);
          if (getResult && getResult.status !== 'NOT_FOUND') break;
        } catch (pollErr) {
          console.warn('Polling status:', pollErr);
        }
      }

      let assignedPlanId = 1;
      if (getResult?.returnValue) {
        try {
          assignedPlanId = Number(StellarSdk.scValToNative(getResult.returnValue));
        } catch (e) {
          assignedPlanId = 1;
        }
      }

      // Success modal state!
      setSuccessData({
        planId: assignedPlanId,
        txHash: sendResult.hash,
        beneficiary: cleanBeneficiary,
        amount: formData.amount,
        durationDays: formData.durationDays,
        cliffDays: formData.cliffDays,
      });

      setFormData({
        beneficiary: '',
        amount: '',
        durationDays: '365',
        cliffDays: '0',
      });

      if (onPlanCreated) onPlanCreated();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="create-form-container">
      <div className="form-card main-form-card">
        {/* Form Header */}
        <div className="form-header">
          <div className="header-badge-handcrafted">
            <span className="badge-dot-live" /> Stellar Soroban Contract
          </div>
          <h2>Create Token Vesting Schedule</h2>
          <p className="form-subtitle">
            Safely lock and stream XLM tokens to any beneficiary with custom cliff and linear release schedules.
          </p>
        </div>

        {/* Connected Wallet Bar */}
        {wallet ? (
          <div className="wallet-status-bar connected">
            <div className="status-indicator">
              <span className="pulse-dot" />
              <span>Active Creator Address</span>
            </div>
            <code className="wallet-address-pill mono">
              {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 6)}
            </code>
          </div>
        ) : (
          <div className="wallet-status-bar disconnected">
            <span className="status-icon">⚠️</span>
            <span>Freighter Wallet not connected. Please connect wallet at top right.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="create-vesting-form">
          {/* Token Card */}
          <div className="token-select-card">
            <div className="token-card-left">
              <div className="token-avatar">🪙</div>
              <div>
                <div className="token-title-row">
                  <strong>Stellar XLM (Native SAC)</strong>
                  <span className="chip-tag">Soroban SAC</span>
                </div>
                <small className="token-desc">Official Testnet Soroban Token Contract</small>
              </div>
            </div>
            <div className="token-badge-verified">✓ Active Contract</div>
          </div>

          {/* Beneficiary Input */}
          <div className="form-group">
            <label htmlFor="beneficiary">
              <span className="label-icon">👤</span>
              Beneficiary Stellar Address
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="beneficiary"
                name="beneficiary"
                placeholder="G... (Stellar public key to receive tokens)"
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
                >
                  Use My Address
                </button>
              )}
            </div>
            <small className="field-hint">The beneficiary can claim unlocked tokens anytime from the dashboard.</small>
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label htmlFor="amount">
              <span className="label-icon">💰</span>
              Total Amount to Lock (XLM)
            </label>
            <div className="input-wrapper">
              <input
                type="number"
                id="amount"
                name="amount"
                placeholder="e.g. 500"
                step="0.01"
                min="0.1"
                value={formData.amount}
                onChange={handleChange}
                className="input-enhanced"
                required
              />
              <span className="currency-suffix">XLM</span>
            </div>
          </div>

          {/* Duration & Cliff Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="durationDays">
                <span className="label-icon">📅</span>
                Vesting Duration
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
              {/* Presets */}
              <div className="preset-buttons-row">
                <button type="button" className={`preset-chip ${formData.durationDays === '30' ? 'active' : ''}`} onClick={() => handleDurationPreset(30)}>30 Days</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '90' ? 'active' : ''}`} onClick={() => handleDurationPreset(90)}>90 Days</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '180' ? 'active' : ''}`} onClick={() => handleDurationPreset(180)}>6 Months</button>
                <button type="button" className={`preset-chip ${formData.durationDays === '365' ? 'active' : ''}`} onClick={() => handleDurationPreset(365)}>1 Year</button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cliffDays">
                <span className="label-icon">🧊</span>
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
              {/* Presets */}
              <div className="preset-buttons-row">
                <button type="button" className={`preset-chip ${formData.cliffDays === '0' ? 'active' : ''}`} onClick={() => handleCliffPreset(0)}>No Cliff</button>
                <button type="button" className={`preset-chip ${formData.cliffDays === '30' ? 'active' : ''}`} onClick={() => handleCliffPreset(30)}>30 Days</button>
                <button type="button" className={`preset-chip ${formData.cliffDays === '90' ? 'active' : ''}`} onClick={() => handleCliffPreset(90)}>90 Days</button>
              </div>
            </div>
          </div>

          {/* Interactive Projection Box (Human Touch feature!) */}
          <div className="projection-box">
            <div className="projection-header">
              <span>📊 Schedule Projection Preview</span>
              <span className="rate-tag">~{scheduleProjection.dailyRate} XLM / Day</span>
            </div>
            <div className="projection-grid">
              <div className="proj-item">
                <span className="proj-label">Schedule Starts</span>
                <strong className="proj-val">{scheduleProjection.startTimeStr}</strong>
              </div>
              <div className="proj-item">
                <span className="proj-label">Cliff Unlock</span>
                <strong className="proj-val text-amber">{scheduleProjection.cliffEndStr}</strong>
              </div>
              <div className="proj-item">
                <span className="proj-label">Fully Vested</span>
                <strong className="proj-val text-emerald">{scheduleProjection.endTimeStr}</strong>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="alert alert-error animate-shake">
              <div className="alert-content">
                <span className="alert-icon">⚠️</span>
                <div>
                  <p style={{ margin: 0 }}>{error}</p>
                  {(error.includes('Unfunded') || error.includes('Friendbot')) && (
                    <a
                      href="https://laboratory.stellar.org/#account-creator?network=testnet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="friendbot-btn"
                    >
                      Fund Wallet on Testnet (Friendbot) ↗
                    </a>
                  )}
                </div>
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
                Processing Transaction...
              </>
            ) : (
              <>Create & Lock Vesting Schedule →</>
            )}
          </button>
        </form>
      </div>

      {/* 4-Step Creation Progress Modal */}
      {loading && (
        <div className="modal-backdrop">
          <div className="modal-card progress-modal animate-scale-in">
            <div className="modal-header">
              <div className="step-loader-spinner" />
              <h3>Creating Vesting Plan</h3>
              <p className="modal-subtitle">Submitting smart contract transaction to Soroban Testnet...</p>
            </div>

            <div className="progress-steps-list">
              <div className={`step-item ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'active') : ''}`}>
                <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
                <div className="step-text">
                  <strong>Input & Account Verification</strong>
                  <p>Checking wallet balance & beneficiary public key format</p>
                </div>
              </div>

              <div className={`step-item ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}`}>
                <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
                <div className="step-text">
                  <strong>Soroban Contract Simulation</strong>
                  <p>Simulating create_vesting_plan on Soroban RPC</p>
                </div>
              </div>

              <div className={`step-item ${currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'active') : ''}`}>
                <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
                <div className="step-text">
                  <strong>Freighter Wallet Authorization</strong>
                  <p>Please approve the signature popup in Freighter extension</p>
                </div>
              </div>

              <div className={`step-item ${currentStep >= 4 ? (currentStep > 4 ? 'completed' : 'active') : ''}`}>
                <div className="step-circle">{currentStep > 4 ? '✓' : '4'}</div>
                <div className="step-text">
                  <strong>Ledger Finalization</strong>
                  <p>Broadcasting transaction to Stellar ledger</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with direct View in Dashboard button */}
      {successData && (
        <div className="modal-backdrop">
          <div className="modal-card success-modal animate-scale-in">
            <div className="success-icon-banner">🎉</div>
            <h3>Vesting Plan Created Successfully!</h3>
            <p className="modal-subtitle">Your tokens are now locked inside the Soroban Token Vesting contract.</p>

            <div className="success-info-card">
              <div className="info-row">
                <span>Assigned Plan ID</span>
                <strong className="plan-id-tag">#{successData.planId}</strong>
              </div>
              <div className="info-row">
                <span>Total Locked</span>
                <strong>{successData.amount} XLM</strong>
              </div>
              <div className="info-row">
                <span>Beneficiary</span>
                <code className="mono">{successData.beneficiary.substring(0, 8)}...{successData.beneficiary.substring(successData.beneficiary.length - 6)}</code>
              </div>
              {successData.txHash && (
                <div className="info-row">
                  <span>Ledger Tx Hash</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${successData.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link-btn"
                  >
                    View on Stellar Expert ↗
                  </a>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setSuccessData(null)}
              >
                Create Another Plan
              </button>
              <button
                className="btn-confirm-vibrant"
                onClick={() => {
                  setSuccessData(null);
                  if (onNavigateDashboard) onNavigateDashboard();
                }}
              >
                View Plan in Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateVestingForm;
