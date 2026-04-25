# 🚀 Token Vesting Contract

### Blockchain-Based Token Locking & Gradual Release on Stellar



Token Vesting Contract enables secure, time-based token distribution using smart contracts on the Stellar Soroban network.



**Live Contract • Architecture • Pipeline • Quick Start**




## 📖 What is this?

Token Vesting Contract is a decentralized financial infrastructure designed for managing token distribution in a transparent and trustless way. It allows organizations, startups, and DAOs to lock tokens and release them gradually over time without relying on intermediaries.

Instead of transferring tokens all at once, this smart contract enforces a predefined vesting schedule.

Provide vesting parameters like total amount, start time, and duration — and the contract automatically:

* Locks tokens securely inside the contract
* Tracks vesting progress over time
* Calculates the vested amount dynamically
* Allows beneficiaries to claim tokens gradually
* Ensures transparency via blockchain records
* Prevents early withdrawal before vesting conditions are met



## 🔑 Why Soroban?

### The Problem

Traditional vesting systems face several challenges:

* High transaction fees
* Slow execution speeds
* Manual or centralized tracking
* Risk of manipulation or human error




### Why We Chose Soroban

| Feature               | Traditional Chains | With Soroban                 |
| --------------------- | ------------------ | ---------------------------- |
| Transaction Fees      | High/Unpredictable | ✅ Near-Zero & Predictable    |
| Execution Speed       | Slow               | ✅ Fast & Efficient           |
| Smart Contract Safety | Varies             | ✅ Rust-based Type Safety     |
| Storage               | Expensive          | ✅ Optimized Instance Storage |
| Ecosystem             | Fragmented         | ✅ Unified Stellar Network    |




## ⚙️ Soroban Features Used

* **Instance Storage (`instance()`)** — Efficient storage of vesting data
* **Rust Type Safety** — Reduces contract vulnerabilities
* **Symbol Keys** — Lightweight storage identifiers
* **Env SDK** — Direct interaction with blockchain state




## 🏗️ Architecture

### High-Level Flow

* **Creator** initializes the contract with vesting parameters
* **Smart Contract** locks and manages tokens
* **Stellar Blockchain** stores immutable vesting data
* **Beneficiary** claims tokens over time
* **Release Function** calculates and distributes vested tokens




## 🛠️ Tech Stack & Tools

* **Rust** — Smart contract development
* **Soroban SDK** — Contract framework
* **Stellar CLI** — Build, deploy, and interact
* **Stellar Network** — Blockchain infrastructure





## 🔗 Deployed Smart Contract

WORKING APLICATION: https://token-vesting-contract-full-project.vercel.app/

DEMO VIDEO:- https://drive.google.com/file/d/1OQaCOkDINofGVfruAJ0r7yeNbWYJqswW/view?usp=drive_link


**Token Vesting Contract Address:**
https://lab.stellar.org/smart-contracts/contract-explorer?$=network$id=testnet&label=Testnet&horizonUrl=https:////horizon-testnet.stellar.org&rpcUrl=https:////soroban-testnet.stellar.org&passphrase=Test%20SDF%20Network%20/;%20September%202015;&smartContracts$explorer$contractId=CARYWO4GSPJJSC6DJQHR6JYHPTZSJTCOKV63ZDKHH4ENNS7GMWFNUJBE;;

Example:
https://stellar.expert/explorer/testnet/tx/f3721f1f0274210527166482d07d3c88eb944917a5f71b299760b8762299bcee


<img width="1892" height="936" alt="Screenshot 2026-03-19 144415" src="https://github.com/user-attachments/assets/5bbb4b8a-961c-4da4-86ed-fda7fb8e60a1" />


<img width="1759" height="831" alt="Screenshot 2026-03-20 215748" src="https://github.com/user-attachments/assets/ab0c692e-8011-4bc9-8897-3e4c7bd99bc9" />

<img width="1890" height="838" alt="Screenshot 2026-03-20 215810" src="https://github.com/user-attachments/assets/35089a26-edd5-4646-91ea-1336a7fde3b0" />




## 🎯 Vision & Use Cases

### Vision

To create a fair, automated, and transparent token distribution system that eliminates trust issues and ensures long-term sustainability.




### Key Use Cases

* **Startup Token Distribution** — Vesting for founders and teams
* **Investor Lockups** — Prevent early token dumping
* **DAO Treasury Management** — Controlled fund release
* **Employee Incentives** — Performance-based rewards




## 🏗️ Pipeline (Development Plan)

### 1. Smart Contract Functions

**init(...)**

* Initializes vesting parameters
* Stores beneficiary, total amount, start time, and duration

**vested_amount(...)**

* Calculates unlocked tokens
* Based on elapsed time

**release(...)**

* Allows claiming of vested tokens
* Updates released amount

**get_data(...)**

* Returns complete vesting details




### 2. Data Structure

```
VestingData {
    beneficiary: Address,
    total_amount: i128,
    released_amount: i128,
    start_time: u64,
    duration: u64
}
```




## 🔐 Access Control & Security

* **Time-Based Locking** — No early withdrawals
* **Immutable Ledger** — Data cannot be modified
* **Transparent Logic** — Fully verifiable on-chain

**Current Limitation:**

* Open access (demo version)

**Future Improvements:**

* Role-Based Access Control (RBAC)
* Multi-user support




## 🚧 Roadmap & Future Plans

* Add cliff-based vesting
* Support multiple beneficiaries
* Token contract integration
* Frontend dashboard (React + Soroban)
* Admin controls




## 📁 Project Structure

```
.
├── README.md
└── contract
    ├── Cargo.toml
    └── src
        └── lib.rs
```




## ⚙️ Environment Setup & Installation

### A) Prerequisites

Install Rust:

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Install Soroban CLI:

```
cargo install --locked soroban-cli
```

Add WASM target:

```
rustup target add wasm32-unknown-unknown
```




### B) Build Contract

```
soroban contract build
```

Optimize (optional but recommended):

```
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/contract.wasm
```

## 🧪 Testing

The contract comes with a suite of automated tests to ensure security and reliability. The tests cover creating vesting plans, checking vested amounts before start times, and verifying cliff behavior.

To run the smart contract tests locally:

1. Navigate to the contract directory:
   ```bash
   cd contracts/hello-world
   ```

2. Run the tests using cargo:
   ```bash
   cargo test
   ```

You should see output indicating that all tests have passed successfully:

  <img width="1103" height="226" alt="Screenshot 2026-04-25 230223" src="https://github.com/user-attachments/assets/d96210c8-7a3e-4636-a91b-3e53c669faf6" />



### C) Deployment & Invocation

Deploy contract:

```
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract.wasm \
  --source <YOUR_ACCOUNT> \
  --network testnet
```

Invoke contract:

```
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <SOURCE_ACCOUNT> \
  --network testnet \
  -- release --current_time <TIME>
```



## 👨‍💻 Author

**Ranit Sarkar**

Blockchain Enthusiast | Aspiring Developer

Profile link : https://github.com/ranitsarkar5


## 📄 License

MIT License
