default: build

.PHONY: build test fmt clean all docs deploy-testnet help

## Build targets
build:
	@echo "🔨 Building Soroban Token Vesting Contract..."
	cargo build --target wasm32-unknown-unknown --release
	@echo "✅ Build complete: target/wasm32-unknown-unknown/release/hello_world.wasm"

build-optimized:
	@echo "🔨 Building optimized release..."
	cargo build --target wasm32-unknown-unknown --release --profile release
	@echo "✅ Optimized build complete"

## Testing targets
test:
	@echo "🧪 Running all tests..."
	cargo test --lib
	@echo "✅ All tests passed!"

test-verbose:
	@echo "🧪 Running tests with output..."
	cargo test --lib -- --nocapture

test-specific:
	@echo "🧪 Running specific test: $(TEST)"
	cargo test --lib $(TEST) -- --nocapture

## Code quality targets
fmt:
	@echo "💅 Formatting code..."
	cargo fmt --all

fmt-check:
	@echo "📋 Checking code format..."
	cargo fmt --all -- --check

clippy:
	@echo "📍 Running clippy lints..."
	cargo clippy --all-targets --all-features -- -D warnings

## Documentation targets
docs:
	@echo "📚 Building documentation..."
	cargo doc --no-deps --open

## Clean targets
clean:
	@echo "🧹 Cleaning build artifacts..."
	cargo clean
	@echo "✅ Clean complete"

## Help target
help:
	@echo "Token Vesting Contract - Available Commands"
	@echo ""
	@echo "Build:"
	@echo "  make build              - Build contract in release mode"
	@echo "  make build-optimized    - Build optimized for production"
	@echo ""
	@echo "Testing:"
	@echo "  make test               - Run all tests"
	@echo "  make test-verbose       - Run tests with output"
	@echo "  make test-specific TEST=test_name - Run specific test"
	@echo ""
	@echo "Quality:"
	@echo "  make fmt                - Format code"
	@echo "  make fmt-check          - Check code format"
	@echo "  make clippy             - Run linter"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs               - Generate and open docs"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make all                - Run all checks (test, fmt-check, clippy)"
	@echo ""
	@echo "Full Workflow:"
	@echo "  make clean && make build && make test && make clippy"

all: clean fmt-check test clippy
	@echo "✅ All checks passed!"

.PHONY: default build build-optimized test test-verbose test-specific fmt fmt-check clippy docs clean help all
