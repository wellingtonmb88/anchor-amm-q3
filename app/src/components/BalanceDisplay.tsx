'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

interface ProgramInfo {
  mintX: string;
  mintY: string;
  vaultX: string;
  vaultY: string;
  lpMint: string;
}

export const BalanceDisplay: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balances, setBalances] = useState({
    userX: 0,
    userY: 0,
    userLP: 0,
    vaultX: 0,
    vaultY: 0,
    sol: 0,
  });
  const [loading, setLoading] = useState(true);
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);

  useEffect(() => {
    // Load program info
    const loadProgramInfo = async () => {
      try {
        const response = await fetch('/program-info.json');
        const info = await response.json();
        setProgramInfo(info);
      } catch (error) {
        console.error('Error loading program info:', error);
      }
    };
    loadProgramInfo();
  }, []);

  useEffect(() => {
    if (!publicKey || !programInfo) return;

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const mintX = new PublicKey(programInfo.mintX);
        const mintY = new PublicKey(programInfo.mintY);
        const lpMint = new PublicKey(programInfo.lpMint);
        const vaultX = new PublicKey(programInfo.vaultX);
        const vaultY = new PublicKey(programInfo.vaultY);

        // Get user token accounts
        const userXAddress = await getAssociatedTokenAddress(mintX, publicKey);
        const userYAddress = await getAssociatedTokenAddress(mintY, publicKey);
        const userLPAddress = await getAssociatedTokenAddress(lpMint, publicKey);

        // Get balances
        const [userXAccount, userYAccount, userLPAccount, vaultXAccount, vaultYAccount, solBalance] = await Promise.all([
          getAccount(connection, userXAddress).catch(() => ({ amount: BigInt(0) })),
          getAccount(connection, userYAddress).catch(() => ({ amount: BigInt(0) })),
          getAccount(connection, userLPAddress).catch(() => ({ amount: BigInt(0) })),
          getAccount(connection, vaultX).catch(() => ({ amount: BigInt(0) })),
          getAccount(connection, vaultY).catch(() => ({ amount: BigInt(0) })),
          connection.getBalance(publicKey),
        ]);

        setBalances({
          userX: Number(userXAccount.amount) / 10 ** 6,
          userY: Number(userYAccount.amount) / 10 ** 6,
          userLP: Number(userLPAccount.amount) / 10 ** 6,
          vaultX: Number(vaultXAccount.amount) / 10 ** 6,
          vaultY: Number(vaultYAccount.amount) / 10 ** 6,
          sol: solBalance / anchor.web3.LAMPORTS_PER_SOL,
        });
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
      setLoading(false);
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [publicKey, connection, programInfo]);

  if (!publicKey || !programInfo) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6 text-black">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-amber-800">
        💰 Balances
        {loading && (
          <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
        )}
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm text-black">
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Your Token X:</span>
          <span className="font-medium">{balances.userX.toFixed(6)}</span>
        </div>
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Your Token Y:</span>
          <span className="font-medium">{balances.userY.toFixed(6)}</span>
        </div>
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Your LP Tokens:</span>
          <span className="font-medium">{balances.userLP.toFixed(6)}</span>
        </div>
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Your SOL:</span>
          <span className="font-medium">{balances.sol.toFixed(4)}</span>
        </div>
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Pool X:</span>
          <span className="font-medium">{balances.vaultX.toFixed(6)}</span>
        </div>
        <div className="flex justify-between p-2 bg-white rounded">
          <span className="text-black">Pool Y:</span>
          <span className="font-medium">{balances.vaultY.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
};
