import { useEffect, useState, useCallback } from 'react';
import {
  isConnected,
  requestAccess,
  getAddress,
} from '@stellar/freighter-api';
import './WalletConnect.css';

// Wrap any promise with a timeout so it never hangs forever
function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function WalletConnect({ connected, wallet, onConnect, onDisconnect }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [freighterAvailable, setFreighterAvailable] = useState(null);

  const checkFreighter = useCallback(async () => {
    try {
      // v6: isConnected() → { isConnected: boolean, error? }
      const result = await withTimeout(isConnected(), 3000, 'Freighter check');
      setFreighterAvailable(!!result.isConnected);
    } catch {
      setFreighterAvailable(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkFreighter, 600);
    return () => clearTimeout(timer);
  }, [checkFreighter]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Step 1: Request access — prompts user in Freighter popup
      // v6: requestAccess() → { address: string, error? }
      const accessResult = await withTimeout(
        requestAccess(),
        30000,  // 30s — user needs time to approve the popup
        'Freighter access request'
      );

      if (accessResult.error) {
        const errMsg = typeof accessResult.error === 'string'
          ? accessResult.error
          : accessResult.error.message || 'Freighter denied the request.';
        throw new Error(errMsg);
      }

      if (accessResult.address) {
        onConnect(accessResult.address);
        return;
      }

      // Fallback: try getAddress if requestAccess returned empty
      const addrResult = await withTimeout(
        getAddress(),
        10000,
        'Freighter get address'
      );

      if (addrResult.error) {
        const errMsg = typeof addrResult.error === 'string'
          ? addrResult.error
          : addrResult.error.message || 'Could not get address.';
        throw new Error(errMsg);
      }

      if (addrResult.address) {
        onConnect(addrResult.address);
        return;
      }

      throw new Error(
        'Could not get wallet address. Make sure Freighter is unlocked and try again.'
      );
    } catch (err) {
      console.error('Wallet connection error:', err);

      let message = typeof err === 'string' ? err : err.message || 'Failed to connect.';

      // Add helpful hints based on error type
      if (message.includes('timed out')) {
        message += ' Please make sure Freighter is unlocked and check for a popup that needs approval.';
      }

      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  // Demo mode: connect with a test address
  const handleDemoConnect = () => {
    onConnect('GDEMO7FAKE2ADDRESS3FOR4TESTING5PURPOSES6ONLY7XYZ');
    setError(null);
  };

  const handleDisconnect = () => {
    setError(null);
    onDisconnect();
  };

  return (
    <div className="wallet-connect" id="wallet-connect">
      {connected ? (
        <div className="connected-pill">
          <span className="status-dot" />
          <span className="wallet-addr mono">
            {wallet.substring(0, 4)}...{wallet.substring(wallet.length - 4)}
          </span>
          <button
            className="disconnect-btn"
            onClick={handleDisconnect}
            id="disconnect-wallet-btn"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="connect-area">
          <div className="connect-buttons">
            <button
              className="connect-btn"
              onClick={handleConnect}
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              Try Demo
            </button>
          </div>

          {freighterAvailable === false && (
            <div className="freighter-notice">
              <span>⚠️ Freighter not detected.</span>
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Install Freighter →
              </a>
              <span className="notice-divider">or</span>
              <button className="notice-demo-link" onClick={handleDemoConnect}>
                use Demo Mode
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
    </div>
  );
}

export default WalletConnect;
