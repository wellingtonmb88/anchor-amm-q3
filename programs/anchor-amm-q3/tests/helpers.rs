#![allow(dead_code)]
#![allow(deprecated)]

use solana_sdk::account::Account;
use solana_sdk::message::Message;
use solana_sdk::program_option::COption;
use solana_sdk::program_pack::Pack;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
use solana_sdk::rent::Rent;
use solana_sdk::{ instruction::{ AccountMeta, Instruction }, pubkey::Pubkey, system_instruction };
use solana_sdk::hash::Hash;

use spl_associated_token_account_client::address::get_associated_token_address;
use spl_associated_token_account_client::instruction::create_associated_token_account;
use spl_token::instruction::TokenInstruction;
use spl_token::{ ID as TOKEN_PROGRAM_ID, state::{ Mint as SPLMint } };

// Function to build a mock token mint with a specified supply and decimals
pub fn build_token_mint_account(
    supply: u64,
    decimals: u8
) -> (
    Pubkey, // Mint public key
    SPLMint, // Mint state
    Account, // Account data for the mint
) {
    let mint_rent = Rent::default().minimum_balance(SPLMint::LEN);
    let mint_keypair = Keypair::new();
    let mint = SPLMint {
        mint_authority: COption::None,
        supply,
        decimals,
        is_initialized: true,
        freeze_authority: COption::None,
    };

    let mut mint_b_bytes = [0u8; SPLMint::LEN];
    SPLMint::pack(mint, &mut mint_b_bytes).unwrap();
    (
        mint_keypair.pubkey(),
        mint,
        Account {
            lamports: mint_rent,
            data: mint_b_bytes.to_vec(),
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
}

// Function to create a transaction for initializing a mint and associated token account
pub fn create_mint_transaction(
    mint_authority: &Keypair,
    user: &Keypair,
    amount: u64,
    latest_blockhash: Hash
) -> (
    Transaction, // Transaction to initialize the mint and associated token account
    Pubkey, // Mint public key
    Pubkey, // Associated token account public key
) {
    let mint_keypair = Keypair::new();
    let mint_pubkey = mint_keypair.pubkey();

    let mint_rent = Rent::default().minimum_balance(SPLMint::LEN);

    let create_account_ix = system_instruction::create_account(
        &mint_authority.pubkey(),
        &mint_pubkey,
        mint_rent,
        SPLMint::LEN as u64,
        &TOKEN_PROGRAM_ID
    );

    let data = (TokenInstruction::InitializeMint {
        decimals: 6,
        mint_authority: mint_authority.pubkey(),
        freeze_authority: COption::None,
    }).pack();

    let initialize_mint_ix = Instruction::new_with_bytes(
        TOKEN_PROGRAM_ID,
        &data,
        vec![
            AccountMeta::new(mint_pubkey, true),
            AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false)
        ]
    );

    let ata = get_associated_token_address(&user.pubkey(), &mint_pubkey);

    let create_ata_ix = create_associated_token_account(
        &user.pubkey(),
        &user.pubkey(),
        &mint_pubkey,
        &TOKEN_PROGRAM_ID
    );
    // let create_ata_ix = Instruction::new_with_bytes(
    //     Pubkey::new_from_array(ATA_PROGRAM_ID),
    //     &[],
    //     vec![
    //         AccountMeta::new(user.pubkey(), true),
    //         AccountMeta::new(token_account, false),
    //         AccountMeta::new_readonly(user.pubkey(), false),
    //         AccountMeta::new_readonly(mint_pubkey, false),
    //         AccountMeta::new_readonly(system_program::ID, false),
    //         AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
    //         AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false)
    //     ]
    // );
    let ser_mint_to_ix = (TokenInstruction::MintTo {
        amount: amount,
    }).pack();
    let mint_to_ix = Instruction::new_with_bytes(
        TOKEN_PROGRAM_ID,
        &ser_mint_to_ix,
        vec![
            AccountMeta::new(mint_pubkey, false),
            AccountMeta::new(ata, false),
            AccountMeta::new_readonly(mint_authority.pubkey(), true)
        ]
    );

    let tx = Transaction::new(
        &[&mint_authority, &mint_keypair, &user],
        Message::new(
            &[create_account_ix, initialize_mint_ix, create_ata_ix, mint_to_ix],
            Some(&mint_authority.pubkey())
        ),
        latest_blockhash
    );
    (tx, mint_pubkey, ata)
}
