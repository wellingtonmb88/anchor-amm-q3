// #![cfg(feature = "test-sbf")]
#![allow(deprecated)]

use anchor_amm_q3::{ instruction, states::Config };
use anchor_lang::{ prelude::*, solana_program::rent::Rent, InstructionData };
use anchor_spl::{ associated_token, token };
use mollusk_svm::Mollusk;
use mollusk_svm_programs_token::{ self };
use solana_sdk::{
    account::Account,
    instruction::{ AccountMeta, Instruction },
    program_pack::Pack,
    pubkey::Pubkey,
    system_program,
};

#[test]
fn test_initialize_amm() {
    let program_id = anchor_amm_q3::id();
    let mut mollusk = Mollusk::new(&program_id, "anchor_amm_q3");
    mollusk_svm_programs_token::token::add_program(&mut mollusk);
    mollusk_svm_programs_token::associated_token::add_program(&mut mollusk);
    let (system_program_id, system_account) =
        mollusk_svm::program::keyed_account_for_system_program();
    let (token_program_id, token_program_account) =
        mollusk_svm_programs_token::token::keyed_account();
    let (associated_token_program_id, associated_token_program_account) =
        mollusk_svm_programs_token::associated_token::keyed_account();

    // Test parameters
    let seed = 12345u64;
    let fee = 500u16; // 0.5%
    let authority: Option<Pubkey> = None;

    // Generate keypairs
    let initializer = Pubkey::new_unique();

    // Create mints
    let mint_x = Pubkey::new_unique();
    let mint_y = Pubkey::new_unique();
    
    // Initialize mint data manually
    let mint_x_data = {
        let mut data = vec![0; 82];
        let mint = anchor_spl::token::spl_token::state::Mint {
            mint_authority: Some(initializer).into(),
            supply: 0,
            decimals: 6,
            is_initialized: true,
            freeze_authority: None.into(),
        };
        anchor_spl::token::spl_token::state::Mint::pack(mint, &mut data).unwrap();
        data
    };
    
    let mint_y_data = {
        let mut data = vec![0; 82];
        let mint = anchor_spl::token::spl_token::state::Mint {
            mint_authority: Some(initializer).into(),
            supply: 0,
            decimals: 6,
            is_initialized: true,
            freeze_authority: None.into(),
        };
        anchor_spl::token::spl_token::state::Mint::pack(mint, &mut data).unwrap();
        data
    };
    
    let mint_x_account = Account {
        lamports: Rent::default().minimum_balance(82),
        data: mint_x_data,
        owner: token::ID,
        executable: false,
        rent_epoch: 0,
    };
    let mint_y_account = Account {
        lamports: Rent::default().minimum_balance(82),
        data: mint_y_data,
        owner: token::ID,
        executable: false,
        rent_epoch: 0,
    };

    // Derive PDAs
    let (config, _config_bump) = Pubkey::find_program_address(
        &[b"config", &seed.to_le_bytes()],
        &program_id
    );
    let (mint_lp, _mint_lp_bump) = Pubkey::find_program_address(
        &[b"lp", config.as_ref()],
        &program_id
    );
    let vault_x = associated_token::get_associated_token_address(&config, &mint_x);
    let vault_y = associated_token::get_associated_token_address(&config, &mint_y);

    // Create instruction
    let instruction = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new(initializer, true),
            AccountMeta::new_readonly(mint_x, false),
            AccountMeta::new_readonly(mint_y, false),
            AccountMeta::new(mint_lp, false),
            AccountMeta::new(config, false),
            AccountMeta::new(vault_x, false),
            AccountMeta::new(vault_y, false),
            AccountMeta::new_readonly(token::ID, false),
            AccountMeta::new_readonly(associated_token::ID, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ],
        data: (instruction::Initialize {
            seed,
            fee,
            authority,
        }).data(),
    };

    // Setup accounts
    let initializer_account = Account {
        lamports: Rent::default().minimum_balance(0) * 100, // Provide ample lamports for account creation
        ..Default::default()
    };

    let accounts = &vec![
        (initializer, initializer_account),
        (mint_x, mint_x_account),
        (mint_y, mint_y_account),
        // The following accounts are created by the instruction
        (config, Account::default()),
        (mint_lp, Account::default()),
        (vault_x, Account::default()),
        (vault_y, Account::default()),
        // Programs
        (system_program_id, system_account),
        (token_program_id, token_program_account),
        (associated_token_program_id, associated_token_program_account)
    ];

    let result = mollusk.process_instruction(&instruction, accounts);

    // Verify success
    assert!(
        !result.program_result.is_err(),
        "Initialize should succeed. Error: {:?}",
        result.program_result
    );

    // Verify config account
    let config_account = result.get_account(&config).unwrap();
    assert_eq!(config_account.owner, program_id);
    let config_data = Config::try_deserialize(&mut config_account.data.as_ref()).unwrap();
    assert_eq!(config_data.seed, seed);
    assert_eq!(config_data.fee, fee);
    assert_eq!(config_data.authority, authority);
    assert_eq!(config_data.mint_x, mint_x);
    assert_eq!(config_data.mint_y, mint_y);
    assert!(!config_data.locked);

    // Verify LP mint
    let mint_lp_account = result.get_account(&mint_lp).unwrap();
    assert_eq!(mint_lp_account.owner, token::ID);
    let lp_mint_data = anchor_spl::token::spl_token::state::Mint
        ::unpack(&mint_lp_account.data)
        .unwrap();
    assert_eq!(lp_mint_data.mint_authority, Some(config).into());
    assert_eq!(lp_mint_data.decimals, 6);

    // Verify vaults
    let vault_x_account = result.get_account(&vault_x).unwrap();
    assert_eq!(vault_x_account.owner, token::ID);
    let vault_x_data = anchor_spl::token::spl_token::state::Account
        ::unpack(&vault_x_account.data)
        .unwrap();
    assert_eq!(vault_x_data.mint, mint_x);
    assert_eq!(vault_x_data.owner, config);

    let vault_y_account = result.get_account(&vault_y).unwrap();
    assert_eq!(vault_y_account.owner, token::ID);
    let vault_y_data = anchor_spl::token::spl_token::state::Account
        ::unpack(&vault_y_account.data)
        .unwrap();
    assert_eq!(vault_y_data.mint, mint_y);
    assert_eq!(vault_y_data.owner, config);
}
