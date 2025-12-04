import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface ProtocolConfig {
  authority: PublicKey;
  treasury: PublicKey;
  protocolFeeBps: number;
  keeperFeeBps: number;
  totalPaymentsCreated: BN;
  totalPaymentsExecuted: BN;
  totalFeesCollected: BN;
  paused: boolean;
  bump: number;
}

export interface ScheduledPayment {
  id: BN;
  owner: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  escrow: PublicKey;
  amount: BN;
  feeAmount: BN;
  executeAtSlot: BN;
  createdAtSlot: BN;
  executed: boolean;
  cancelled: boolean;
  executor: PublicKey;
  executedAtSlot: BN;
  bump: number;
}

export interface KeeperStats {
  keeper: PublicKey;
  executionsCount: BN;
  totalFeesEarned: BN;
  failedAttempts: BN;
  registeredAtSlot: BN;
  lastExecutionSlot: BN;
  bump: number;
}

export interface CreatePaymentParams {
  recipient: PublicKey;
  mint: PublicKey;
  amount: number | BN;
  executeAt: Date | number;
}

export interface PaymentWithPubkey {
  publicKey: PublicKey;
  account: ScheduledPayment;
}

export interface KeeperWithPubkey {
  publicKey: PublicKey;
  account: KeeperStats;
}

export type PaymentStatus = 'pending' | 'executed' | 'cancelled';

export interface PaymentInfo {
  id: string;
  owner: string;
  recipient: string;
  mint: string;
  amount: string;
  feeAmount: string;
  executeAt: Date;
  createdAt: Date;
  status: PaymentStatus;
  executor?: string;
  executedAt?: Date;
  timeUntilExecution?: number;
}
