import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';

export default function CreatePayment() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [executeDate, setExecuteDate] = useState('');
  const [executeTime, setExecuteTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const feePercentage = 0.5;
  const calculatedFee = amount ? (parseFloat(amount) * feePercentage / 100).toFixed(6) : '0';
  const recipientAmount = amount ? (parseFloat(amount) - parseFloat(calculatedFee)).toFixed(6) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (!recipient || !amount || !executeDate || !executeTime) {
        throw new Error('Please fill in all fields');
      }

      try {
        new PublicKey(recipient);
      } catch {
        throw new Error('Invalid recipient address');
      }

      const executeDateTime = new Date(`${executeDate}T${executeTime}`);
      if (executeDateTime <= new Date()) {
        throw new Error('Execution time must be in the future');
      }

      setSuccess(`Payment scheduled for ${executeDateTime.toLocaleString()}! (Demo - connect to devnet for real transactions)`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  return (
    <>
      <Head>
        <title>Create Payment - ChronoVault</title>
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
                <Link href="/create" className="text-white font-medium">
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

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Schedule a Payment</h1>
            <p className="text-gray-400 mt-2">
              Create a time-locked payment that will be automatically executed at your specified time.
            </p>
          </div>

          {!connected ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 text-center">
              <p className="text-gray-300 mb-6">Connect your wallet to create a scheduled payment</p>
              <WalletMultiButton />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana wallet address"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token
                  </label>
                  <select
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    defaultValue="usdc"
                  >
                    <option value="usdc">USDC</option>
                    <option value="sol">SOL</option>
                    <option value="usdt">USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.000001"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Execute Date
                    </label>
                    <input
                      type="date"
                      value={executeDate}
                      onChange={(e) => setExecuteDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Execute Time
                    </label>
                    <input
                      type="time"
                      value={executeTime}
                      onChange={(e) => setExecuteTime(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Fee Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-white">{amount || '0'} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Protocol Fee ({feePercentage}%)</span>
                    <span className="text-white">{calculatedFee} tokens</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-300">Recipient Receives</span>
                      <span className="text-primary-400">{recipientAmount} tokens</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Schedule Payment'}
              </button>
            </form>
          )}
        </main>
      </div>
    </>
  );
}
