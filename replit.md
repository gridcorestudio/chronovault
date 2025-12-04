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
- December 2024: Initial project setup
- Created smart contract with 6 instructions
- Created TypeScript SDK
- Created Keeper Bot
- Created Next.js frontend
