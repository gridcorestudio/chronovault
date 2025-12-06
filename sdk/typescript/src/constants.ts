import { PublicKey } from '@solana/web3.js';

export const CHRONOVAULT_PROGRAM_ID = new PublicKey('EzHNPN4VCbZZzBTk8S24vbzhtxFkMHEvSNmJCD8GqEcy');

export const PROTOCOL_CONFIG_SEED = Buffer.from('protocol_config');
export const PAYMENT_SEED = Buffer.from('payment');
export const ESCROW_SEED = Buffer.from('escrow');
export const KEEPER_STATS_SEED = Buffer.from('keeper_stats');

export const SLOTS_PER_SECOND = 2;
export const SECONDS_PER_SLOT = 0.5;

export const DEFAULT_PROTOCOL_FEE_BPS = 50;
export const DEFAULT_KEEPER_FEE_BPS = 30;

export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';
export const MAINNET_RPC_URL = 'https://api.mainnet-beta.solana.com';
