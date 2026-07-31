import { useEffect, useState, useCallback } from 'react';
import {
  isConnected,
  requestAccess,
  getAddress,
} from '@stellar/freighter-api';
import './WalletConnect.css';

// Promise wrapper with customizable timeout
function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function WalletConnect({ connected, wallet, onConnect, onDisconnect, onConfirmRequired }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [freighterAvailable, setFreighterAvailable] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [copied, setCopied] = useState(false);

  const checkFreighter = useCallback(async () => {
    try {
      const result = await withTimeout(isConnected(), 3000, 'Freighter check');
      setFreighterAvailable(!!result.isConnected);
    } catch {
      setFreighterAvailable(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkFreighter, 500);
    return () => clearTimeout(timer);
  }, [checkFreighter]);

  // On page load / component mount: check if wallet address exists in browser session,
  // and ALWAYS prompt confirmation on site entry as requested by user.
  useEffect(() => {
    const checkOnSiteEntry = async () => {
      const savedWallet = sessionStorage.getItem('vesting_connected_wallet');
      if (savedWallet && !connected) {
        // Prompt confirmation modal on site entry
        setPendingAddress(savedWallet);
        setShowConfirmModal(true);
      }
    };
    checkOnSiteEntry();
  }, [connected]);

  const handleInitiateConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Step 1: Request access from Freighter popup
      const accessResult = await withTimeout(
        requestAccess(),
        30000,
        'Freighter access request'
      );

      if (accessResult.error) {
        const errMsg = typeof accessResult.error === 'string'
          ? accessResult.error
          : accessResult.error.message || 'Freighter denied the request.';
        throw new Error(errMsg);
      }

      let detectedAddress = accessResult.address;

      if (!detectedAddress) {
        // Fallback: try getAddress
        const addrResult = await withTimeout(
          getAddress(),
          10000,
          'Freighter get address'
        );
        if (addrResult.address) {
          detectedAddress = addrResult.address;
        }
      }

      if (!detectedAddress) {
        throw new Error('Could not get wallet address. Please unlock Freighter and try again.');
      }

      // Instead of immediate direct connect, present the explicit confirmation modal
      setPendingAddress(detectedAddress);
      setShowConfirmModal(true);
    } catch (err) {
      console.error('Wallet connection error:', err);
      let message = typeof err === 'string' ? err : err.message || 'Failed to connect.';
      if (message.includes('timed out')) {
        message += ' Please check Freighter extension popup.';
      }
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmConnection = () => {
    if (pendingAddress) {
      sessionStorage.setItem('vesting_connected_wallet', pendingAddress);
      onConnect(pendingAddress);
      setShowConfirmModal(false);
      setPendingAddress(null);
      setError(null);
    }
  };

  const handleRejectConnection = () => {
    setShowConfirmModal(false);
    setPendingAddress(null);
    sessionStorage.removeItem('vesting_connected_wallet');
    if (connected) {
      onDisconnect();
    }
  };

  const handleDemoConnect = () => {
    const demoAddr = 'GDEMO7FAKE2ADDRESS3FOR4TESTING5PURPOSES6ONLY7XYZ';
    setPendingAddress(demoAddr);
    setShowConfirmModal(true);
    setError(null);
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('vesting_connected_wallet');
    setError(null);
    onDisconnect();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wallet-connect" id="wallet-connect">
      {connected ? (
        <div className="connected-pill-wrap">
          <div className="connected-pill">
            <span className="status-dot-pulse" title="Network Connected" />
            <button
              className="wallet-addr-btn mono"
              onClick={() => copyToClipboard(wallet)}
              title="Click to copy address"
            >
              {wallet.substring(0, 4)}...{wallet.substring(wallet.length - 4)}
              {copied ? <span className="copy-badge">Copied!</span> : <span className="copy-icon">📋</span>}
            </button>
            <button
              className="reconfirm-btn"
              onClick={() => {
                setPendingAddress(wallet);
                setShowConfirmModal(true);
              }}
              title="Re-confirm active session"
            >
              Verify
            </button>
            <button
              className="disconnect-btn"
              onClick={handleDisconnect}
              id="disconnect-wallet-btn"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="connect-area">
          <div className="connect-buttons">
            <button
              className="connect-btn"
              onClick={handleInitiateConnect}
              disabled={connecting}
              id="connect-wallet-btn"
            >
              {connecting ? (
                <>
                  <span className="btn-spinner" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M22 10h-4a2 2 0 0 0 0 4h4" />
                  </svg>
                  Connect Freighter
                </>
              )}
            </button>
            <button
              className="demo-btn"
              onClick={handleDemoConnect}
              id="demo-wallet-btn"
            >
              Try Demo Mode
            </button>
          </div>

          {freighterAvailable === false && (
            <div className="freighter-notice">
              <span>⚠️ Freighter extension not detected.</span>
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Freighter →
              </a>
              <span className="notice-divider">or</span>
              <button className="notice-demo-link" onClick={handleDemoConnect}>
                Use Demo Mode
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="wallet-error">
          <p>{error}</p>
          <button className="error-demo-btn" onClick={handleDemoConnect}>
            Use Demo Mode Instead
          </button>
        </div>
      )}

      {/* Mandatory Site Entry Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-card wallet-confirm-modal animate-scale-in">
            <div className="modal-header">
              <div className="modal-icon-badge">🔐</div>
              <h3>Confirm Wallet Connection</h3>
              <p className="modal-subtitle">
                Please confirm to authorize Token Vesting Hub with your active Stellar wallet address.
              </p>
            </div>

            <div className="wallet-confirm-body">
              <div className="confirm-field-box">
                <span className="box-label">Wallet Address</span>
                <div className="address-display-row">
                  <code className="address-mono">{pendingAddress}</code>
                  <button
                    className="icon-copy-btn"
                    onClick={() => copyToClipboard(pendingAddress)}
                    title="Copy full address"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div className="confirm-meta-grid">
                <div className="meta-chip">
                  <span className="meta-title">Network</span>
                  <span className="meta-val text-emerald">Stellar Testnet</span>
                </div>
                <div className="meta-chip">
                  <span className="meta-title">Contract Engine</span>
                  <span className="meta-val text-cyan">Soroban SAC</span>
                </div>
              </div>

              <div className="security-notice-box">
                <span className="notice-icon">🛡️</span>
                <p>
                  This connection is permissionless. Token Vesting Hub will never ask for your private key or seed phrase.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleRejectConnection}>
                Cancel / Reject
              </button>
              <button className="btn-confirm-vibrant" onClick={handleConfirmConnection}>
                Confirm & Connect Address →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletConnect;
