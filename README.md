# Permissionless Token Vesting Contract

A fully **permissionless** token vesting smart contract built on Soroban (Stellar). This contract allows anyone to create token vesting schedules and beneficiaries to claim their vested tokens without any admin roles or permissions required.

## Core Philosophy: Permissionlessness

This contract is designed with **zero permission gates**:
- ✅ **Anyone** can create a vesting plan (no whitelist, no admin approval)
- ✅ **Any beneficiary** can claim their vested tokens (no permissions or roles)
- ✅ **Anyone** can view vesting plan details and vested amounts
- ✅ **No admin functions** that restrict participation
- ✅ No upgradeable logic (immutable once deployed)

Unlike traditional voting or governance systems that might have "add candidate" functions (which introduce permission requirements), this contract is purely permissionless by design.

---

## Key Features

### 1. Permissionless Vesting Plan Creation
```rust
pub fn create_vesting_plan(
    env: Env,
    beneficiary: Address,
    token: Address,
    total_amount: i128,
    start_time: u64,
    duration: u64,
    cliff_duration: u64,
) -> u64
```

**Anyone** can create a vesting plan for any token and beneficiary:
- `beneficiary`: The account that will receive vested tokens
- `token`: The token contract address
- `total_amount`: Total tokens to be vested
- `start_time`: Unix timestamp when vesting begins
- `duration`: Total vesting period in seconds
- `cliff_duration`: Cliff period before any vesting occurs (optional)

Returns a unique `plan_id` for the vesting plan.

### 2. Permissionless Token Claims
```rust
pub fn claim_vested(env: Env, plan_id: u64) -> i128
```

**Any beneficiary** can claim their vested tokens:
- Calculates releasable amount based on vesting schedule
- Transfers tokens from contract to beneficiary
- Updates the released amount tracking
- Returns the amount of tokens released

### 3. Query Functions (Read-Only)

#### Vested Amount
```rust
pub fn vested_amount(env: Env, plan_id: u64) -> i128
```
Returns total amount vested so far (including already claimed tokens).

#### Releasable Amount
```rust
pub fn releasable_amount(env: Env, plan_id: u64) -> i128
```
Returns amount available to claim now (vested - already released).

#### Get Plan Details
```rust
pub fn get_plan(env: Env, plan_id: u64) -> VestingPlan
```
Returns full vesting plan information.

#### Get Plan Count
```rust
pub fn get_plan_count(env: Env) -> u64
```
Returns total number of vesting plans created.

---

## Vesting Plan Structure

```rust
pub struct VestingPlan {
    pub beneficiary: Address,      // Who receives the tokens
    pub token: Address,            // Token contract address
    pub total_amount: i128,        // Total tokens to vest
    pub released_amount: i128,     // Tokens already claimed
    pub start_time: u64,           // Vesting start timestamp
    pub duration: u64,             // Total vesting duration (seconds)
    pub cliff_duration: u64,       // Period before any vesting (seconds)
    pub created_at: u64,           // Plan creation timestamp
}
```

---

## Vesting Mechanics

### Linear Vesting with Cliff

The contract implements linear vesting with an optional cliff period:

1. **Before Cliff**: No tokens are vested (vested_amount = 0)
2. **At and After Cliff**: Tokens vest linearly based on elapsed time
3. **After Duration**: All tokens are vested

**Formula**:
```
if current_time < start_time + cliff_duration:
    vested = 0
else if current_time >= start_time + duration:
    vested = total_amount
else:
    elapsed = current_time - start_time
    vested = total_amount * elapsed / duration
```

---

## Example Use Cases

### 1. Employee Stock Options
```
Creator creates vesting plan:
- Beneficiary: Employee address
- Token: Company stock token
- Amount: 1,000 tokens
- Start: Today
- Duration: 4 years (1,461 days)
- Cliff: 1 year

Employee can claim quarterly as tokens vest.
```

### 2. Community Token Distribution
```
Anyone can create plans for:
- Airdrop recipients
- Community members
- Token stakeholders

No whitelist needed - fully open participation.
```

### 3. Project Funding Releases
```
Creator locks tokens in vesting:
- Beneficiary: Project wallet
- Token: Stablecoin
- Amount: $1,000,000
- Duration: 3 months

Project claims as time milestones are reached.
```

---

## Storage Model

The contract uses **persistent storage** for high-performance access:
- `PCNT`: Counter for total vesting plans created
- `PLAN_{id}`: Individual vesting plan data keyed by plan ID

This allows efficient lookups and scales to thousands of vesting plans.

---

## Security Considerations

### Permissionless Security

Since this contract is permissionless, security focuses on:
1. **Correct math**: Vesting calculations are deterministic
2. **Token transfers**: Uses Soroban's token standard interface
3. **No flash loan attacks**: Vesting is time-based, not balance-based
4. **No reentrancy**: Single-threaded contract execution

### Token Integration

The contract requires:
- Beneficiary or token creator has approved the contract to transfer tokens
- Token contract follows Soroban token standard interface

---

## Building and Testing

```bash
# Navigate to contract directory
cd contracts/hello-world

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test --lib

# Build with optimizations for deployment
cargo build --target wasm32-unknown-unknown --release --profile release
```

---

## Deployment

The contract can be deployed to Soroban testnet or mainnet:

```bash
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

---

## Why Permissionless Architecture?

Traditional vesting contracts often include:
- ❌ Admin roles for plan creation
- ❌ Whitelists for beneficiaries
- ❌ Permission tiers for different actions
- ❌ Owner-controlled configuration

This contract **eliminates all permission gates** because:

1. **Direct Value**: Token vesting doesn't require gatekeeping
2. **Market Efficiency**: Anyone can create plans for any token/beneficiary pair
3. **Censorship Resistance**: No single point of control
4. **Composability**: Can be used as building block in other protocols
5. **Predictability**: Fixed logic, no admin discretion

---

## Design Choices

1. **Linear Vesting**: Supports linear vesting with optional cliff
2. **Immutable Plans**: Once created, vesting terms cannot be changed
3. **No Cancellation**: Plans run to completion
4. **No Partial Unlock**: Only claimable amount can be withdrawn per transaction
5. **Individual Custody**: Works with direct address ownership

---

## Tech Stack

- **Language**: Rust
- **Framework**: Soroban SDK v25
- **Blockchain**: Stellar (Soroban)
- **Target**: WASM (wasm32-unknown-unknown)

---

## Project Structure

```
TokenVestingContract/
├── Cargo.toml                  # Workspace configuration
├── README.md                   # This file
└── contracts/
    └── hello-world/            # Vesting contract
        ├── Cargo.toml
        ├── Makefile
        ├── src/
        │   ├── lib.rs         # Main contract implementation
        │   └── test.rs        # Contract tests
```

---

## License

MIT License - Open source and available for integration

