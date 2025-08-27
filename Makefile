


sync-keys:
	anchor keys sync
	
build:
	anchor build

deploy-devnet:
	anchor deploy --provider.cluster devnet

deploy-localnet:
	anchor build
	anchor deploy --provider.cluster localnet

anchor-test-skip:
	anchor test --skip-local-validator

set-config-localnet:
	solana config set --url localhost 

set-config-devnet:
	solana config set --url devnet

start-test-validator:
	solana-test-validator --reset

run-tests:
	cargo test --features test-sbf --test test_initialize
	cargo test --features test-sbf --test test_deposit
	cargo test --features test-sbf --test test_swap
