# ChronoVault - Decentralized Time-Locked Execution Protocol

## Overview
ChronoVault is a decentralized protocol for programmable scheduled transactions on Solana blockchain. It enables automatic execution of payments, DeFi automation, and vesting schedules with cryptographic guarantees using Proof of History.

## Project Structure

```
chronovault/
├── programs/chronovault/     # Anchor smart contract (Rust)
│   └── src/
│       ├── lib.rs           # Main program entry
│       ├── state.rs         # Account structures
│       ├── errors.rs        # Error codes
│       └── instructions/    # All instructions
│           ├── initialize.rs
│           ├── create_payment.rs
│           ├── execute_payment.rs
│           ├── cancel_payment.rs
│           ├── update_config.rs
│           └── register_keeper.rs
│
├── sdk/typescript/           # TypeScript SDK
│   └── src/
│       ├── client.ts        # Main client class
│       ├── program.ts       # Anchor program wrapper
│       ├── types.ts         # TypeScript types
│       ├── utils.ts         # Helper functions
│       └── constants.ts     # Constants
│
├── keeper/typescript/        # Keeper Bot
│   └── src/
│       ├── index.ts         # Entry point
│       ├── monitor.ts       # Payment monitoring
│       ├── executor.ts      # Execution logic
│       └── config.ts        # Configuration
│
├── app/web/                  # Next.js Frontend
│   └── pages/
│       ├── index.tsx        # Landing page
│       ├── create.tsx       # Create payment
│       ├── dashboard.tsx    # User dashboard
│       └── keepers.tsx      # Keeper leaderboard
│
└── tests/                    # Integration tests
```

## Key Features
- **Scheduled Payments**: Create time-locked payments that execute automatically
- **Decentralized Keepers**: Open-source keeper network for trustless execution
- **Fee Distribution**: 0.35% protocol fee, 0.15% keeper reward
- **Proof of History**: Sub-second precision using Solana's cryptographic clock

## Development

### Smart Contract
```bash
# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Frontend
```bash
cd app/web
npm install
npm run dev
```

### Keeper Bot
```bash
cd keeper/typescript
npm install
cp .env.example .env
# Edit .env with your wallet and RPC
npm start
```

## Architecture Decisions
- **Anchor Framework**: Standard for Solana development, provides security and type safety
- **TypeScript SDK**: Easy integration for web3 developers
- **Next.js Frontend**: Fast, SEO-friendly, great developer experience
- **Decentralized from Day 1**: Open-source keeper network to attract community

## User Preferences
- Russian language for communication
- Focus on devnet development first
- Decentralized architecture for investor appeal

## Recent Changes

### December 4, 2024
- **Critical Bug Fixes**:
  - Fixed signer derivation in execute_payment and cancel_payment to use payment PDA seeds
  - Replaced arithmetic overflow unwraps with proper error handling
  - Fixed calculate_fees to return Option instead of panicking
  - Implemented getExecutablePayments in keeper monitor with correct account parsing
  - Fixed Anchor discriminator for ScheduledPayment accounts

### December 2024: Initial Development
- Created Anchor smart contract with 6 instructions
- Built TypeScript SDK with ChronoVaultClient class
- Developed decentralized Keeper Bot with monitoring
- Created Next.js frontend with wallet integration

## Security Considerations
- All arithmetic operations use checked math
- PDA authority properly configured for escrow accounts
- Protocol can be paused by admin
- Cancellation has small penalty (0.1%) to prevent spam

## Next Steps
- Write comprehensive smart contract tests
- Deploy to Solana devnet
- Integration testing end-to-end
- Documentation for keeper operators
