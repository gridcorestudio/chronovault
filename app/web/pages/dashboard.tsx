import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Head from 'next/head';
import Link from 'next/link';

interface Payment {
  id: string;
  recipient: string;
  amount: number;
  token: string;
  executeAt: Date;
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: Date;
}

const mockPayments: Payment[] = [
  {
    id: '1',
    recipient: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    amount: 100,
    token: 'USDC',
    executeAt: new Date(Date.now() + 86400000),
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: '2',
    recipient: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
    amount: 500,
    token: 'USDC',
    executeAt: new Date(Date.now() - 86400000),
    status: 'executed',
    createdAt: new Date(Date.now() - 172800000),
  },
];

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed' | 'cancelled'>('all');

  useEffect(() => {
    if (connected) {
      setPayments(mockPayments);
    }
  }, [connected]);

  const filteredPayments = payments.filter(
    (p) => filter === 'all' || p.status === filter
  );

  const getStatusBadge = (status: Payment['status']) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      executed: 'bg-green-500/20 text-green-400 border-green-500/50',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTimeRemaining = (executeAt: Date) => {
    const now = new Date();
    const diff = executeAt.getTime() - now.getTime();
    
    if (diff < 0) return 'Past due';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <>
      <Head>
        <title>Dashboard - ChronoVault</title>
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
                <Link href="/dashboard" className="text-white font-medium">
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

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Your Payments</h1>
              <p className="text-gray-400 mt-2">
                View and manage your scheduled payments
              </p>
            </div>
            <Link
              href="/create"
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + New Payment
            </Link>
          </div>

          {!connected ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
              <p className="text-gray-300 mb-6">Connect your wallet to view your payments</p>
              <WalletMultiButton />
            </div>
          ) : (
            <>
              <div className="flex space-x-2 mb-6">
                {(['all', 'pending', 'executed', 'cancelled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === f
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {filteredPayments.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
                  <p className="text-gray-400">No payments found</p>
                  <Link
                    href="/create"
                    className="inline-block mt-4 text-primary-400 hover:text-primary-300"
                  >
                    Create your first scheduled payment
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl font-bold text-white">
                              {payment.amount} {payment.token}
                            </span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <p className="text-gray-400 text-sm">
                            To: {payment.recipient.slice(0, 8)}...{payment.recipient.slice(-8)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          {payment.status === 'pending' && (
                            <>
                              <p className="text-primary-400 font-medium">
                                {getTimeRemaining(payment.executeAt)}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {payment.executeAt.toLocaleString()}
                              </p>
                            </>
                          )}
                          {payment.status === 'executed' && (
                            <p className="text-gray-400 text-sm">
                              Executed on {payment.executeAt.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {payment.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex space-x-3">
                          <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                            Cancel Payment
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
