# Solana AMM React App

A React frontend for interacting with the Solana AMM (Automated Market Maker) program.

## Features

- 🔗 **Wallet Integration**: Connect with Phantom, Solflare, and Backpack wallets
- 💰 **Add Liquidity**: Deposit tokens to earn fees
- 🔄 **Swap Tokens**: Trade between Token X and Token Y
- 📊 **Real-time Balances**: View your balances and pool statistics
- ⚙️ **Slippage Control**: Adjust slippage tolerance for swaps

## Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Solana CLI** installed and configured
3. **Solana wallet** (Phantom, Solflare, or Backpack)
4. **Devnet SOL** in your wallet

### Step 1: Initial Setup

```bash
cd app
npm install
```

### Step 2: Initialize Accounts

This script creates test tokens (Token X and Token Y) and mints some to your wallet:

```bash
npm run init-accounts
```

**Note**: Make sure you have SOL in your wallet. If you need SOL on devnet:
```bash
solana airdrop 2 <your-wallet-address>
```

### Step 3: Initialize the AMM Program

This script initializes the AMM pools and creates the necessary program accounts:

```bash
npm run init-program
```

### Step 4: Start the React App

```bash
npm start
```

The app will open at `http://localhost:3000`

## How to Use

### 1. Connect Your Wallet
- Click the "Select Wallet" button in the top right
- Choose your preferred wallet (Phantom, Solflare, or Backpack)
- Approve the connection

### 2. Add Liquidity
- Click the "💰 Add Liquidity" tab
- Enter amounts for both Token X and Token Y
- Click "Add Liquidity"
- Approve the transaction in your wallet

### 3. Swap Tokens
- Click the "🔄 Swap" tab
- Enter the amount you want to swap
- Adjust slippage tolerance if needed (default: 5%)
- Use the ⇅ button to switch swap direction
- Click the swap button
- Approve the transaction in your wallet

## Configuration Files

After running the setup scripts, you'll find these files in the `app/` directory:

- `accounts.json`: Contains your token accounts and mint addresses
- `program-info.json`: Contains AMM program configuration

## Troubleshooting

### "Error loading program configuration"
- Make sure you've run the setup scripts in order
- Check that the AMM program is deployed correctly

### "Slippage exceeded"
- Try increasing slippage tolerance in the swap interface
- Reduce the swap amount
- Wait a moment and try again

### "Insufficient balance"
- Make sure you have enough tokens for the transaction
- Check your wallet balance in the app
- You may need to run `npm run init-accounts` again to get more test tokens

### Wallet Connection Issues
- Make sure your wallet extension is installed and unlocked
- Try refreshing the page
- Check that you're on the correct network (Devnet)

## Development

### File Structure

```
app/
├── src/
│   ├── components/
│   │   ├── AmmInterface.tsx      # Main interface component
│   │   ├── DepositComponent.tsx  # Add liquidity functionality
│   │   ├── SwapComponent.tsx     # Token swapping functionality
│   │   └── BalanceDisplay.tsx    # Balance and pool info display
│   ├── contexts/
│   │   └── WalletContextProvider.tsx # Solana wallet integration
│   ├── App.tsx                   # Main app component
│   └── index.tsx                 # App entry point
├── scripts/
│   ├── init-accounts.ts          # Token creation and setup
│   └── init-program.ts           # AMM program initialization
└── public/
    ├── amm.json                  # Program IDL
    └── index.html
```

### Customization

To customize the app:

1. **Change tokens**: Modify the mint creation in `scripts/init-accounts.ts`
2. **Adjust fees**: Change the fee parameter in `scripts/init-program.ts`
3. **UI styling**: Edit the CSS in `src/App.css`
4. **Add features**: Extend the components in `src/components/`

## Network Configuration

By default, the app connects to **Solana Devnet**. To change networks:

1. Edit `src/contexts/WalletContextProvider.tsx`
2. Change `WalletAdapterNetwork.Devnet` to your desired network
3. Update the RPC endpoint if needed

## Security Notes

⚠️ **This is a demo application for educational purposes**:

- Uses test tokens with no real value
- Runs on Solana Devnet
- Not audited for production use
- Private keys are managed by wallet extensions

For production deployment, ensure proper security audits and testing.

## Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Ensure your wallet is connected and has sufficient SOL
3. Verify that you've completed all setup steps
4. Try the troubleshooting steps above

## License

MIT License - feel free to modify and use for your own projects!
