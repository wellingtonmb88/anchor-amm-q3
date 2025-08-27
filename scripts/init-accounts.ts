import { Connection, Keypair } from "@solana/web3.js";
import {
  createMint,
  mintTo,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";

async function initializeAccounts() {
  // Connect to devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet keypair from file (you'll need to create this)
  // const keypairPath =
  //   process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;
  const keypairPath =
    process.env.KEYPAIR_PATH || `./wallet/keypair.json`;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("Payer:", payer.publicKey.toString());

  // Get initial balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.log("Low balance! Please airdrop some SOL to your wallet:");
    console.log(`solana airdrop 2 ${payer.publicKey.toString()}`);
    return;
  }

  // Create mint X (e.g., USDC)
  console.log("Creating Mint X...");
  const mintXKeypair = Keypair.generate();
  const mintX = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6, // 6 decimals
    mintXKeypair
  );
  console.log("Mint X:", mintX.toString());

  // Create mint Y (e.g., SOL token)
  console.log("Creating Mint Y...");
  const mintYKeypair = Keypair.generate();
  const mintY = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6, // 6 decimals
    mintYKeypair
  );
  console.log("Mint Y:", mintY.toString());

  // Create user token accounts
  console.log("Creating user token accounts...");
  const userX = await getAssociatedTokenAddress(mintX, payer.publicKey);
  const userY = await getAssociatedTokenAddress(mintY, payer.publicKey);

  await createAssociatedTokenAccount(connection, payer, mintX, payer.publicKey);
  await createAssociatedTokenAccount(connection, payer, mintY, payer.publicKey);

  console.log("User X token account:", userX.toString());
  console.log("User Y token account:", userY.toString());

  // Mint some tokens to user
  console.log("Minting tokens to user...");
  await mintTo(
    connection,
    payer,
    mintX,
    userX,
    payer,
    10000000 * 10 ** 6 // 1000 tokens with 6 decimals
  );

  await mintTo(
    connection,
    payer,
    mintY,
    userY,
    payer,
    10000000 * 10 ** 6 // 1000 tokens with 6 decimals
  );

  // Save account info to file
  const accountInfo = {
    payer: payer.publicKey.toString(),
    mintX: mintX.toString(),
    mintY: mintY.toString(),
    mintXKeypair: Array.from(mintXKeypair.secretKey),
    mintYKeypair: Array.from(mintYKeypair.secretKey),
    userX: userX.toString(),
    userY: userY.toString(),
  };

  fs.writeFileSync("./accounts.json", JSON.stringify(accountInfo, null, 2));
  console.log("Account info saved to accounts.json");

  console.log("\n✅ Accounts initialized successfully!");
  console.log(
    "Next step: Run 'npm run init-program' to initialize the AMM program"
  );
}

initializeAccounts().catch(console.error);
