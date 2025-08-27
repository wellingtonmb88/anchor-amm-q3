'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { DepositComponent } from './DepositComponent';
import { SwapComponent } from './SwapComponent';
import { BalanceDisplay } from './BalanceDisplay';

type TabType = 'deposit' | 'swap';

export const AmmInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4">Welcome to Solana AMM</h2>
        <p className="text-center mb-6">Please connect your wallet to start trading</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg text-black">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AMM Interface</h2>
        <WalletMultiButton />
      </div>

      <BalanceDisplay />

      <div className="flex mb-6 border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === 'deposit'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : ' hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('deposit')}
        >
          💰 Add Liquidity
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === 'swap'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : ' hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('swap')}
        >
          🔄 Swap
        </button>
      </div>

      {activeTab === 'deposit' ? <DepositComponent /> : <SwapComponent />}
    </div>
  );
};
