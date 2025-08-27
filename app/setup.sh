#!/bin/bash

echo "🚀 Setting up Solana AMM React App..."
echo

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install it first:"
    echo "   https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

RPC_URL=devnet

# Check if we're on devnet
CURRENT_CLUSTER=$(solana config get | grep "RPC URL" | cut -d':' -f2- | xargs)
if [[ $CURRENT_CLUSTER != *"devnet"* ]]; then
    # echo "⚠️  You're not on devnet. Switching to devnet..."
    solana config set --url $RPC_URL
fi

# Check wallet balance
WALLET_ADDRESS=$(solana address)
BALANCE=$(solana balance --url $RPC_URL)

echo "📍 Current cluster: devnet"
echo "💳 Wallet address: $WALLET_ADDRESS"
echo "💰 Balance: $BALANCE"

if [[ $BALANCE == "0 SOL" ]]; then
    echo "💡 You need SOL to run the setup. Requesting airdrop..."
    solana airdrop 2 --url $RPC_URL
    echo "   Waiting for confirmation..."
    sleep 3
fi

echo
echo "✅ Environment check complete!"
echo
echo "Next steps:"
echo "1. Run: npm run init-accounts"
echo "2. Run: npm run init-program"  
echo "3. Run: npm start"
echo
echo "📚 See README.md for detailed instructions."
