

run-tests:
	cargo test --features test-sbf --test test_initialize
	cargo test --features test-sbf --test test_deposit
	cargo test --features test-sbf --test test_swap
