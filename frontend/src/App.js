import './App.css';
import { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import CreateVestingForm from './components/CreateVestingForm';
import VestingDashboard from './components/VestingDashboard';

function App() {
  const [connected, setConnected] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleConnect = (address) => {
    setWallet(address);
    setConnected(true);
  };

  const handleDisconnect = () => {
    setWallet(null);
    setConnected(false);
  };

  return (
    <div className="App">
      {/* Ambient background glow */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Header */}
      <header className="app-header" id="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h1 className="brand-name">Token Vesting Hub</h1>
              <p className="brand-tag">Permissionless Vesting on Soroban</p>
            </div>
          </div>
          <WalletConnect
            connected={connected}
            wallet={wallet}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {/* Main Content */}
      {connected ? (
        <main className="main-content">
          <div className="container">
            {/* Tab Bar */}
            <nav className="tab-bar" id="tab-bar">
              <button
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
                id="tab-dashboard"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Dashboard
              </button>
              <button
                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
                id="tab-create"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Plan
              </button>
            </nav>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'dashboard' && <VestingDashboard wallet={wallet} />}
              {activeTab === 'create' && <CreateVestingForm wallet={wallet} />}
            </div>
          </div>
        </main>
      ) : (
        /* Welcome / Hero Section */
        <main className="hero-section">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot" /> Built on Stellar Soroban
              </div>
              <h2 className="hero-title">
                Permissionless
                <span className="gradient-text"> Token Vesting</span>
              </h2>
              <p className="hero-desc">
                Create and manage vesting schedules with zero admin permissions.
                Anyone can create plans, and any beneficiary can claim their tokens.
              </p>

              <div className="feature-cards">
                <div className="feature-card">
                  <div className="feature-icon">🔓</div>
                  <h3>Permissionless</h3>
                  <p>No admin roles, no whitelists — anyone can create vesting plans</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⏳</div>
                  <h3>Linear Vesting</h3>
                  <p>Tokens vest linearly over time with an optional cliff period</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">💎</div>
                  <h3>Multi-Token</h3>
                  <p>Works with any Soroban token — bring your own token contract</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔒</div>
                  <h3>Immutable</h3>
                  <p>Once created, plans cannot be modified or cancelled</p>
                </div>
              </div>

              <p className="cta-hint">Connect your Freighter wallet to get started →</p>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-inner">
          <p>© 2025 Token Vesting Hub</p>
          <p>Powered by Stellar Soroban</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
