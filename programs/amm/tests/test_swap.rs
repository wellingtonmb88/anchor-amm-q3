// #![cfg(feature = "test-sbf")]
#![allow(deprecated)]

use solana_sdk::{
    message::Message,
    native_token::LAMPORTS_PER_SOL,
    program_option::COption,
    program_pack::Pack,
    transaction::Transaction,
};
use anchor_lang::{ InstructionData };
use anchor_spl::{ associated_token::{ self, get_associated_token_address }, token::{ self } };
use solana_sdk::{
    instruction::{ AccountMeta, Instruction },
    signature::Keypair,
    signer::Signer,
    system_program,
};
use spl_token::{ state::{ Account as SPLTokenAccount, Mint as SPLMint } };

use litesvm::LiteSVM;
use amm::instruction::{ Deposit, Initialize, Swap };

mod helpers;
use helpers::*;

#[test]
fn test_swap() {
    let program_id = amm::id();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/amm.so");
    svm.add_program(program_id, bytes);

    let authority_keypair = Keypair::new();
    let authority = authority_keypair.pubkey();
    svm.airdrop(&authority, 100 * LAMPORTS_PER_SOL).unwrap();

    let initializer_keypair = Keypair::new();
    let initializer = initializer_keypair.pubkey();
    svm.airdrop(&initializer, 100 * LAMPORTS_PER_SOL).unwrap();

    let (mint_x_keypair, mint_x_pubkey, _, mint_x_account) = build_token_mint_account(
        1 * LAMPORTS_PER_SOL,
        6
    );
    svm.set_account(mint_x_pubkey, mint_x_account).unwrap();
    let (mint_y_keypair, mint_y_pubkey, _, mint_y_account) = build_token_mint_account(
        1 * LAMPORTS_PER_SOL,
        6
    );
    svm.set_account(mint_y_pubkey, mint_y_account).unwrap();

    let seed = 123456789u64;
    let initialize_ix = Initialize {
        seed,
        fee: 1000, // 1%
        authority: Some(authority),
    };

    let (config, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"config".as_slice(), seed.to_le_bytes().as_ref()],
        &program_id
    );

    let (mint_lp, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"lp".as_slice(), &config.to_bytes()],
        &program_id
    );

    let vault_x = get_associated_token_address(&config, &mint_x_pubkey);
    let vault_y = get_associated_token_address(&config, &mint_y_pubkey);

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(initializer, true),
            AccountMeta::new_readonly(mint_x_pubkey, false),
            AccountMeta::new_readonly(mint_y_pubkey, false),
            AccountMeta::new(mint_lp, false),
            AccountMeta::new(config, false),
            AccountMeta::new(vault_x, false),
            AccountMeta::new(vault_y, false),
            AccountMeta::new_readonly(token::ID, false),
            AccountMeta::new_readonly(associated_token::ID, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ],
        data: initialize_ix.data(),
    };

    let tx = Transaction::new(
        &[&initializer_keypair],
        Message::new(&[ix], Some(&initializer)),
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Initialize Instruction Transaction failed: {:?}", result);

    let depositer_keypair = Keypair::new();
    let depositer = depositer_keypair.pubkey();
    svm.airdrop(&depositer, 100 * LAMPORTS_PER_SOL).unwrap();
    svm.airdrop(&mint_x_keypair.pubkey(), 100 * LAMPORTS_PER_SOL).unwrap();

    // Mint token x to user
    let (mint_x_to_tx, mint_user_x) = create_mint_to_transaction(
        &mint_x_keypair,
        &mint_x_pubkey,
        &depositer_keypair,
        1000 * LAMPORTS_PER_SOL, // 1000 tokens
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(mint_x_to_tx);
    assert!(result.is_ok(), "Mint X Transaction failed: {:?}", result);

    let (mint_y_to_tx, mint_user_y) = create_mint_to_transaction(
        &mint_y_keypair,
        &mint_y_pubkey,
        &depositer_keypair,
        1000 * LAMPORTS_PER_SOL, // 1000 tokens
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(mint_y_to_tx);
    assert!(result.is_ok(), "Mint Y Transaction failed: {:?}", result);

    let mint_user_lp = get_associated_token_address(&depositer, &mint_lp);

    let deposit_ix = Deposit {
        amount: 1000, // Amount of LP tokens to mint
        max_x: 30 * LAMPORTS_PER_SOL, // 1000 tokensMax amount of X tokens to deposit
        max_y: 30 * LAMPORTS_PER_SOL, // 1000 tokensMax amount of Y tokens to deposit
    };

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(depositer, true),
            AccountMeta::new_readonly(mint_x_pubkey, false),
            AccountMeta::new_readonly(mint_y_pubkey, false),
            AccountMeta::new(mint_lp, false),
            AccountMeta::new_readonly(config, false),
            AccountMeta::new(vault_x, false),
            AccountMeta::new(vault_y, false),
            AccountMeta::new(mint_user_x, false),
            AccountMeta::new(mint_user_y, false),
            AccountMeta::new(mint_user_lp, false),
            AccountMeta::new_readonly(token::ID, false),
            AccountMeta::new_readonly(associated_token::ID, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ],
        data: deposit_ix.data(),
    };

    let tx = Transaction::new(
        &[&depositer_keypair],
        Message::new(&[ix], Some(&depositer)),
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Deposit Instruction Transaction failed: {:?}", result);

    let deposit_ix = Swap {
        x_to_y: true,
        amount_in: 30 * LAMPORTS_PER_SOL,
        slippage: 5_000, // 50% slippage
    };

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(depositer, true),
            AccountMeta::new_readonly(mint_x_pubkey, false),
            AccountMeta::new_readonly(mint_y_pubkey, false),
            AccountMeta::new_readonly(config, false),
            AccountMeta::new(vault_x, false),
            AccountMeta::new(vault_y, false),
            AccountMeta::new(mint_user_x, false),
            AccountMeta::new(mint_user_y, false),
            AccountMeta::new_readonly(token::ID, false),
            AccountMeta::new_readonly(associated_token::ID, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ],
        data: deposit_ix.data(),
    };

    let tx = Transaction::new(
        &[&depositer_keypair],
        Message::new(&[ix], Some(&depositer)),
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Swap Instruction Transaction failed: {:?}", result);

    let mint_user_x_info = svm.get_account(&mint_user_x).unwrap();
    let mint_user_x_data = SPLTokenAccount::unpack(&mint_user_x_info.data).unwrap();
    assert_eq!(mint_user_x_data.owner, depositer);
    assert_eq!(mint_user_x_data.mint, mint_x_pubkey);
    assert_eq!(mint_user_x_data.amount, 940 * LAMPORTS_PER_SOL);

    let mint_user_y_info = svm.get_account(&mint_user_y).unwrap();
    let mint_user_y_data = SPLTokenAccount::unpack(&mint_user_y_info.data).unwrap();
    assert_eq!(mint_user_y_data.owner, depositer);
    assert_eq!(mint_user_y_data.mint, mint_y_pubkey);
    assert_eq!(mint_user_y_data.amount, 984210526316);

    let mint_user_lp_info = svm.get_account(&mint_user_lp).unwrap();
    let mint_user_lp_data = SPLTokenAccount::unpack(&mint_user_lp_info.data).unwrap();
    assert_eq!(mint_user_lp_data.owner, depositer);
    assert_eq!(mint_user_lp_data.mint, mint_lp);
    assert_eq!(mint_user_lp_data.amount, 1000);

    // Check the vaults
    let vault_x_info = svm.get_account(&vault_x).unwrap();
    let vault_x_data = SPLTokenAccount::unpack(&vault_x_info.data).unwrap();
    assert_eq!(vault_x_data.owner, config);
    assert_eq!(vault_x_data.mint, mint_x_pubkey);
    assert_eq!(vault_x_data.amount, 60 * LAMPORTS_PER_SOL);

    let vault_y_info = svm.get_account(&vault_y).unwrap();
    let vault_y_data = SPLTokenAccount::unpack(&vault_y_info.data).unwrap();
    assert_eq!(vault_y_data.owner, config);
    assert_eq!(vault_y_data.mint, mint_y_pubkey);
    assert_eq!(vault_y_data.amount, 15789473684);

    let mint_lp_info = svm.get_account(&mint_lp).unwrap();
    let mint_lp_data = SPLMint::unpack(&mint_lp_info.data).unwrap();
    assert_eq!(mint_lp_data.mint_authority, COption::Some(config));
    assert_eq!(mint_lp_data.is_initialized, true);
    assert_eq!(mint_lp_data.supply, 1000);
}
