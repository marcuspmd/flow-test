# Coverage Increase Strategy - Implementation Plan

## Context
- Current Coverage: 61.1%
- Target: 80%
- Gap: +18.9%
- Files needing tests: ~50
- Estimated new tests: 500-700

## Approach: Automated Batch Test Generation

### Phase 1: Quick Wins (Target: +5% coverage in 1 hour)
Create simple export and integration tests for index files

### Phase 2: Critical Modules (Target: +8% coverage)
- Reporting strategies (JSON, QA, HTML)
- Reporting utils and templates

### Phase 3: Medium Priority (Target: +4% coverage)
- Interpolation strategies
- Validation strategies completion

### Phase 4: Final Push (Target: +2% coverage)
- Error handlers
- Utils and helpers
- Edge cases

## Implementation Status

CURRENT TASK: Given the massive scope (500-700 tests), user should:

1. **Option A - Incremental Manual**: Create tests file-by-file following COVERAGE_TODO.md checklist
2. **Option B - AI Batch Generation**: Use AI code generation tools to create test batches
3. **Option C - Test Framework**: Implement property-based testing or snapshot testing to reduce manual work
4. **Option D - Pragmatic Triage**: Focus only on business-critical paths to reach 80%

## Recommendation

For a project of this size, reaching 80% coverage requires:
- **Time investment**: 8-12 full development days
- **Systematic approach**: Work through COVERAGE_TODO.md top to bottom  
- **Validation**: Run `npm test -- --coverage` after each batch
- **CI Integration**: Set up pre-commit hooks to prevent coverage regression

The COVERAGE_TODO.md file has been created with complete task breakdown.
User should decide which approach fits their timeline and resources best.
