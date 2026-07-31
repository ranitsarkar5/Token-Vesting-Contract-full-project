import './App.css';
import { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import CreateVestingForm from './components/CreateVestingForm';
import VestingDashboard from './components/VestingDashboard';

function App() {
  const [connected, setConnected] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');

  // Apply theme to document root so CSS vars react
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#brandGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h1 className="brand-name">Token Vesting Hub</h1>
              <p className="brand-tag">Stellar Soroban Smart Contracts</p>
            </div>
          </div>

          <div className="header-right">
            {/* Light / Dark Toggle */}
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              id="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle light/dark mode"
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <WalletConnect
              connected={connected}
              wallet={wallet}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                Create Schedule
              </button>
              <button
                className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveTab('docs')}
                id="tab-docs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Help &amp; Docs
              </button>
            </nav>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'dashboard' && (
                <VestingDashboard
                  wallet={wallet}
                  onNavigateCreate={() => setActiveTab('create')}
                />
              )}
              {activeTab === 'create' && (
                <CreateVestingForm
                  wallet={wallet}
                  onNavigateDashboard={() => setActiveTab('dashboard')}
                />
              )}
              {activeTab === 'docs' && <DocsPage onNavigateCreate={() => setActiveTab('create')} />}
            </div>
          </div>
        </main>
      ) : (
        /* Welcome / Hero Section */
        <main className="hero-section">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-dot" /> Permissionless Smart Contracts on Stellar
              </div>
              <h2 className="hero-title">
                Automated Token
                <span className="gradient-text"> Vesting &amp; Lockups</span>
              </h2>
              <p className="hero-desc">
                Stream XLM and custom Soroban tokens to team members, investors, and community beneficiaries with second-by-second linear release schedules.
              </p>

              <div className="feature-cards">
                <div className="feature-card">
                  <div className="feature-icon">🔓</div>
                  <h3>Permissionless</h3>
                  <p>No admin gates or approval queues — deploy schedules instantly on ledger</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⏳</div>
                  <h3>Linear Stream</h3>
                  <p>Continuous second-by-second unlock curve with optional cliff periods</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⚡</div>
                  <h3>1-Click Claims</h3>
                  <p>Beneficiaries claim unlocked tokens directly into Freighter wallet</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🛡️</div>
                  <h3>Audited Soroban</h3>
                  <p>Immutable logic guaranteed by Rust smart contract execution</p>
                </div>
              </div>

              <p className="cta-hint">Connect your Freighter wallet above to get started →</p>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-inner">
          <p>© 2026 Token Vesting Hub</p>
          <p>Powered by Stellar Soroban Testnet</p>
        </div>
      </footer>
    </div>
  );
}

/* ===== Help & Docs Page ===== */
function DocsPage({ onNavigateCreate }) {
  const steps = [
    {
      num: '01',
      icon: '🦊',
      title: 'Install Freighter Wallet',
      desc: 'Download the Freighter browser extension from freighter.app. Create a new wallet or import an existing one. Make sure to switch the network to Testnet inside the extension settings.',
    },
    {
      num: '02',
      icon: '💧',
      title: 'Fund Your Testnet Wallet',
      desc: 'Visit friendbot.stellar.org and paste your public key (starts with G) to receive free XLM on Testnet. You need at least 10 XLM to pay for transaction fees and contract storage.',
    },
    {
      num: '03',
      icon: '🔗',
      title: 'Connect Your Wallet',
      desc: 'Click "Connect Freighter" in the top-right corner. A confirmation modal will appear showing your wallet address and network. Click "Confirm & Connect" to proceed to the Dashboard.',
    },
    {
      num: '04',
      icon: '➕',
      title: 'Create a Vesting Schedule',
      desc: 'Go to the "Create Schedule" tab. Enter the beneficiary address, token amount, total duration, and an optional cliff period. Use the quick presets (30d, 90d, 1yr) for common configurations. The live preview shows your exact unlock dates and rate per day.',
    },
    {
      num: '05',
      icon: '📊',
      title: 'Monitor Your Plans',
      desc: 'The Dashboard shows all active plans in real-time. Use the filter chips to see only your wallet\'s plans, claimable tokens, or plans in cliff. Click "Inspect Details" on any plan card for a full timeline and the Future Date Unlock Predictor.',
    },
    {
      num: '06',
      icon: '💰',
      title: 'Claim Vested Tokens',
      desc: 'When tokens are unlocked (after the cliff ends), a green "Claim" button appears. Click it and approve the transaction in Freighter. For multiple plans, use the "⚡ Claim All" banner at the top of the Dashboard for 1-click batch claiming.',
    },
  ];

  const faqs = [
    { q: 'What is a cliff period?', a: 'A cliff is a waiting period at the start where 0 tokens vest. For example, with a 30-day cliff on a 1-year schedule, no tokens unlock for the first 30 days, then linear vesting begins from day 30 onwards.' },
    { q: 'What token does this support?', a: 'Currently the platform supports XLM (the native Stellar Lumens token) via the Soroban Asset Contract (SAC). Support for custom Soroban tokens is on the v2.0 roadmap.' },
    { q: 'Can I create a plan for someone else?', a: 'Yes! The beneficiary address in the Create Schedule form can be any valid Stellar address. The creator funds the plan, but only the beneficiary can claim the tokens.' },
    { q: 'How are time durations shown?', a: 'Remaining time is shown in the most human-readable unit — hours for short periods (under 48h) and days for longer ones, so you always have the most precise view.' },
    { q: 'Is this on mainnet?', a: 'No, this DApp currently runs exclusively on Stellar Testnet for safety. Testnet XLM has no real-world value. A mainnet deployment will follow after a full security audit.' },
    { q: 'What happens if I lose access to my wallet?', a: 'Since this is a permissionless blockchain application, there is no account recovery. Please back up your Freighter seed phrase in a secure location.' },
  ];

  return (
    <div className="docs-page" id="docs-page">
      <div className="docs-hero">
        <h2 className="docs-title">📖 Help Center &amp; Documentation</h2>
        <p className="docs-subtitle">Everything you need to get started with Token Vesting Hub on Stellar Soroban</p>
      </div>

      {/* Quick Start Tutorial */}
      <section className="docs-section">
        <h3 className="docs-section-title">🚀 Quick Start Tutorial</h3>
        <div className="steps-grid">
          {steps.map(s => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="docs-cta-row">
          <button className="btn-docs-cta" onClick={onNavigateCreate} id="docs-create-btn">
            ➕ Create Your First Vesting Schedule
          </button>
        </div>
      </section>

      {/* Key Concepts */}
      <section className="docs-section">
        <h3 className="docs-section-title">💡 Key Concepts</h3>
        <div className="concepts-grid">
          <div className="concept-card">
            <span className="concept-icon">📈</span>
            <h4>Linear Vesting</h4>
            <p>Tokens unlock gradually every second after the cliff. After the full duration passes, 100% is claimable.</p>
          </div>
          <div className="concept-card">
            <span className="concept-icon">🧊</span>
            <h4>Cliff Period</h4>
            <p>A mandatory lock before any tokens vest. Common for team allocations to ensure long-term commitment.</p>
          </div>
          <div className="concept-card">
            <span className="concept-icon">🔒</span>
            <h4>Immutable Plans</h4>
            <p>Once a vesting plan is created on-chain, its parameters cannot be changed. This guarantees fairness for beneficiaries.</p>
          </div>
          <div className="concept-card">
            <span className="concept-icon">⛓️</span>
            <h4>On-Chain Logic</h4>
            <p>All calculations (vested amount, cliff status) happen in the Soroban smart contract — not in the browser. Fully trustless.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="docs-section">
        <h3 className="docs-section-title">❓ Frequently Asked Questions</h3>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* Contract Info */}
      <section className="docs-section">
        <h3 className="docs-section-title">🔗 Contract &amp; Network Details</h3>
        <div className="contract-info-box">
          <div className="ci-row">
            <span className="ci-label">Network</span>
            <span className="ci-val">Stellar Testnet</span>
          </div>
          <div className="ci-row">
            <span className="ci-label">Contract ID</span>
            <code className="ci-code mono">CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI</code>
          </div>
          <div className="ci-row">
            <span className="ci-label">RPC Endpoint</span>
            <code className="ci-code mono">https://soroban-testnet.stellar.org</code>
          </div>
          <div className="ci-row">
            <span className="ci-label">Explorer</span>
            <a
              href="https://stellar.expert/explorer/testnet/contract/CCFGHYOOCC7GBODZCAAA6PU2A4BJ4DTBLS3FOZRXOET4XOO3EKEEQ7TI"
              target="_blank"
              rel="noopener noreferrer"
              className="ci-link"
            >
              View on Stellar Expert ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <span className="faq-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <p className="faq-a">{a}</p>}
    </div>
  );
}

export default App;
