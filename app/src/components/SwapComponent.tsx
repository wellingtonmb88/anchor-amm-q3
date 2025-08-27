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
}

export const SwapComponent: React.FC = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amountIn, setAmountIn] = useState('');
  const [isXtoY, setIsXtoY] = useState(true);
  const [slippage, setSlippage] = useState(500); // 5% default
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

  const handleSwap = async () => {
    if (!publicKey || !program || !programInfo) {
      setMessage('Please connect your wallet');
      setMessageType('error');
      return;
    }

    if (!amountIn) {
      setMessage('Please enter an amount');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const mintX = new PublicKey(programInfo.mintX);
      const mintY = new PublicKey(programInfo.mintY);
      const configPda = new PublicKey(programInfo.configPda);
      const vaultX = new PublicKey(programInfo.vaultX);
      const vaultY = new PublicKey(programInfo.vaultY);

      // Get user token accounts
      const userX = await getAssociatedTokenAddress(mintX, publicKey);
      const userY = await getAssociatedTokenAddress(mintY, publicKey);

      // Convert amount to the proper format (6 decimals)
      const amountInBN = new BN(parseFloat(amountIn) * 10 ** 6);

      console.log('Swapping:', {
        direction: isXtoY ? 'X to Y' : 'Y to X',
        amount: amountIn,
        amountBN: amountInBN.toString(),
        slippage: slippage,
      });

      const instruction = await program.methods
        .swap(isXtoY, amountInBN, slippage)
        .accountsPartial({
          user: publicKey,
          mintX: mintX,
          mintY: mintY,
          config: configPda,
          vaultX: vaultX,
          vaultY: vaultY,
          userX: userX,
          userY: userY,
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

      setMessage(`Swap successful! Transaction: ${txid.slice(0, 8)}...`);
      setMessageType('success');
      setAmountIn('');

    } catch (error: unknown) {
      console.error('Swap failed:', error);
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.message.includes('SlippageExceeded')) {
          errorMessage = 'Slippage exceeded! Try increasing slippage tolerance or reducing swap amount.';
        } else if (error.message.includes('InsufficientBalance')) {
          errorMessage = 'Insufficient balance for this swap.';
        } else if (error.message.includes('InvalidAmount')) {
          errorMessage = 'Invalid swap amount.';
        } else {
          errorMessage = error.message;
        }
      }

      setMessage(`Swap failed: ${errorMessage}`);
      setMessageType('error');
    }

    setIsLoading(false);
  };

  const switchDirection = () => {
    setIsXtoY(!isXtoY);
    setAmountIn('');
  };

  if (!publicKey) {
    return (
      <div className="text-center p-6">
        <p className="text-black">Please connect your wallet to swap tokens</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">🔄 Swap Tokens</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${messageType === 'success'
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
          {message}
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Slippage Tolerance:
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            value={slippage / 100}
            onChange={(e) => setSlippage(Number(e.target.value) * 100)}
            min="0.1"
            max="50"
            step="0.1"
            disabled={isLoading}
          />
          <span className="text-sm text-black">%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From: {isXtoY ? 'Token X' : 'Token Y'}
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={switchDirection}
            disabled={isLoading}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          >
            <div className="text-2xl">⇅</div>
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To: {isXtoY ? 'Token Y' : 'Token X'}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="Output amount"
            disabled
          />
        </div>

        <button
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${isLoading || !amountIn
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          onClick={handleSwap}
          disabled={isLoading || !amountIn}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Swapping...
            </div>
          ) : (
            `Swap ${isXtoY ? 'X → Y' : 'Y → X'}`
          )}
        </button>

        <p className="text-sm text-black text-center">
          💡 Tip: {isXtoY
            ? 'Trading X tokens for Y tokens'
            : 'Trading Y tokens for X tokens'}
          . Higher slippage = more likely to succeed but less favorable rate.
        </p>
      </div>
    </div>
  );
};
