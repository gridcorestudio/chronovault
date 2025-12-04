import { Connection, Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { PaymentMonitor } from './monitor';
import { KeeperExecutor } from './executor';
import { KeeperConfig, loadConfig } from './config';

dotenv.config();

async function main() {
  console.log('🚀 ChronoVault Keeper Bot Starting...\n');

  const config = loadConfig();
  
  console.log('Configuration:');
  console.log(`  RPC URL: ${config.rpcUrl}`);
  console.log(`  Poll Interval: ${config.pollIntervalMs}ms`);
  console.log(`  Priority Fee: ${config.priorityFeeMicroLamports} microlamports`);
  console.log('');

  const connection = new Connection(config.rpcUrl, 'confirmed');
  
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(config.privateKey))
  );
  
  console.log(`🔑 Keeper Wallet: ${keypair.publicKey.toString()}`);
  
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.01 * 1e9) {
    console.warn('⚠️  Low balance! Consider adding more SOL for gas fees.');
  }
  
  console.log('');

  const executor = new KeeperExecutor(connection, keypair, config);
  const monitor = new PaymentMonitor(connection, keypair, executor, config);

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down keeper bot...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down keeper bot...');
    monitor.stop();
    process.exit(0);
  });

  console.log('🔍 Starting payment monitor...\n');
  await monitor.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
