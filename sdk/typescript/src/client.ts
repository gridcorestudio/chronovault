import { Connection, PublicKey, Keypair, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';
import { ChronoVaultProgram } from './program';
import {
  ProtocolConfig,
  ScheduledPayment,
  KeeperStats,
  CreatePaymentParams,
  PaymentWithPubkey,
  KeeperWithPubkey,
  PaymentInfo,
} from './types';
import {
  deriveProtocolConfigPda,
  derivePaymentPda,
  deriveEscrowPda,
  deriveKeeperStatsPda,
  dateToSlot,
  formatPaymentInfo,
  generatePaymentId,
} from './utils';
import { CHRONOVAULT_PROGRAM_ID } from './constants';

export class ChronoVaultClient {
  private program: ChronoVaultProgram;
  private connection: Connection;

  constructor(connection: Connection, wallet: any, programId?: PublicKey) {
    this.connection = connection;
    this.program = new ChronoVaultProgram(connection, wallet, programId);
  }

  static fromKeypair(
    connection: Connection,
    keypair: Keypair,
    programId?: PublicKey
  ): ChronoVaultClient {
    const program = ChronoVaultProgram.fromKeypair(connection, keypair, programId);
    const client = new ChronoVaultClient(connection, null, programId);
    (client as any).program = program;
    return client;
  }

  async initialize(
    treasury: PublicKey,
    protocolFeeBps: number = 50,
    keeperFeeBps: number = 30
  ): Promise<string> {
    const [configPda] = deriveProtocolConfigPda();

    const tx = await this.program.program.methods
      .initialize(protocolFeeBps, keeperFeeBps)
      .accounts({
        config: configPda,
        authority: this.program.provider.wallet.publicKey,
        treasury: treasury,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async createScheduledPayment(params: CreatePaymentParams): Promise<{
    txSignature: string;
    paymentId: BN;
    paymentPda: PublicKey;
  }> {
    const [configPda] = deriveProtocolConfigPda();
    const paymentId = generatePaymentId();
    const owner = this.program.provider.wallet.publicKey;

    const [paymentPda] = derivePaymentPda(owner, paymentId);
    const [escrowPda] = deriveEscrowPda(paymentPda);

    let executeAtSlot: number;
    if (params.executeAt instanceof Date) {
      executeAtSlot = await dateToSlot(this.connection, params.executeAt);
    } else {
      executeAtSlot = params.executeAt;
    }

    const amount = params.amount instanceof BN ? params.amount : new BN(params.amount);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      params.mint,
      owner
    );

    const tx = await this.program.program.methods
      .createScheduledPayment(paymentId, amount, new BN(executeAtSlot))
      .accounts({
        config: configPda,
        payment: paymentPda,
        escrow: escrowPda,
        owner: owner,
        recipient: params.recipient,
        mint: params.mint,
        ownerTokenAccount: ownerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return {
      txSignature: tx,
      paymentId,
      paymentPda,
    };
  }

  async executePayment(
    paymentOwner: PublicKey,
    paymentId: BN | number
  ): Promise<string> {
    const [configPda] = deriveProtocolConfigPda();
    const [paymentPda] = derivePaymentPda(paymentOwner, paymentId);
    const [escrowPda] = deriveEscrowPda(paymentPda);

    const payment = await this.getPayment(paymentOwner, paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const config = await this.getProtocolConfig();
    if (!config) {
      throw new Error('Protocol not initialized');
    }

    const keeper = this.program.provider.wallet.publicKey;
    const [keeperStatsPda] = deriveKeeperStatsPda(keeper);

    const recipientTokenAccount = await getAssociatedTokenAddress(
      payment.mint,
      payment.recipient
    );
    const keeperTokenAccount = await getAssociatedTokenAddress(
      payment.mint,
      keeper
    );
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      payment.mint,
      config.treasury
    );

    const tx = await this.program.program.methods
      .executePayment()
      .accounts({
        config: configPda,
        payment: paymentPda,
        escrow: escrowPda,
        keeper: keeper,
        keeperStats: keeperStatsPda,
        recipientTokenAccount: recipientTokenAccount,
        keeperTokenAccount: keeperTokenAccount,
        treasuryTokenAccount: treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  async cancelPayment(paymentId: BN | number): Promise<string> {
    const [configPda] = deriveProtocolConfigPda();
    const owner = this.program.provider.wallet.publicKey;
    const [paymentPda] = derivePaymentPda(owner, paymentId);
    const [escrowPda] = deriveEscrowPda(paymentPda);

    const payment = await this.getPayment(owner, paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const config = await this.getProtocolConfig();
    if (!config) {
      throw new Error('Protocol not initialized');
    }

    const ownerTokenAccount = await getAssociatedTokenAddress(
      payment.mint,
      owner
    );
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      payment.mint,
      config.treasury
    );

    const tx = await this.program.program.methods
      .cancelPayment()
      .accounts({
        config: configPda,
        payment: paymentPda,
        escrow: escrowPda,
        owner: owner,
        ownerTokenAccount: ownerTokenAccount,
        treasuryTokenAccount: treasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  async registerKeeper(): Promise<string> {
    const [configPda] = deriveProtocolConfigPda();
    const keeper = this.program.provider.wallet.publicKey;
    const [keeperStatsPda] = deriveKeeperStatsPda(keeper);

    const tx = await this.program.program.methods
      .registerKeeper()
      .accounts({
        config: configPda,
        keeperStats: keeperStatsPda,
        keeper: keeper,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getProtocolConfig(): Promise<ProtocolConfig | null> {
    try {
      const [configPda] = deriveProtocolConfigPda();
      const account = await this.program.program.account.protocolConfig.fetch(configPda);
      return account as unknown as ProtocolConfig;
    } catch {
      return null;
    }
  }

  async getPayment(
    owner: PublicKey,
    paymentId: BN | number
  ): Promise<ScheduledPayment | null> {
    try {
      const [paymentPda] = derivePaymentPda(owner, paymentId);
      const account = await this.program.program.account.scheduledPayment.fetch(paymentPda);
      return account as unknown as ScheduledPayment;
    } catch {
      return null;
    }
  }

  async getPaymentInfo(
    owner: PublicKey,
    paymentId: BN | number
  ): Promise<PaymentInfo | null> {
    const payment = await this.getPayment(owner, paymentId);
    if (!payment) return null;
    
    const currentSlot = await this.connection.getSlot();
    return formatPaymentInfo(payment, currentSlot);
  }

  async getAllPayments(): Promise<PaymentWithPubkey[]> {
    const accounts = await this.program.program.account.scheduledPayment.all();
    return accounts.map((a) => ({
      publicKey: a.publicKey,
      account: a.account as unknown as ScheduledPayment,
    }));
  }

  async getUserPayments(owner: PublicKey): Promise<PaymentWithPubkey[]> {
    const accounts = await this.program.program.account.scheduledPayment.all([
      {
        memcmp: {
          offset: 8 + 8,
          bytes: owner.toBase58(),
        },
      },
    ]);
    return accounts.map((a) => ({
      publicKey: a.publicKey,
      account: a.account as unknown as ScheduledPayment,
    }));
  }

  async getExecutablePayments(): Promise<PaymentWithPubkey[]> {
    const currentSlot = await this.connection.getSlot();
    const allPayments = await this.getAllPayments();

    return allPayments.filter((p) => {
      const payment = p.account;
      return (
        !payment.executed &&
        !payment.cancelled &&
        payment.executeAtSlot.toNumber() <= currentSlot
      );
    });
  }

  async getKeeperStats(keeper: PublicKey): Promise<KeeperStats | null> {
    try {
      const [keeperStatsPda] = deriveKeeperStatsPda(keeper);
      const account = await this.program.program.account.keeperStats.fetch(keeperStatsPda);
      return account as unknown as KeeperStats;
    } catch {
      return null;
    }
  }

  async getAllKeepers(): Promise<KeeperWithPubkey[]> {
    const accounts = await this.program.program.account.keeperStats.all();
    return accounts.map((a) => ({
      publicKey: a.publicKey,
      account: a.account as unknown as KeeperStats,
    }));
  }

  async getTopKeepers(limit: number = 10): Promise<KeeperWithPubkey[]> {
    const keepers = await this.getAllKeepers();
    return keepers
      .sort((a, b) => 
        b.account.executionsCount.cmp(a.account.executionsCount)
      )
      .slice(0, limit);
  }
}
