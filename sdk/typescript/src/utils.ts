import { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
import {
  CHRONOVAULT_PROGRAM_ID,
  PROTOCOL_CONFIG_SEED,
  PAYMENT_SEED,
  ESCROW_SEED,
  KEEPER_STATS_SEED,
  SLOTS_PER_SECOND,
} from './constants';
import { ScheduledPayment, PaymentInfo, PaymentStatus } from './types';

export function deriveProtocolConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    CHRONOVAULT_PROGRAM_ID
  );
}

export function derivePaymentPda(
  owner: PublicKey,
  paymentId: BN | number
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  new BN(paymentId).toArrayLike(Buffer, 'le', 8).copy(idBuffer);
  
  return PublicKey.findProgramAddressSync(
    [PAYMENT_SEED, owner.toBuffer(), idBuffer],
    CHRONOVAULT_PROGRAM_ID
  );
}

export function deriveEscrowPda(paymentPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_SEED, paymentPda.toBuffer()],
    CHRONOVAULT_PROGRAM_ID
  );
}

export function deriveKeeperStatsPda(keeper: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [KEEPER_STATS_SEED, keeper.toBuffer()],
    CHRONOVAULT_PROGRAM_ID
  );
}

export async function dateToSlot(
  connection: Connection,
  targetDate: Date
): Promise<number> {
  const currentSlot = await connection.getSlot();
  const now = Date.now();
  const targetTime = targetDate.getTime();
  const diffMs = targetTime - now;
  const diffSeconds = diffMs / 1000;
  const slotsToAdd = Math.floor(diffSeconds * SLOTS_PER_SECOND);
  return currentSlot + slotsToAdd;
}

export function slotToDate(currentSlot: number, targetSlot: number): Date {
  const slotDiff = targetSlot - currentSlot;
  const secondsDiff = slotDiff / SLOTS_PER_SECOND;
  const targetTime = Date.now() + secondsDiff * 1000;
  return new Date(targetTime);
}

export function formatPaymentInfo(
  payment: ScheduledPayment,
  currentSlot: number
): PaymentInfo {
  let status: PaymentStatus = 'pending';
  if (payment.executed) {
    status = 'executed';
  } else if (payment.cancelled) {
    status = 'cancelled';
  }

  const executeAtSlot = payment.executeAtSlot.toNumber();
  const createdAtSlot = payment.createdAtSlot.toNumber();
  const slotDiff = executeAtSlot - currentSlot;
  const timeUntilExecution = slotDiff > 0 ? slotDiff / SLOTS_PER_SECOND : 0;

  return {
    id: payment.id.toString(),
    owner: payment.owner.toString(),
    recipient: payment.recipient.toString(),
    mint: payment.mint.toString(),
    amount: payment.amount.toString(),
    feeAmount: payment.feeAmount.toString(),
    executeAt: slotToDate(currentSlot, executeAtSlot),
    createdAt: slotToDate(currentSlot, createdAtSlot),
    status,
    executor: payment.executed ? payment.executor.toString() : undefined,
    executedAt: payment.executed
      ? slotToDate(currentSlot, payment.executedAtSlot.toNumber())
      : undefined,
    timeUntilExecution,
  };
}

export function calculateFees(
  amount: BN,
  protocolFeeBps: number,
  keeperFeeBps: number
): { totalFee: BN; keeperFee: BN; protocolFee: BN } {
  const totalFee = amount.mul(new BN(protocolFeeBps)).div(new BN(10000));
  const keeperFee = totalFee.mul(new BN(keeperFeeBps)).div(new BN(100));
  const protocolFee = totalFee.sub(keeperFee);
  return { totalFee, keeperFee, protocolFee };
}

export function generatePaymentId(): BN {
  return new BN(Date.now());
}
