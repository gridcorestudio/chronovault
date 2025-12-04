import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';
import { KeeperConfig } from './config';

interface ScheduledPayment {
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

interface PaymentWithPubkey {
  publicKey: PublicKey;
  account: ScheduledPayment;
}

const CHRONOVAULT_PROGRAM_ID = new PublicKey('ChronoVau1txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

export class KeeperExecutor {
  private connection: Connection;
  private keypair: Keypair;
  private config: KeeperConfig;

  constructor(connection: Connection, keypair: Keypair, config: KeeperConfig) {
    this.connection = connection;
    this.keypair = keypair;
    this.config = config;
  }

  async execute(payment: PaymentWithPubkey): Promise<string> {
    const transaction = new Transaction();

    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: this.config.priorityFeeMicroLamports,
    });
    
    const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    transaction.add(priorityFeeIx, computeUnitsIx);

    const executeIx = await this.buildExecuteInstruction(payment);
    transaction.add(executeIx);

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    return signature;
  }

  private async buildExecuteInstruction(
    payment: PaymentWithPubkey
  ): Promise<TransactionInstruction> {
    const p = payment.account;
    
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      CHRONOVAULT_PROGRAM_ID
    );

    const idBuffer = Buffer.alloc(8);
    p.id.toArrayLike(Buffer, 'le', 8).copy(idBuffer);
    
    const [paymentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment'), p.owner.toBuffer(), idBuffer],
      CHRONOVAULT_PROGRAM_ID
    );

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), paymentPda.toBuffer()],
      CHRONOVAULT_PROGRAM_ID
    );

    const [keeperStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('keeper_stats'), this.keypair.publicKey.toBuffer()],
      CHRONOVAULT_PROGRAM_ID
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      p.mint,
      p.recipient
    );
    
    const keeperTokenAccount = await getAssociatedTokenAddress(
      p.mint,
      this.keypair.publicKey
    );

    const treasuryPubkey = new PublicKey('11111111111111111111111111111111');
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      p.mint,
      treasuryPubkey
    );

    const discriminator = Buffer.from([0x54, 0x97, 0x2a, 0x0e, 0x8c, 0x5d, 0x3a, 0x1f]);

    const keys = [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: paymentPda, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: this.keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: keeperStatsPda, isSigner: false, isWritable: true },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
      { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: CHRONOVAULT_PROGRAM_ID,
      data: discriminator,
    });
  }

  async estimateProfitability(payment: PaymentWithPubkey): Promise<{
    profitable: boolean;
    estimatedProfit: number;
    keeperFee: number;
    gasCost: number;
  }> {
    const keeperFeeBps = 30;
    const protocolFeeBps = 50;
    
    const totalFee = payment.account.amount
      .mul(new BN(protocolFeeBps))
      .div(new BN(10000));
    
    const keeperFee = totalFee.mul(new BN(keeperFeeBps)).div(new BN(100));
    
    const estimatedGasCost = 5000 + this.config.priorityFeeMicroLamports;
    
    const keeperFeeNumber = keeperFee.toNumber();
    const profitable = keeperFeeNumber > estimatedGasCost;

    return {
      profitable,
      estimatedProfit: keeperFeeNumber - estimatedGasCost,
      keeperFee: keeperFeeNumber,
      gasCost: estimatedGasCost,
    };
  }
}
