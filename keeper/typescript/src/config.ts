export interface KeeperConfig {
  rpcUrl: string;
  privateKey: string;
  programId: string;
  pollIntervalMs: number;
  priorityFeeMicroLamports: number;
  minProfitLamports: number;
  logLevel: string;
}

export function loadConfig(): KeeperConfig {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const privateKey = process.env.KEEPER_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('KEEPER_PRIVATE_KEY environment variable is required');
  }

  return {
    rpcUrl,
    privateKey,
    programId: process.env.PROGRAM_ID || 'EzHNPN4VCbZZzBTk8S24vbzhtxFkMHEvSNmJCD8GqEcy',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '1000', 10),
    priorityFeeMicroLamports: parseInt(process.env.PRIORITY_FEE_MICROLAMPORTS || '5000', 10),
    minProfitLamports: parseInt(process.env.MIN_PROFIT_LAMPORTS || '1000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}
