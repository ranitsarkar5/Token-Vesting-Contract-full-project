/* global BigInt */
import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import './CreateVestingForm.css';

const CONTRACT_ID = 'CA5JV2CQWQJCLEC32LGOS4OSHM543DM4LPJHEI7NNG6HS3CSD7S2VJJB';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

const sorobanService = {
  createVestingPlan: async (beneficiary, token, amount, startTime, duration, cliffDuration, walletAddress) => {
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
            StellarSdk.nativeToScVal(beneficiary, { type: 'address' }),
            StellarSdk.nativeToScVal(token, { type: 'address' }),
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
      throw new Error(`Simulation failed: ${simResult.error}`);
    }
    const preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
    const txXdr = preparedTx.toXDR();

    const signedXdr = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await rpc.sendTransaction(signedTx);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${sendResult.errorResult}`);
    }

    // Poll for result
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
      if (!formData.beneficiary.startsWith('G') && !formData.beneficiary.startsWith('C')) {
        throw new Error('Beneficiary address must be a valid Stellar address (starts with G or C)');
      }
      if (!formData.tokenAddress) throw new Error('Token address is required');
      if (formData.tokenAddress.trim().startsWith('G')) {
        throw new Error('Token Address must be a Soroban Contract ID starting with "C". Account addresses starting with "G" are not smart contracts.');
      }
      if (!formData.tokenAddress.trim().startsWith('C')) {
        throw new Error('Token Address must be a valid Soroban Contract ID starting with "C" (e.g. CDLZFC3SYJYDZT7K67VZ75HXZS65IROR64T6QYFJDZAAOKX6PVIYOZDL)');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error('Amount must be greater than 0');
      if (!formData.durationDays || parseInt(formData.durationDays) <= 0) throw new Error('Duration must be at least 1 day');

      const now = Math.floor(Date.now() / 1000);
      const durationSeconds = parseInt(formData.durationDays) * 86400;
      const cliffSeconds = parseInt(formData.cliffDays || '0') * 86400;

      if (cliffSeconds >= durationSeconds) {
        throw new Error('Cliff period must be shorter than total duration');
      }

      const result = await sorobanService.createVestingPlan(
        formData.beneficiary.trim(),
        formData.tokenAddress.trim(),
        parseFloat(formData.amount),
        now,
        durationSeconds,
        cliffSeconds,
        wallet
      );

      setSuccess({ message: 'Vesting plan created successfully!', planId: result.planId, txHash: result.txHash });
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
              placeholder="C... (Soroban contract address starting with C)"
              value={formData.tokenAddress}
              onChange={handleChange}
              className="mono"
              required
            />
            <small className="field-hint">
              Soroban token contract ID (starts with <strong>C...</strong>)
              <button 
                type="button" 
                className="fill-token-btn"
                style={{ marginLeft: '8px', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #6366f1', color: '#6366f1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}
                onClick={() => setFormData(prev => ({ ...prev, tokenAddress: 'CDLZFC3SYJYDZT7K67VZ75HXZS65IROR64T6QYFJDZAAOKX6PVIYOZDL' }))}
              >
                Use Testnet XLM Token
              </button>
            </small>
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
              {success.txHash && (
                <p className="tx-hash-display mono" style={{ marginTop: '8px', fontSize: '0.85em', opacity: 0.9 }}>
                  Transaction Hash:{' '}
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${success.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'underline', wordBreak: 'break-all' }}
                  >
                    {success.txHash.substring(0, 10)}...{success.txHash.substring(success.txHash.length - 10)}
                  </a>
                </p>
              )}
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
