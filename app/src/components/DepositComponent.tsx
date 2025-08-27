'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';

interface ProgramInfo {
  programId: string;
  configPda: string;
  mintX: string;
  mintY: string;
  vaultX: string;
  vaultY: string;
  lpMint: string;
}

export const DepositComponent: React.FC = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amountX, setAmountX] = useState('');
  const [amountY, setAmountY] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [program, setProgram] = useState<anchor.Program | null>(null);

  useEffect(() => {
    const loadProgramInfo = async () => {
      try {
        const response = await fetch('/program-info.json');
        const info = await response.json();
        setProgramInfo(info);

        // Load IDL and setup program
        const idlResponse = await fetch('/amm.json');
        const idl = await idlResponse.json();

        // Create a dummy wallet for the provider
        const wallet = {
          publicKey: publicKey,
          signTransaction: async (tx: anchor.web3.Transaction) => tx,
          signAllTransactions: async (txs: anchor.web3.Transaction[]) => txs,
        };

        const provider = new anchor.AnchorProvider(
          connection,
          wallet as anchor.Wallet,
          { commitment: 'confirmed' }
        );

        const prog = new anchor.Program(idl, provider);
        setProgram(prog);
      } catch (error) {
        console.error('Error loading program info:', error);
        setMessage('Error loading program configuration');
        setMessageType('error');
      }
    };

    if (publicKey) {
      loadProgramInfo();
    }
  }, [connection, publicKey]);

  const handleDeposit = async () => {
    if (!publicKey || !program || !programInfo) {
      setMessage('Please connect your wallet');
      setMessageType('error');
      return;
    }

    if (!amountX || !amountY) {
      setMessage('Please enter both amounts');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const mintX = new PublicKey(programInfo.mintX);
      const mintY = new PublicKey(programInfo.mintY);
      const configPda = new PublicKey(programInfo.configPda);
      const lpMint = new PublicKey(programInfo.lpMint);
      const vaultX = new PublicKey(programInfo.vaultX);
      const vaultY = new PublicKey(programInfo.vaultY);

      // Get user token accounts
      const userX = await getAssociatedTokenAddress(mintX, publicKey);
      const userY = await getAssociatedTokenAddress(mintY, publicKey);
      const userLp = await getAssociatedTokenAddress(lpMint, publicKey);

      // Check if user token accounts exist
      try {
        const userXAccountInfo = await connection.getAccountInfo(userX);
        const userYAccountInfo = await connection.getAccountInfo(userY);

        if (!userXAccountInfo) {
          throw new Error(`User doesn't have Token X account. Please create an associated token account for ${mintX.toString()}`);
        }
        if (!userYAccountInfo) {
          throw new Error(`User doesn't have Token Y account. Please create an associated token account for ${mintY.toString()}`);
        }

        console.log('Account checks passed');
      } catch (accountError) {
        console.error('Account check failed:', accountError);
        throw accountError;
      }

      // Convert amounts to the proper format (6 decimals)
      const maxXBN = new BN(parseFloat(amountX) * 10 ** 6);
      const maxYBN = new BN(parseFloat(amountY) * 10 ** 6);


      // For LP token amount, we'll use a reasonable estimate
      // In a constant product AMM, LP tokens are typically calculated as sqrt(x * y)
      // For simplicity, we'll use the minimum of the two amounts as LP amount
      // const lpAmount = BN.min(maxXBN, maxYBN);
      const lpAmount = new anchor.BN(100000000); // 100 LP tokens

      console.log('Depositing:', {
        mintX: mintX.toBase58(),
        mintY: mintY.toBase58(),
        configPda: configPda.toBase58(),
        lpMint: lpMint.toBase58(),
        vaultX: vaultX.toBase58(),
        vaultY: vaultY.toBase58(),
        amountX: amountX,
        amountY: amountY,
        maxXBN: maxXBN.toString(),
        maxYBN: maxYBN.toString(),
        lpAmount: lpAmount.toString(),
      });

      const instruction = await program.methods
        .deposit(lpAmount, maxXBN, maxYBN) // (lp_amount, max_x, max_y)
        .accountsPartial({
          user: publicKey,
          mintX: mintX,
          mintY: mintY,
          mintLp: lpMint,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: userX,
          userY: userY,
          userLp: userLp,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const transaction = new anchor.web3.Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const txid = await sendTransaction(transaction, connection);

      setMessage(`Deposit successful! Transaction: ${txid.slice(0, 8)}...`);
      setMessageType('success');
      setAmountX('');
      setAmountY('');

    } catch (error: unknown) {
      console.error('Deposit failed:', error);

      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Check if it's an anchor error with logs
      if (error && typeof error === 'object' && 'logs' in error) {
        console.error('Transaction logs:', error.logs);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Deposit failed: ${errorMessage}`);
      setMessageType('error');
    }

    setIsLoading(false);
  };

  if (!publicKey) {
    return (
      <div className="text-center p-6">
        <p className="text-black">Please connect your wallet to add liquidity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">💰 Add Liquidity</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${messageType === 'success'
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token X Amount:
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0"
            value={amountX}
            onChange={(e) => setAmountX(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Y Amount:
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0"
            value={amountY}
            onChange={(e) => setAmountY(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${isLoading || !amountX || !amountY
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          onClick={handleDeposit}
          disabled={isLoading || !amountX || !amountY}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding Liquidity...
            </div>
          ) : (
            'Add Liquidity'
          )}
        </button>

        <p className="text-sm text-black text-center">
          💡 Tip: You&apos;ll receive LP tokens representing your share of the pool.
        </p>
      </div>
    </div>
  );
};
