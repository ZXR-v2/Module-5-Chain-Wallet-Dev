#!/bin/bash

# Change to script directory
cd "$(dirname "$0")"

echo "Running TokenBankPermit2 tests..."
echo ""

# Run tests and save output
forge test --match-path "test/TokenBankPermit2.t.sol" -vvv > test_output.txt 2>&1

echo ""
echo "Test completed. Output saved to test_output.txt"
echo ""
cat test_output.txt
