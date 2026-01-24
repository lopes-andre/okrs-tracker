#!/bin/bash

# =============================================================================
# Pre-Commit Validation Script
# =============================================================================
#
# This script runs all validation checks before committing code.
# Run this before every commit to ensure code quality.
#
# Usage:
#   ./scripts/pre-commit-check.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#
# =============================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

# Start timer
START_TIME=$(date +%s)

print_header "OKRs Tracker - Pre-Commit Validation"
echo ""
echo "Running all validation checks..."
echo ""

# =============================================================================
# Step 1: Lint Check
# =============================================================================

print_header "Step 1/3: ESLint"

if npm run lint 2>&1; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    FAILED=1
fi

# =============================================================================
# Step 2: Test Check
# =============================================================================

print_header "Step 2/3: Tests"

if npm run test:run 2>&1; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    FAILED=1
fi

# =============================================================================
# Step 3: Build Check
# =============================================================================

print_header "Step 3/3: Production Build"

if npm run build 2>&1; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    FAILED=1
fi

# =============================================================================
# Summary
# =============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "Summary"
echo ""

if [ $FAILED -eq 0 ]; then
    print_success "All checks passed!"
    echo ""
    print_info "Duration: ${DURATION}s"
    echo ""
    print_info "Safe to commit. Run:"
    echo ""
    echo "    git add ."
    echo "    git commit -m \"your message\""
    echo ""
    exit 0
else
    print_error "Some checks failed!"
    echo ""
    print_info "Duration: ${DURATION}s"
    echo ""
    print_warning "Please fix the issues above before committing."
    echo ""
    exit 1
fi
