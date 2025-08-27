// #![cfg(feature = "test-sbf")]
#![allow(deprecated)]

use anchor_lang::AccountDeserialize;
use anchor_lang::InstructionData;
use anchor_spl::{
    associated_token::{self, get_associated_token_address},
    token,
};
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    signature::Keypair,
    signer::Signer,
    system_program,
};
use solana_sdk::{message::Message, native_token::LAMPORTS_PER_SOL, transaction::Transaction};

use amm::{instruction::Initialize, Config};
use litesvm::LiteSVM;

mod helpers;
use helpers::*;

#[test]
pub fn test_initialize_amm() {
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

    let (_, mint_x_pubkey, _, mint_x_account) = build_token_mint_account(1 * LAMPORTS_PER_SOL, 6);
    svm.set_account(mint_x_pubkey, mint_x_account).unwrap();
    let (_, mint_y_pubkey, _, mint_y_account) = build_token_mint_account(1 * LAMPORTS_PER_SOL, 6);
    svm.set_account(mint_y_pubkey, mint_y_account).unwrap();

    let seed = 123456789u64;
    let initialize_ix = Initialize {
        seed,
        fee: 1000, // 1%
        authority: Some(authority),
    };

    let (config, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"config".as_slice(), seed.to_le_bytes().as_ref()],
        &program_id,
    );

    let (mint_lp, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"lp".as_slice(), &config.to_bytes()],
        &program_id,
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
            AccountMeta::new_readonly(system_program::ID, false),
        ],
        data: initialize_ix.data(),
    };

    let tx = Transaction::new(
        &[&initializer_keypair],
        Message::new(&[ix], Some(&initializer)),
        svm.latest_blockhash(),
    );
    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Transaction failed: {:?}", result);

    let config_account = svm.get_account(&config).unwrap();
    assert_eq!(config_account.owner, program_id);
    let config_data = Config::try_deserialize(&mut config_account.data.as_ref()).unwrap();
    assert_eq!(config_data.seed, seed);
    assert_eq!(config_data.fee, 1000);
    assert_eq!(config_data.authority, Some(authority));
    assert_eq!(config_data.mint_x, mint_x_pubkey);
    assert_eq!(config_data.mint_y, mint_y_pubkey);
}
