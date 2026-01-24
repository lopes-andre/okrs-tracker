#!/bin/bash

# =============================================================================
# Backup Verification Script
# =============================================================================
#
# Validates OKRs Tracker backup files for integrity and completeness.
#
# Usage:
#   ./scripts/verify-backup.sh path/to/backup.json
#
# Exit codes:
#   0 - Backup is valid
#   1 - Backup has errors
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file.json>"
    echo ""
    echo "Examples:"
    echo "  $0 ~/Downloads/MyPlan_2026-01-24.json"
    echo "  $0 backup.json"
    exit 1
fi

BACKUP_FILE="$1"
ERRORS=0
WARNINGS=0

print_header "OKRs Tracker - Backup Verification"

# =============================================================================
# Step 1: File Exists
# =============================================================================

echo ""
echo "Checking file..."

if [ ! -f "$BACKUP_FILE" ]; then
    print_error "File not found: $BACKUP_FILE"
    exit 1
fi

print_success "File exists: $BACKUP_FILE"

# =============================================================================
# Step 2: Valid JSON
# =============================================================================

echo ""
echo "Validating JSON structure..."

if ! python3 -c "import json; json.load(open('$BACKUP_FILE'))" 2>/dev/null; then
    if ! node -e "JSON.parse(require('fs').readFileSync('$BACKUP_FILE'))" 2>/dev/null; then
        print_error "Invalid JSON structure"
        exit 1
    fi
fi

print_success "Valid JSON structure"

# =============================================================================
# Step 3: Schema Version
# =============================================================================

echo ""
echo "Checking schema version..."

VERSION=$(python3 -c "import json; d=json.load(open('$BACKUP_FILE')); print(d.get('metadata', {}).get('version', 'unknown'))" 2>/dev/null || echo "unknown")

if [ "$VERSION" == "1.0" ]; then
    print_success "Schema version: $VERSION"
elif [ "$VERSION" == "unknown" ]; then
    print_error "Missing schema version"
    ERRORS=$((ERRORS + 1))
else
    print_warning "Unknown schema version: $VERSION"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# Step 4: Required Fields
# =============================================================================

echo ""
echo "Checking required fields..."

# Check metadata fields
check_field() {
    local field=$1
    local result=$(python3 -c "
import json
d = json.load(open('$BACKUP_FILE'))
path = '$field'.split('.')
v = d
for p in path:
    v = v.get(p) if isinstance(v, dict) else None
print('present' if v is not None else 'missing')
" 2>/dev/null || echo "error")

    if [ "$result" == "present" ]; then
        print_success "Field present: $field"
    else
        print_error "Field missing: $field"
        ERRORS=$((ERRORS + 1))
    fi
}

check_field "metadata.version"
check_field "metadata.exportedAt"
check_field "metadata.planId"
check_field "metadata.planName"
check_field "metadata.planYear"
check_field "plan.name"
check_field "plan.year"

# =============================================================================
# Step 5: Entity Counts
# =============================================================================

echo ""
echo "Counting entities..."

# Get counts using Python
COUNTS=$(python3 -c "
import json
d = json.load(open('$BACKUP_FILE'))

def count_nested(objectives):
    krs = 0
    qts = 0
    for obj in objectives:
        for kr in obj.get('annualKrs', []):
            krs += 1
            qts += len(kr.get('quarterTargets', []))
    return krs, qts

kr_count, qt_count = count_nested(d.get('objectives', []))

print(f\"tags:{len(d.get('tags', []))}|krGroups:{len(d.get('krGroups', []))}|objectives:{len(d.get('objectives', []))}|annualKrs:{kr_count}|quarterTargets:{qt_count}|tasks:{len(d.get('tasks', []))}|checkIns:{len(d.get('checkIns', []))}|weeklyReviews:{len(d.get('weeklyReviews', []))}\")
" 2>/dev/null || echo "error")

if [ "$COUNTS" != "error" ]; then
    IFS='|' read -ra ADDR <<< "$COUNTS"
    for item in "${ADDR[@]}"; do
        IFS=':' read -r name count <<< "$item"
        print_info "$name: $count"
    done
else
    print_warning "Could not count entities"
    WARNINGS=$((WARNINGS + 1))
fi

# =============================================================================
# Step 6: Cross-Reference Integrity
# =============================================================================

echo ""
echo "Checking cross-references..."

XREF_RESULT=$(python3 -c "
import json
d = json.load(open('$BACKUP_FILE'))

# Collect all export IDs
tag_ids = set(t.get('_exportId') for t in d.get('tags', []))
group_ids = set(g.get('_exportId') for g in d.get('krGroups', []))
obj_ids = set(o.get('_exportId') for o in d.get('objectives', []))
kr_ids = set()
qt_ids = set()

for obj in d.get('objectives', []):
    for kr in obj.get('annualKrs', []):
        kr_ids.add(kr.get('_exportId'))
        for qt in kr.get('quarterTargets', []):
            qt_ids.add(qt.get('_exportId'))

warnings = []

# Check task references
for task in d.get('tasks', []):
    if task.get('objectiveRef') and task['objectiveRef'] not in obj_ids:
        warnings.append(f\"Task '{task.get('title', 'unknown')}' refs unknown objective\")
    if task.get('annualKrRef') and task['annualKrRef'] not in kr_ids:
        warnings.append(f\"Task '{task.get('title', 'unknown')}' refs unknown KR\")
    for tag_ref in task.get('tagRefs', []):
        if tag_ref not in tag_ids:
            warnings.append(f\"Task '{task.get('title', 'unknown')}' refs unknown tag\")

# Check check-in references
for ci in d.get('checkIns', []):
    if ci.get('annualKrRef') and ci['annualKrRef'] not in kr_ids:
        warnings.append(f\"Check-in refs unknown KR\")

# Check KR group references
for obj in d.get('objectives', []):
    for kr in obj.get('annualKrs', []):
        if kr.get('groupRef') and kr['groupRef'] not in group_ids:
            warnings.append(f\"KR '{kr.get('name', 'unknown')}' refs unknown group\")

if warnings:
    print('|'.join(warnings[:5]))  # Max 5 warnings
    if len(warnings) > 5:
        print(f'...and {len(warnings) - 5} more')
else:
    print('OK')
" 2>/dev/null || echo "error")

if [ "$XREF_RESULT" == "OK" ]; then
    print_success "All cross-references valid"
elif [ "$XREF_RESULT" == "error" ]; then
    print_warning "Could not check cross-references"
    WARNINGS=$((WARNINGS + 1))
else
    print_warning "Cross-reference issues found:"
    IFS='|' read -ra XREF_WARNINGS <<< "$XREF_RESULT"
    for warn in "${XREF_WARNINGS[@]}"; do
        print_info "  - $warn"
        WARNINGS=$((WARNINGS + 1))
    done
fi

# =============================================================================
# Step 7: File Size
# =============================================================================

echo ""
echo "Checking file size..."

FILE_SIZE=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
FILE_SIZE_KB=$((FILE_SIZE / 1024))

if [ $FILE_SIZE_KB -lt 1 ]; then
    print_warning "File is very small ($FILE_SIZE bytes) - may be empty"
    WARNINGS=$((WARNINGS + 1))
else
    print_success "File size: ${FILE_SIZE_KB} KB"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Verification Summary"
echo ""

# Get plan info
PLAN_INFO=$(python3 -c "
import json
d = json.load(open('$BACKUP_FILE'))
m = d.get('metadata', {})
print(f\"{m.get('planName', 'Unknown')} ({m.get('planYear', 'Unknown')})\")
print(f\"Exported: {m.get('exportedAt', 'Unknown')[:10]}\")
print(f\"By: {m.get('exportedBy', 'Unknown')}\")
" 2>/dev/null || echo "Unknown plan")

echo "$PLAN_INFO"
echo ""

if [ $ERRORS -gt 0 ]; then
    print_error "Verification FAILED"
    print_info "Errors: $ERRORS"
    print_info "Warnings: $WARNINGS"
    echo ""
    print_info "This backup file has critical errors and may not import correctly."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    print_warning "Verification PASSED with warnings"
    print_info "Warnings: $WARNINGS"
    echo ""
    print_info "This backup should import, but some references may be skipped."
    exit 0
else
    print_success "Verification PASSED"
    echo ""
    print_info "This backup is valid and ready for import."
    exit 0
fi
