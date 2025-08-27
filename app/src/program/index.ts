// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import type { Amm } from "./amm";

// Import the IDL as a plain object
import AmmIDL from "./amm.json";

// The programId is imported from the program IDL.
export const getProgramId = () => {
  return new PublicKey(AmmIDL.address);
};

// This is a helper function to get the Anchor program.
export const getProgram = (
  provider: AnchorProvider,
  address?: PublicKey
): Program<Amm> => {
  return new Program(
    {
      ...AmmIDL,
      address: address ? address.toBase58() : AmmIDL.address,
    } as Amm,
    provider
  );
};
