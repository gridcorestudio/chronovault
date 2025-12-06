# ChronoVault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-devnet-blueviolet)](https://solana.com)

**Decentralized Time-Locked Execution Protocol for Solana**

ChronoVault enables programmable scheduled transactions on Solana blockchain with cryptographic guarantees using Proof of History. Schedule payments, automate DeFi operations, and manage vesting schedules with sub-second precision.

## Features

- **Scheduled Payments**: Create time-locked payments that execute automatically at specified slots
- **Decentralized Keeper Network**: Open-source keeper bots compete to execute transactions
- **Low Fees**: 0.35% protocol fee + 0.15% keeper reward
- **Proof of History**: Leverages Solana's cryptographic clock for precise timing
- **Cancellable**: Payments can be cancelled before execution (with small penalty)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ChronoVault Protocol                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Creator    │───>│   Escrow     │───>│  Recipient   │  │
│  │   (User)     │    │   (PDA)      │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    ▲          │
│         │                   │                    │          │
│         ▼                   ▼                    │          │
│  ┌──────────────┐    ┌──────────────┐           │          │
│  │   Payment    │    │   Keeper     │───────────┘          │
│  │   Account    │<───│   Network    │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Rust 1.70+
- Solana CLI 2.0+
- Anchor CLI 0.32.0+
- Node.js 18+

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/chronovault.git
cd chronovault

# Install dependencies
npm install

# Build program
anchor build

# Run tests
anchor test
```

### Deploy to Devnet

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 5

# Deploy
anchor deploy --provider.cluster devnet
```

## Project Structure

```
chronovault/
├── programs/chronovault/     # Anchor smart contract (Rust)
│   └── src/
│       ├── lib.rs           # Program entry point
│       ├── state.rs         # Account structures
│       ├── errors.rs        # Error codes
│       └── instructions/    # All instructions
│
├── sdk/typescript/           # TypeScript SDK
│   └── src/
│       ├── client.ts        # ChronoVaultClient class
│       ├── types.ts         # TypeScript types
│       └── utils.ts         # Helper functions
│
├── keeper/typescript/        # Keeper Bot
│   └── src/
│       ├── monitor.ts       # Payment monitoring
│       └── executor.ts      # Execution logic
│
├── app/web/                  # Next.js Frontend
│   └── pages/
│
└── tests/                    # Integration tests
```

## Usage

### TypeScript SDK

```typescript
import { ChronoVaultClient } from '@chronovault/sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const client = ChronoVaultClient.fromKeypair(connection, keypair);

// Create scheduled payment (executes in 1 hour)
const { txSignature, paymentId } = await client.createScheduledPayment({
  recipient: new PublicKey('...'),
  mint: USDC_MINT,
  amount: 100_000_000, // 100 USDC
  executeAt: new Date(Date.now() + 3600 * 1000),
});

// Cancel payment (if needed)
await client.cancelPayment(paymentId);
```

### Running a Keeper

```bash
cd keeper/typescript
cp .env.example .env
# Edit .env with your wallet and RPC

npm install
npm start
```

## Fee Structure

| Fee Type | Amount | Recipient |
|----------|--------|-----------|
| Protocol Fee | 0.35% | Treasury |
| Keeper Reward | 0.15% | Executing Keeper |
| Cancellation Penalty | 0.1% | Treasury |

## Security

- All arithmetic operations use checked math to prevent overflow
- Escrow accounts use PDA authority for secure fund custody
- Protocol can be paused by admin in emergencies
- Keeper registration prevents spam attacks

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [x] Core protocol implementation
- [x] TypeScript SDK
- [x] Keeper bot
- [x] Web interface
- [ ] Mainnet deployment
- [ ] Multi-token support expansion
- [ ] Recurring payments
- [ ] SIMD proposal for runtime integration

## License

MIT License - see [LICENSE](LICENSE) for details.

## CI/CD Setup

### Required Secrets

For deployment to devnet, add the following secret to your GitHub repository:

- `DEPLOY_WALLET_KEYPAIR`: JSON content of your Solana wallet keypair (from `~/.config/solana/id.json`)

### Toolchain Requirements

- Rust: stable
- Solana CLI: 2.0.3
- Anchor CLI: 0.32.0
- Node.js: 20

---

Built for the Solana ecosystem
