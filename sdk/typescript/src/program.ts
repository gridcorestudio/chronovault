import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { CHRONOVAULT_PROGRAM_ID } from './constants';

const IDL: Idl = {
  version: '0.1.0',
  name: 'chronovault',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'config', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'treasury', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'protocolFeeBps', type: 'u16' },
        { name: 'keeperFeeBps', type: 'u16' },
      ],
    },
    {
      name: 'createScheduledPayment',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'payment', isMut: true, isSigner: false },
        { name: 'escrow', isMut: true, isSigner: false },
        { name: 'owner', isMut: true, isSigner: true },
        { name: 'recipient', isMut: false, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'ownerTokenAccount', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'paymentId', type: 'u64' },
        { name: 'amount', type: 'u64' },
        { name: 'executeAtSlot', type: 'u64' },
      ],
    },
    {
      name: 'executePayment',
      accounts: [
        { name: 'config', isMut: true, isSigner: false },
        { name: 'payment', isMut: true, isSigner: false },
        { name: 'escrow', isMut: true, isSigner: false },
        { name: 'keeper', isMut: true, isSigner: true },
        { name: 'keeperStats', isMut: true, isSigner: false },
        { name: 'recipientTokenAccount', isMut: true, isSigner: false },
        { name: 'keeperTokenAccount', isMut: true, isSigner: false },
        { name: 'treasuryTokenAccount', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'cancelPayment',
      accounts: [
        { name: 'config', isMut: true, isSigner: false },
        { name: 'payment', isMut: true, isSigner: false },
        { name: 'escrow', isMut: true, isSigner: false },
        { name: 'owner', isMut: true, isSigner: true },
        { name: 'ownerTokenAccount', isMut: true, isSigner: false },
        { name: 'treasuryTokenAccount', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'registerKeeper',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'keeperStats', isMut: true, isSigner: false },
        { name: 'keeper', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'ProtocolConfig',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority', type: 'publicKey' },
          { name: 'treasury', type: 'publicKey' },
          { name: 'protocolFeeBps', type: 'u16' },
          { name: 'keeperFeeBps', type: 'u16' },
          { name: 'totalPaymentsCreated', type: 'u64' },
          { name: 'totalPaymentsExecuted', type: 'u64' },
          { name: 'totalFeesCollected', type: 'u64' },
          { name: 'paused', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'ScheduledPayment',
      type: {
        kind: 'struct',
        fields: [
          { name: 'id', type: 'u64' },
          { name: 'owner', type: 'publicKey' },
          { name: 'recipient', type: 'publicKey' },
          { name: 'mint', type: 'publicKey' },
          { name: 'escrow', type: 'publicKey' },
          { name: 'amount', type: 'u64' },
          { name: 'feeAmount', type: 'u64' },
          { name: 'executeAtSlot', type: 'u64' },
          { name: 'createdAtSlot', type: 'u64' },
          { name: 'executed', type: 'bool' },
          { name: 'cancelled', type: 'bool' },
          { name: 'executor', type: 'publicKey' },
          { name: 'executedAtSlot', type: 'u64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'KeeperStats',
      type: {
        kind: 'struct',
        fields: [
          { name: 'keeper', type: 'publicKey' },
          { name: 'executionsCount', type: 'u64' },
          { name: 'totalFeesEarned', type: 'u64' },
          { name: 'failedAttempts', type: 'u64' },
          { name: 'registeredAtSlot', type: 'u64' },
          { name: 'lastExecutionSlot', type: 'u64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'ProtocolPaused', msg: 'Protocol is currently paused' },
    { code: 6001, name: 'InvalidAmount', msg: 'Invalid payment amount' },
    { code: 6002, name: 'InvalidExecutionSlot', msg: 'Invalid execution slot' },
    { code: 6003, name: 'AlreadyExecuted', msg: 'Payment already executed' },
    { code: 6004, name: 'AlreadyCancelled', msg: 'Payment already cancelled' },
    { code: 6005, name: 'TooEarly', msg: 'Cannot execute before target slot' },
    { code: 6006, name: 'Unauthorized', msg: 'Unauthorized' },
    { code: 6007, name: 'InvalidFeeConfig', msg: 'Invalid fee configuration' },
  ],
};

export class ChronoVaultProgram {
  public program: Program;
  public connection: Connection;
  public provider: AnchorProvider;

  constructor(connection: Connection, wallet: any, programId?: PublicKey) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(
      IDL,
      programId || CHRONOVAULT_PROGRAM_ID,
      this.provider
    );
  }

  static fromKeypair(
    connection: Connection,
    keypair: Keypair,
    programId?: PublicKey
  ): ChronoVaultProgram {
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: async (tx: any) => {
        tx.sign(keypair);
        return tx;
      },
      signAllTransactions: async (txs: any[]) => {
        txs.forEach((tx) => tx.sign(keypair));
        return txs;
      },
    };
    return new ChronoVaultProgram(connection, wallet, programId);
  }
}
