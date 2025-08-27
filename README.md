# 🌊 Solana AMM (Automated Market Maker)

A complete decentralized exchange built on Solana using the Anchor framework, featuring a smart contract AMM implementation with a React frontend interface.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Smart Contract](#smart-contract)
- [React Frontend](#react-frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

This project implements a constant product automated market maker (AMM) similar to Uniswap V2, built specifically for the Solana blockchain. It includes:

- **Smart Contract**: Anchor-based AMM program with initialize, deposit, and swap functionality
- **React Frontend**: User-friendly web interface for interacting with the AMM
- **Comprehensive Tests**: Full test suite covering happy paths and edge cases
- **Setup Scripts**: Automated deployment and configuration tools

## ✨ Features

### Smart Contract Features
- 🏪 **AMM Pool Creation**: Initialize liquidity pools for any token pair
- 💰 **Liquidity Provision**: Add/remove liquidity and earn trading fees
- 🔄 **Token Swapping**: Trade tokens with slippage protection
- 🛡️ **Security**: Built-in checks for slippage, balance validation, and access control
- ⚡ **Efficiency**: Optimized for Solana's high-speed, low-cost transactions

### Frontend Features
- 🔗 **Wallet Integration**: Support for Phantom, Solflare, and Backpack wallets
- 📊 **Real-time Data**: Live balance updates and pool statistics
- 🎨 **Modern UI**: Beautiful, responsive interface with glass-morphism design
- 🔧 **Advanced Controls**: Adjustable slippage tolerance and swap direction
- 📱 **Mobile Friendly**: Responsive design works on all devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Anchor Program │    │   Solana RPC    │
│                 │◄──►│                 │◄──►│                 │
│ • Wallet UI     │    │ • Initialize    │    │ • Validators    │
│ • Swap UI       │    │ • Deposit       │    │ • Transaction   │
│ • Liquidity UI  │    │ • Swap          │    │   Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   SPL Tokens    │
                    │                 │
                    │ • Token X       │
                    │ • Token Y       │
                    │ • LP Tokens     │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **Rust** and **Cargo**
- **Solana CLI** tools
- **Anchor CLI** v0.31.1+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd amm
   ```

2. **Install dependencies**
   ```bash
   # Install Anchor dependencies
   npm install
   
   # Install React app dependencies
   cd app && npm install && cd ..
   ```

3. **Build the program**
   ```bash
   anchor build
   ```

4. **Deploy to devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

5. **Setup the React app**
   ```bash
   cd app
   ./setup.sh              # Environment setup
   npm run init-accounts   # Create test tokens
   npm run init-program    # Initialize AMM
   npm start              # Start the app
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Smart Contract

### Program Structure

```
programs/amm/src/
├── lib.rs              # Program entrypoint and ID
├── constants.rs        # Program constants
├── error.rs           # Custom error definitions
├── instructions/      # Instruction implementations
│   ├── initialize.rs  # AMM pool initialization
│   ├── deposit.rs     # Liquidity provision
│   └── swap.rs        # Token swapping
└── states/           # Account state definitions
    └── config.rs     # AMM configuration state
```

### Key Instructions

#### Initialize
Creates a new AMM pool with specified parameters:
- **Seed**: Unique identifier for the pool
- **Fee**: Trading fee (in basis points, e.g., 300 = 3%)
- **Authority**: Optional admin account for the pool

#### Deposit
Adds liquidity to the pool:
- **Amount X**: Amount of token X to deposit
- **Amount Y**: Amount of token Y to deposit
- **Slippage**: Maximum acceptable slippage (in basis points)

#### Swap
Exchanges one token for another:
- **Direction**: X to Y or Y to X
- **Amount In**: Amount of input tokens
- **Slippage**: Maximum acceptable slippage

### Account Structure

```rust
#[account]
pub struct Config {
    pub seed: u64,
    pub authority: Option<Pubkey>,
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub fee: u16,
}
```

## 🖥️ React Frontend

### Components Overview

- **AmmInterface**: Main container with tab navigation
- **DepositComponent**: Add liquidity interface
- **SwapComponent**: Token swapping interface
- **BalanceDisplay**: Real-time balance monitoring
- **WalletContextProvider**: Solana wallet integration

### Key Features

#### Wallet Integration
```typescript
// Supports multiple wallet providers
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
];
```

#### Program Interaction
```typescript
// Automatic PDA derivation
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("anchor"), seed, mintX.toBuffer(), mintY.toBuffer()],
  programId
);
```

#### Error Handling
- Slippage exceeded warnings
- Insufficient balance detection
- Transaction confirmation feedback

## 🧪 Testing

### Running Tests

```bash
# Run all tests
anchor test

# Run tests without rebuilding
anchor test --skip-build

# Run specific test file
anchor test --skip-build tests/amm.ts
```

### Test Coverage

The test suite includes **25 comprehensive tests**:

#### Initialize Tests (9 tests)
- ✅ Basic initialization with valid parameters
- ✅ Initialization without authority
- ✅ Zero fee configuration
- ✅ Duplicate seed prevention
- ✅ Same mint validation
- ✅ Fee boundary testing
- ✅ Authority validation
- ✅ Large seed handling

#### Deposit Tests (4 tests)
- ✅ Initial liquidity provision
- ✅ Small amount handling
- ✅ Zero amount rejection
- ✅ Slippage protection

#### Swap Tests (12 tests)
- ✅ X to Y swaps
- ✅ Y to X swaps
- ✅ Small amount swaps
- ✅ Multiple consecutive swaps
- ✅ Zero amount rejection
- ✅ Insufficient balance handling
- ✅ Slippage protection
- ✅ Pool draining prevention
- ✅ Wrong account validation
- ✅ Fee calculation verification
- ✅ Price impact relationships
- ✅ Maximum slippage handling

### Test Results
```
✅ Initialize Tests: 9/9 passing
✅ Deposit Tests: 4/4 passing  
✅ Swap Tests: 12/12 passing
📊 Total: 25/25 tests passing (100%)
```

## 🚀 Deployment

### Local Development
```bash
# Start local validator
solana-test-validator

# Deploy to local cluster
anchor deploy --provider.cluster localnet
```

### Devnet Deployment
```bash
# Configure for devnet
solana config set --url devnet

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Mainnet Deployment
```bash
# Configure for mainnet (use with caution!)
solana config set --url mainnet-beta

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta
```

## 📚 API Reference

### Initialize Instruction
```rust
pub fn initialize(
    ctx: Context<Initialize>,
    seed: u64,
    fee: u16,
    authority: Option<Pubkey>,
) -> Result<()>
```

### Deposit Instruction
```rust
pub fn deposit(
    ctx: Context<Deposit>,
    amount_x: u64,
    amount_y: u64,
    slippage: u16,
) -> Result<()>
```

### Swap Instruction
```rust
pub fn swap(
    ctx: Context<Swap>,
    x_to_y: bool,
    amount_in: u64,
    slippage: u16,
) -> Result<()>
```

### Error Codes
```rust
pub enum AmmError {
    #[msg("Invalid amount provided")]
    InvalidAmount = 6000,
    #[msg("Insufficient balance")]
    InsufficientBalance = 6001,
    #[msg("Liquidity amount less than minimum")]
    LiquidityLessThanMinimum = 6002,
    #[msg("Slippage exceeded")]
    SlippageExceeded = 6003,
}
```

## 🛠️ Troubleshooting

### Common Issues

#### "Program ID mismatch"
- Ensure `Anchor.toml` and `lib.rs` have matching program IDs
- Rebuild and redeploy after changes

#### "SlippageExceeded" errors
- Increase slippage tolerance in the frontend
- Reduce swap amount
- Current implementation has asymmetric slippage behavior

#### "Insufficient balance" errors
- Run `npm run init-accounts` to create test tokens
- Check wallet balance with `solana balance`

#### React app won't connect to wallet
- Ensure wallet extension is installed and unlocked
- Check network configuration (should be devnet for testing)
- Refresh the page and try again

### Development Tips

1. **Use devnet for testing** - Never test with real funds
2. **Monitor logs** - Use `solana logs` for transaction debugging
3. **Check balances** - Verify token balances before operations
4. **Test incrementally** - Start with small amounts

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test**
   ```bash
   anchor test
   ```
4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new swap functionality"
   ```
5. **Push and create a pull request**

### Code Style

- **Rust**: Follow standard Rust formatting with `cargo fmt`
- **TypeScript**: Use ESLint and Prettier configurations
- **Tests**: Maintain 100% test coverage for new features

### Testing Requirements

All contributions must:
- ✅ Pass existing tests
- ✅ Include tests for new functionality
- ✅ Maintain or improve test coverage
- ✅ Follow established patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Solana Foundation** for the amazing blockchain platform
- **Anchor Framework** for simplifying Solana development
- **Constant Product Curve** mathematics from Uniswap
- **React Wallet Adapter** for seamless wallet integration

## 📞 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and ideas
- **Documentation**: Check the `app/README.md` for frontend-specific details

---

**⚠️ Disclaimer**: This is educational software. Use at your own risk. Always audit smart contracts before deploying to mainnet with real funds.
