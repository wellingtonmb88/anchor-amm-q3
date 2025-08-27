import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as fs from "fs";

// Import the IDL directly instead of using ES module import
const ammIdl = JSON.parse(fs.readFileSync("../target/idl/amm.json", "utf8"));

async function initializeProgram() {
  try {
    // Connect to devnet
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );

    // Load wallet keypair
    // const keypairPath =
    //   process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

    const keypairPath = process.env.KEYPAIR_PATH || `./wallet/keypair.json`;
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Load account info
    if (!fs.existsSync("./accounts.json")) {
      console.log(
        "❌ accounts.json not found. Please run 'npm run init-accounts' first"
      );
      return;
    }

    const accountInfo = JSON.parse(fs.readFileSync("./accounts.json", "utf8"));
    const mintX = new PublicKey(accountInfo.mintX);
    const mintY = new PublicKey(accountInfo.mintY);

    // Setup Anchor
    const wallet = new anchor.Wallet(payer);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const program = new anchor.Program(ammIdl, provider) as anchor.Program<any>;
    const programId = new PublicKey(ammIdl.address);

    console.log("Program ID:", programId.toString());
    console.log("Mint X:", mintX.toString());
    console.log("Mint Y:", mintY.toString());

    // AMM parameters
    const seed = new BN(new Date().getTime());
    const fee = 300; // 3% fee
    const authority = payer.publicKey; // Use payer as authority

    // Derive PDA for config
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)],
      programId
    );

    // Derive PDA for LP mint
    const [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPda.toBuffer()],
      programId
    );

    // Derive PDA for vaults (these are associated token accounts)
    const vaultX = await getAssociatedTokenAddress(mintX, configPda, true);
    const vaultY = await getAssociatedTokenAddress(mintY, configPda, true);

    console.log("Config PDA:", configPda.toString());
    console.log("LP Mint:", lpMint.toString());
    console.log("Vault X:", vaultX.toString());
    console.log("Vault Y:", vaultY.toString());

    // Check if already initialized
    try {
      const configAccount = await (program.account as any).config.fetch(
        configPda
      );
      console.log("⚠️ AMM already initialized with this configuration");
      console.log("Config:", {
        seed: configAccount.seed.toString(),
        authority: configAccount?.authority?.toString(),
        mintX: configAccount.mintX.toString(),
        mintY: configAccount.mintY.toString(),
        fee: configAccount.fee,
      });

      // Save program info anyway for the React app
      const programInfo = {
        ...accountInfo,
        programId: programId.toString(),
        configPda: configPda.toString(),
        lpMint: lpMint.toString(),
        vaultX: vaultX.toString(),
        vaultY: vaultY.toString(),
        seed: seed.toString(),
        fee: fee,
        authority: authority.toString(),
      };

      fs.writeFileSync(
        "./program-info.json",
        JSON.stringify(programInfo, null, 2)
      );
      console.log("Program info updated in program-info.json");
      return;
    } catch (error) {
      // Config doesn't exist, proceed with initialization
      console.log("Initializing new AMM...");
    }

    // Initialize the AMM
    console.log("Sending initialize transaction...");
    const tx = await program.methods
      .initialize(seed, fee, authority)
      .accountsPartial({
        config: configPda,
        mintX: mintX,
        mintY: mintY,
        vaultX: vaultX,
        vaultY: vaultY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ AMM initialized successfully!");
    console.log("Transaction signature:", tx);

    // Save program info for React app
    const programInfo = {
      ...accountInfo,
      programId: programId.toString(),
      configPda: configPda.toString(),
      lpMint: lpMint.toString(),
      vaultX: vaultX.toString(),
      vaultY: vaultY.toString(),
      seed: seed.toString(),
      fee: fee,
      authority: authority.toString(),
    };

    fs.writeFileSync(
      "./program-info.json",
      JSON.stringify(programInfo, null, 2)
    );
    console.log("Program info saved to program-info.json");

    console.log("\n🎉 Setup complete!");
    console.log("You can now start the React app with 'npm start'");
  } catch (error) {
    console.error("❌ Error initializing program:", error);
  }
}

initializeProgram().catch(console.error);
