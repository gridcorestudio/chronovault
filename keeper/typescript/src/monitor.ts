import { Connection, Keypair, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { KeeperExecutor } from './executor';
import { KeeperConfig } from './config';
import BN from 'bn.js';
import * as borsh from 'borsh';

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

export class PaymentMonitor {
  private connection: Connection;
  private keypair: Keypair;
  private executor: KeeperExecutor;
  private config: KeeperConfig;
  private running: boolean = false;
  private checkCount: number = 0;
  private executedCount: number = 0;
  private failedCount: number = 0;

  constructor(
    connection: Connection,
    keypair: Keypair,
    executor: KeeperExecutor,
    config: KeeperConfig
  ) {
    this.connection = connection;
    this.keypair = keypair;
    this.executor = executor;
    this.config = config;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('📡 Monitor started, watching for executable payments...\n');

    while (this.running) {
      try {
        await this.checkForExecutablePayments();
        await this.sleep(this.config.pollIntervalMs);
      } catch (error) {
        console.error('❌ Monitor error:', error);
        await this.sleep(5000);
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log('\n📊 Final Stats:');
    console.log(`   Total checks: ${this.checkCount}`);
    console.log(`   Successful executions: ${this.executedCount}`);
    console.log(`   Failed attempts: ${this.failedCount}`);
  }

  private async checkForExecutablePayments(): Promise<void> {
    this.checkCount++;
    
    const currentSlot = await this.connection.getSlot();
    
    const payments = await this.getExecutablePayments(currentSlot);
    
    if (payments.length > 0) {
      console.log(`\n🎯 Found ${payments.length} executable payment(s) at slot ${currentSlot}`);
      
      for (const payment of payments) {
        await this.tryExecutePayment(payment, currentSlot);
      }
    } else {
      if (this.checkCount % 60 === 0) {
        console.log(`⏳ [${new Date().toISOString()}] No executable payments (slot: ${currentSlot})`);
      }
    }
  }

  private async getExecutablePayments(currentSlot: number): Promise<PaymentWithPubkey[]> {
    try {
      const programId = new PublicKey(this.config.programId);
      
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 8 + 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 1 },
        ],
      });

      const executablePayments: PaymentWithPubkey[] = [];

      for (const { pubkey, account } of accounts) {
        try {
          const data = account.data;
          
          const discriminator = data.slice(0, 8);
          const paymentDiscriminator = Buffer.from([85, 104, 118, 159, 68, 231, 146, 48]);
          
          if (!discriminator.equals(paymentDiscriminator)) {
            continue;
          }

          const id = new BN(data.slice(8, 16), 'le');
          const owner = new PublicKey(data.slice(16, 48));
          const recipient = new PublicKey(data.slice(48, 80));
          const mint = new PublicKey(data.slice(80, 112));
          const escrow = new PublicKey(data.slice(112, 144));
          const amount = new BN(data.slice(144, 152), 'le');
          const feeAmount = new BN(data.slice(152, 160), 'le');
          const executeAtSlot = new BN(data.slice(160, 168), 'le');
          const createdAtSlot = new BN(data.slice(168, 176), 'le');
          const executed = data[176] === 1;
          const cancelled = data[177] === 1;
          const executor = new PublicKey(data.slice(178, 210));
          const executedAtSlot = new BN(data.slice(210, 218), 'le');
          const bump = data[218];

          if (!executed && !cancelled && executeAtSlot.toNumber() <= currentSlot) {
            executablePayments.push({
              publicKey: pubkey,
              account: {
                id,
                owner,
                recipient,
                mint,
                escrow,
                amount,
                feeAmount,
                executeAtSlot,
                createdAtSlot,
                executed,
                cancelled,
                executor,
                executedAtSlot,
                bump,
              },
            });
          }
        } catch (err) {
          continue;
        }
      }

      return executablePayments;
    } catch (error) {
      console.error('Error fetching executable payments:', error);
      return [];
    }
  }

  private async tryExecutePayment(
    payment: PaymentWithPubkey,
    currentSlot: number
  ): Promise<void> {
    const paymentId = payment.account.id.toString();
    const amount = payment.account.amount.toNumber() / 1e6;
    const slotsLate = currentSlot - payment.account.executeAtSlot.toNumber();

    console.log(`\n💫 Attempting to execute payment #${paymentId}`);
    console.log(`   Amount: ${amount} tokens`);
    console.log(`   Slots late: ${slotsLate}`);
    console.log(`   Recipient: ${payment.account.recipient.toString().slice(0, 8)}...`);

    try {
      const txSignature = await this.executor.execute(payment);
      
      this.executedCount++;
      console.log(`✅ SUCCESS! TX: ${txSignature}`);
      console.log(`💰 Keeper fee earned!`);
      
    } catch (error: any) {
      this.failedCount++;
      
      if (error.message?.includes('AlreadyExecuted')) {
        console.log(`⏭️  Already executed by another keeper`);
      } else if (error.message?.includes('TooEarly')) {
        console.log(`⏰ Too early - waiting for target slot`);
      } else {
        console.error(`❌ Execution failed:`, error.message || error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
