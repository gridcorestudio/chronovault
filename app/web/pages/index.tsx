import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = async () => {
    if (publicKey) {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    }
  };

  if (connected && publicKey && balance === null) {
    fetchBalance();
  }

  return (
    <>
      <Head>
        <title>ChronoVault - Time-Locked Execution Protocol</title>
        <meta name="description" content="Decentralized scheduled payments on Solana" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <nav className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⏱️</span>
                <span className="text-xl font-bold text-white">ChronoVault</span>
              </div>
              
              <div className="flex items-center space-x-6">
                <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
                  Create Payment
                </Link>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/keepers" className="text-gray-300 hover:text-white transition-colors">
                  Keepers
                </Link>
                <WalletMultiButton />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-white mb-6">
              Time-Locked Execution
              <span className="block text-primary-400">for Solana</span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Schedule payments, automate DeFi strategies, and set up vesting - 
              all with cryptographic guarantees using Proof of History.
            </p>

            {connected ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-gray-700">
                <div className="text-left space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Connected Wallet</p>
                    <p className="text-white font-mono text-sm">
                      {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="text-white text-2xl font-bold">
                      {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <Link
                    href="/create"
                    className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
                  >
                    Create Scheduled Payment
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
                  >
                    View Your Payments
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-gray-700">
                <p className="text-gray-300 mb-6">Connect your wallet to get started</p>
                <WalletMultiButton className="!w-full !justify-center" />
              </div>
            )}
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Escrow</h3>
              <p className="text-gray-400">
                Your funds are locked in audited smart contracts until execution time.
              </p>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Proof of History</h3>
              <p className="text-gray-400">
                Cryptographic time guarantees with Solana's sub-second precision.
              </p>
            </div>
            
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-white mb-2">Decentralized</h3>
              <p className="text-gray-400">
                Open-source keeper network ensures payments execute trustlessly.
              </p>
            </div>
          </div>

          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold text-white mb-8">Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '💰', title: 'Payroll', desc: 'Automated salary payments' },
                { icon: '📈', title: 'Vesting', desc: 'Token unlock schedules' },
                { icon: '🔄', title: 'DCA', desc: 'Dollar-cost averaging' },
                { icon: '🏛️', title: 'DAO Treasury', desc: 'Programmatic spending' },
              ].map((item) => (
                <div key={item.title} className="bg-gray-800/20 rounded-lg p-6 border border-gray-700/50">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-gray-700 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center">
              <p className="text-gray-400">ChronoVault Protocol - Devnet</p>
              <div className="flex space-x-6">
                <a href="https://github.com/chronovault" className="text-gray-400 hover:text-white">
                  GitHub
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  Docs
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
