import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Head from 'next/head';
import Link from 'next/link';

interface KeeperStats {
  address: string;
  executionsCount: number;
  totalFeesEarned: number;
  lastExecutionTime: Date | null;
  rank: number;
}

const mockKeepers: KeeperStats[] = [
  {
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    executionsCount: 1234,
    totalFeesEarned: 567.89,
    lastExecutionTime: new Date(),
    rank: 1,
  },
  {
    address: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
    executionsCount: 987,
    totalFeesEarned: 432.10,
    lastExecutionTime: new Date(Date.now() - 3600000),
    rank: 2,
  },
  {
    address: '9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW',
    executionsCount: 654,
    totalFeesEarned: 234.56,
    lastExecutionTime: new Date(Date.now() - 7200000),
    rank: 3,
  },
];

const protocolStats = {
  totalPaymentsExecuted: 12345,
  totalVolume: 1234567.89,
  activeKeepers: 42,
  averageExecutionTime: '0.4s',
};

export default function Keepers() {
  const { connected, publicKey } = useWallet();
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterKeeper = async () => {
    setIsRegistering(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsRegistering(false);
    alert('Keeper registration successful! (Demo)');
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <>
      <Head>
        <title>Keeper Network - ChronoVault</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <nav className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">⏱️</span>
                <span className="text-xl font-bold text-white">ChronoVault</span>
              </Link>
              
              <div className="flex items-center space-x-6">
                <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
                  Create Payment
                </Link>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/keepers" className="text-white font-medium">
                  Keepers
                </Link>
                <WalletMultiButton />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white">Keeper Network</h1>
            <p className="text-gray-400 mt-2">
              Decentralized network of keepers ensuring payments execute on time
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Total Executions</p>
              <p className="text-3xl font-bold text-white mt-1">
                {protocolStats.totalPaymentsExecuted.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Total Volume</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${protocolStats.totalVolume.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Active Keepers</p>
              <p className="text-3xl font-bold text-white mt-1">
                {protocolStats.activeKeepers}
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm">Avg. Execution Time</p>
              <p className="text-3xl font-bold text-white mt-1">
                {protocolStats.averageExecutionTime}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                </div>
                <div className="divide-y divide-gray-700">
                  {mockKeepers.map((keeper) => (
                    <div key={keeper.address} className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl w-8 text-center">
                          {getRankBadge(keeper.rank)}
                        </span>
                        <div>
                          <p className="text-white font-mono text-sm">
                            {keeper.address.slice(0, 8)}...{keeper.address.slice(-8)}
                          </p>
                          <p className="text-gray-500 text-sm">
                            Last active: {keeper.lastExecutionTime?.toLocaleString() || 'Never'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {keeper.executionsCount.toLocaleString()} executions
                        </p>
                        <p className="text-primary-400 text-sm">
                          {keeper.totalFeesEarned.toFixed(2)} USDC earned
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Become a Keeper</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Earn fees by executing scheduled payments. Anyone can run a keeper bot!
                </p>
                
                {connected ? (
                  <button
                    onClick={handleRegisterKeeper}
                    disabled={isRegistering}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isRegistering ? 'Registering...' : 'Register as Keeper'}
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-4">Connect wallet to register</p>
                    <WalletMultiButton />
                  </div>
                )}
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">How it Works</h2>
                <ol className="space-y-4 text-sm text-gray-400">
                  <li className="flex items-start space-x-3">
                    <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
                    <span>Clone the open-source keeper bot from GitHub</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
                    <span>Configure your wallet and RPC endpoint</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
                    <span>Run the bot - it monitors for executable payments</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
                    <span>Earn 30% of protocol fees (0.15% per execution)</span>
                  </li>
                </ol>
                
                <a
                  href="https://github.com/chronovault/keeper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-6 text-center text-primary-400 hover:text-primary-300 font-medium"
                >
                  View Keeper Documentation
                </a>
              </div>

              <div className="bg-gradient-to-r from-primary-600/20 to-blue-600/20 rounded-xl p-6 border border-primary-500/30">
                <h3 className="text-lg font-bold text-white mb-2">Keeper Economics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your share</span>
                    <span className="text-white">30% of fees</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Per 1000 USDC payment</span>
                    <span className="text-primary-400">~1.5 USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas cost</span>
                    <span className="text-white">~0.0003 SOL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
