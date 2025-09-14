# Flow Test - Automation Scripts

This directory contains automation scripts for running Flow Test suites in various environments and scenarios.

## Available Scripts

### Run Tests
Main test runner script with environment detection and configuration management.

```bash
#!/bin/bash

# Flow Test Runner Script
# Usage: ./run-tests.sh [environment] [test-file]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PROJECT_ROOT/results"
LOGS_DIR="$PROJECT_ROOT/logs"

# Default values
ENVIRONMENT="${1:-development}"
TEST_FILE="${2:-tests/start-flow.yaml}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create directories
setup_directories() {
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$LOGS_DIR"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Running tests in $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check dependencies
check_dependencies() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi

    # Check if package.json exists
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json not found in $PROJECT_ROOT"
        exit 1
    fi
}

# Install dependencies if needed
install_dependencies() {
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_info "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install
        log_success "Dependencies installed"
    fi
}

# Set environment variables
set_environment_variables() {
    export NODE_ENV=$ENVIRONMENT

    # Load environment-specific variables
    if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
        log_info "Loading environment variables from .env.$ENVIRONMENT"
        set -a
        source "$PROJECT_ROOT/.env.$ENVIRONMENT"
        set +a
    elif [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "Loading environment variables from .env"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    fi
}

# Run tests
run_tests() {
    local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
    local log_file="$LOGS_DIR/test-run-$timestamp.log"

    log_info "Starting test execution..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Test file: $TEST_FILE"
    log_info "Log file: $log_file"

    cd "$PROJECT_ROOT"

    # Build command
    local cmd="node dist/cli.js $TEST_FILE"

    if [ "$VERBOSE" = "true" ]; then
        cmd="$cmd --verbose"
    fi

    # Run tests and capture output
    if $cmd > "$log_file" 2>&1; then
        log_success "Tests completed successfully"
        return 0
    else
        log_error "Tests failed"
        log_info "Check log file: $log_file"
        return 1
    fi
}

# Generate report
generate_report() {
    local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
    local report_file="$RESULTS_DIR/report-$timestamp.html"

    log_info "Generating test report..."

    # This would integrate with your reporting system
    # For now, just copy the latest result files
    if [ -d "$RESULTS_DIR" ] && [ "$(ls -A $RESULTS_DIR)" ]; then
        log_success "Report generated: $report_file"
    else
        log_warning "No test results found to generate report"
    fi
}

# Cleanup old files
cleanup() {
    # Remove log files older than 30 days
    find "$LOGS_DIR" -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true

    # Remove result files older than 30 days
    find "$RESULTS_DIR" -name "*.html" -type f -mtime +30 -delete 2>/dev/null || true
    find "$RESULTS_DIR" -name "*.json" -type f -mtime +30 -delete 2>/dev/null || true

    log_info "Cleanup completed"
}

# Main execution
main() {
    log_info "Flow Test Runner v1.0"
    log_info "===================="

    setup_directories
    validate_environment
    check_dependencies
    install_dependencies
    set_environment_variables

    if run_tests; then
        generate_report
        cleanup
        log_success "All tasks completed successfully"
        exit 0
    else
        log_error "Test execution failed"
        exit 1
    fi
}

# Run main function
main "$@"
```

### Run Parallel Tests
Script for running multiple test suites in parallel.

```bash
#!/bin/bash

# Parallel Test Runner
# Usage: ./run-parallel-tests.sh [max-parallel] [test-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

MAX_PARALLEL="${1:-5}"
TEST_DIR="${2:-tests}"
RESULTS_DIR="$PROJECT_ROOT/results/parallel"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${YELLOW}[PARALLEL]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Find all test files
find_test_files() {
    local test_files=()

    if [ -d "$TEST_DIR" ]; then
        while IFS= read -r -d '' file; do
            test_files+=("$file")
        done < <(find "$TEST_DIR" -name "*.yaml" -type f -print0)
    else
        log_error "Test directory not found: $TEST_DIR"
        exit 1
    fi

    echo "${test_files[@]}"
}

# Run single test
run_single_test() {
    local test_file="$1"
    local test_name=$(basename "$test_file" .yaml)
    local log_file="$RESULTS_DIR/$test_name.log"

    log_info "Running test: $test_name"

    cd "$PROJECT_ROOT"
    if node dist/cli.js "$test_file" > "$log_file" 2>&1; then
        echo "SUCCESS:$test_name"
        return 0
    else
        echo "FAILED:$test_name"
        return 1
    fi
}

# Run tests in parallel
run_parallel() {
    local test_files=("$@")
    local total_tests=${#test_files[@]}
    local running=0
    local completed=0
    local pids=()

    mkdir -p "$RESULTS_DIR"

    log_info "Running $total_tests tests with max $MAX_PARALLEL parallel processes"

    for test_file in "${test_files[@]}"; do
        # Wait if we've reached the max parallel limit
        while [ $running -ge $MAX_PARALLEL ]; do
            # Check for completed processes
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}" 2>/dev/null || true
                    unset 'pids[$i]'
                    ((running--))
                    ((completed++))
                fi
            done

            # Clean up array
            pids=("${pids[@]}")

            # Small delay to prevent busy waiting
            sleep 0.1
        done

        # Start new test
        run_single_test "$test_file" &
        pids+=($!)
        ((running++))

        log_info "Started test (running: $running, completed: $completed/$total_tests)"
    done

    # Wait for remaining tests to complete
    for pid in "${pids[@]}"; do
        wait "$pid" 2>/dev/null || true
        ((completed++))
        log_info "Test completed (completed: $completed/$total_tests)"
    done

    log_success "All tests completed"
}

# Generate summary report
generate_summary() {
    local summary_file="$RESULTS_DIR/summary.txt"
    local success_count=0
    local failure_count=0

    echo "Parallel Test Execution Summary" > "$summary_file"
    echo "==============================" >> "$summary_file"
    echo "" >> "$summary_file"

    for log_file in "$RESULTS_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            test_name=$(basename "$log_file" .log)
            if grep -q "SUCCESS:" "$log_file"; then
                echo "✅ $test_name: PASSED" >> "$summary_file"
                ((success_count++))
            else
                echo "❌ $test_name: FAILED" >> "$summary_file"
                ((failure_count++))
            fi
        fi
    done

    echo "" >> "$summary_file"
    echo "Results: $success_count passed, $failure_count failed" >> "$summary_file"

    log_info "Summary report generated: $summary_file"

    if [ $failure_count -gt 0 ]; then
        log_error "$failure_count tests failed"
        return 1
    else
        log_success "All tests passed"
        return 0
    fi
}

# Main execution
main() {
    local test_files

    log_info "Parallel Test Runner"
    log_info "==================="

    # Get test files
    IFS=' ' read -ra test_files <<< "$(find_test_files)"

    if [ ${#test_files[@]} -eq 0 ]; then
        log_error "No test files found in $TEST_DIR"
        exit 1
    fi

    # Run tests in parallel
    run_parallel "${test_files[@]}"

    # Generate summary
    if generate_summary; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
```

### Run Performance Tests
Script for running performance and load tests.

```bash
#!/bin/bash

# Performance Test Runner
# Usage: ./run-performance-tests.sh [duration] [concurrency] [test-file]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DURATION="${1:-60}"      # Duration in seconds
CONCURRENCY="${2:-10}"   # Number of concurrent requests
TEST_FILE="${3:-tests/performance-test.yaml}"
RESULTS_DIR="$PROJECT_ROOT/results/performance"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[PERF]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Setup performance test environment
setup_performance_test() {
    log_info "Setting up performance test environment"

    # Create results directory
    mkdir -p "$RESULTS_DIR"

    # Set performance-related environment variables
    export PERF_TEST=true
    export PERF_DURATION=$DURATION
    export PERF_CONCURRENCY=$CONCURRENCY

    log_success "Performance test environment ready"
}

# Run warmup phase
run_warmup() {
    log_info "Running warmup phase..."

    # Run a few requests to warm up the system
    for i in {1..5}; do
        node dist/cli.js "$TEST_FILE" --silent > /dev/null 2>&1
        log_info "Warmup request $i completed"
        sleep 1
    done

    log_success "Warmup phase completed"
}

# Run performance test
run_performance_test() {
    local start_time=$(date +%s)
    local end_time=$((start_time + DURATION))
    local iteration=0

    log_info "Starting performance test"
    log_info "Duration: $DURATION seconds"
    log_info "Concurrency: $CONCURRENCY"
    log_info "Test file: $TEST_FILE"

    # Start background processes
    local pids=()

    for ((i=1; i<=CONCURRENCY; i++)); do
        (
            local process_id=$i
            local process_results="$RESULTS_DIR/process-$process_id.csv"

            echo "timestamp,response_time,status_code,success" > "$process_results"

            while [ $(date +%s) -lt $end_time ]; do
                local request_start=$(date +%s%N)
                local output

                if output=$(node dist/cli.js "$TEST_FILE" --silent 2>&1); then
                    local request_end=$(date +%s%N)
                    local response_time=$(( (request_end - request_start) / 1000000 )) # Convert to milliseconds

                    # Extract status code from output (this depends on your test output format)
                    local status_code=$(echo "$output" | grep -o "status_code: [0-9]*" | cut -d' ' -f2 || echo "unknown")

                    echo "$(date +%s),$response_time,$status_code,true" >> "$process_results"
                else
                    local request_end=$(date +%s%N)
                    local response_time=$(( (request_end - request_start) / 1000000 ))

                    echo "$(date +%s),$response_time,unknown,false" >> "$process_results"
                fi

                # Small delay between requests
                sleep 0.1
            done
        ) &
        pids+=($!)
    done

    # Wait for all processes to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done

    log_success "Performance test completed"
}

# Generate performance report
generate_performance_report() {
    local report_file="$RESULTS_DIR/report.html"
    local summary_file="$RESULTS_DIR/summary.json"

    log_info "Generating performance report..."

    # Combine all process results
    local combined_file="$RESULTS_DIR/combined-results.csv"
    echo "timestamp,response_time,status_code,success" > "$combined_file"

    for csv_file in "$RESULTS_DIR"/process-*.csv; do
        if [ -f "$csv_file" ]; then
            tail -n +2 "$csv_file" >> "$combined_file"
        fi
    done

    # Calculate metrics
    local total_requests=$(wc -l < "$combined_file")
    local successful_requests=$(grep ",true$" "$combined_file" | wc -l)
    local failed_requests=$(grep ",false$" "$combined_file" | wc -l)
    local avg_response_time=$(awk -F',' 'NR>1 {sum+=$2; count++} END {print int(sum/count)}' "$combined_file")
    local min_response_time=$(awk -F',' 'NR>1 && $2>0 {if(min=="") min=$2; if($2<min) min=$2} END {print min}' "$combined_file")
    local max_response_time=$(awk -F',' 'NR>1 {if(max=="") max=$2; if($2>max) max=$2} END {print max}' "$combined_file")
    local success_rate=$((successful_requests * 100 / total_requests))

    # Generate JSON summary
    cat > "$summary_file" << EOF
{
  "test_duration_seconds": $DURATION,
  "concurrency": $CONCURRENCY,
  "total_requests": $total_requests,
  "successful_requests": $successful_requests,
  "failed_requests": $failed_requests,
  "success_rate_percent": $success_rate,
  "avg_response_time_ms": $avg_response_time,
  "min_response_time_ms": $min_response_time,
  "max_response_time_ms": $max_response_time,
  "requests_per_second": $((total_requests / DURATION))
}
EOF

    # Generate HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Flow Test Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Flow Test Performance Report</h1>

    <div class="metric">
        <h2>Test Configuration</h2>
        <p><strong>Duration:</strong> $DURATION seconds</p>
        <p><strong>Concurrency:</strong> $CONCURRENCY</p>
        <p><strong>Test File:</strong> $TEST_FILE</p>
    </div>

    <div class="metric">
        <h2>Results Summary</h2>
        <p><strong>Total Requests:</strong> $total_requests</p>
        <p><strong>Successful Requests:</strong> <span class="success">$successful_requests</span></p>
        <p><strong>Failed Requests:</strong> <span class="error">$failed_requests</span></p>
        <p><strong>Success Rate:</strong> <span class="${success_rate>=95 ? 'success' : success_rate>=90 ? 'warning' : 'error'}">$success_rate%</span></p>
        <p><strong>Requests/Second:</strong> $((total_requests / DURATION))</p>
    </div>

    <div class="metric">
        <h2>Response Time Metrics</h2>
        <p><strong>Average:</strong> ${avg_response_time}ms</p>
        <p><strong>Minimum:</strong> ${min_response_time}ms</p>
        <p><strong>Maximum:</strong> ${max_response_time}ms</p>
    </div>

    <h2>Detailed Results</h2>
    <table>
        <tr><th>Timestamp</th><th>Response Time (ms)</th><th>Status Code</th><th>Success</th></tr>
EOF

    # Add table rows (limit to first 1000 for performance)
    tail -n +2 "$combined_file" | head -1000 | while IFS=',' read -r timestamp response_time status_code success; do
        echo "        <tr><td>$(date -r "$timestamp" +"%H:%M:%S")</td><td>$response_time</td><td>$status_code</td><td>$success</td></tr>" >> "$report_file"
    done

    cat >> "$report_file" << EOF
    </table>
</body>
</html>
EOF

    log_success "Performance report generated: $report_file"
    log_success "Summary JSON generated: $summary_file"
}

# Main execution
main() {
    log_info "Flow Test Performance Runner"
    log_info "==========================="

    setup_performance_test
    run_warmup
    run_performance_test
    generate_performance_report

    log_success "Performance testing completed"
}

main "$@"
```

### `validate-tests.sh`
Script for validating test files before execution.

```bash
#!/bin/bash

# Test Validation Script
# Usage: ./validate-tests.sh [test-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

TEST_DIR="${1:-tests}"
VALIDATION_RESULTS="$PROJECT_ROOT/validation-results.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[VALIDATE]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate YAML syntax
validate_yaml_syntax() {
    local file="$1"

    if command -v yamllint &> /dev/null; then
        if yamllint "$file" > /dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    elif command -v python3 &> /dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" > /dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        log_warning "No YAML validator found (yamllint or python3+yaml)"
        return 0
    fi
}

# Validate test structure
validate_test_structure() {
    local file="$1"

    # Check for required fields
    if ! grep -q "suite_name:" "$file"; then
        echo "Missing required field: suite_name"
        return 1
    fi

    if ! grep -q "steps:" "$file"; then
        echo "Missing required field: steps"
        return 1
    fi

    return 0
}

# Validate variable references
validate_variables() {
    local file="$1"

    # Find all variable references
    local var_refs=$(grep -o '{{[^}]*}}' "$file" | sort | uniq)

    # Check if variables are defined
    local variables=$(grep -A 100 "variables:" "$file" | grep -E "^[[:space:]]*[a-zA-Z_][a-zA-Z0-9_]*:" | sed 's/.*://' | sed 's/ //g' | sort | uniq)

    local undefined_vars=()

    for var_ref in $var_refs; do
        # Extract variable name
        local var_name=$(echo "$var_ref" | sed 's/{{//' | sed 's/}}//' | sed 's/ //g')

        if ! echo "$variables" | grep -q "^$var_name$"; then
            undefined_vars+=("$var_name")
        fi
    done

    if [ ${#undefined_vars[@]} -gt 0 ]; then
        echo "Undefined variables: ${undefined_vars[*]}"
        return 1
    fi

    return 0
}

# Validate URLs
validate_urls() {
    local file="$1"

    # Find all URLs
    local urls=$(grep -o 'https\?://[^"]*' "$file")

    local invalid_urls=()

    for url in $urls; do
        if ! curl -s --head "$url" > /dev/null 2>&1; then
            invalid_urls+=("$url")
        fi
    done

    if [ ${#invalid_urls[@]} -gt 0 ]; then
        echo "Invalid or unreachable URLs: ${invalid_urls[*]}"
        return 1
    fi

    return 0
}

# Validate single test file
validate_test_file() {
    local file="$1"
    local errors=()

    log_info "Validating $file..."

    # YAML syntax validation
    if ! validate_yaml_syntax "$file"; then
        errors+=("Invalid YAML syntax")
    fi

    # Structure validation
    local structure_errors
    if ! structure_errors=$(validate_test_structure "$file"); then
        errors+=("$structure_errors")
    fi

    # Variable validation
    local variable_errors
    if ! variable_errors=$(validate_variables "$file"); then
        errors+=("$variable_errors")
    fi

    # URL validation (optional, can be slow)
    if [ "${VALIDATE_URLS:-false}" = "true" ]; then
        local url_errors
        if ! url_errors=$(validate_urls "$file"); then
            errors+=("$url_errors")
        fi
    fi

    if [ ${#errors[@]} -gt 0 ]; then
        log_error "Validation failed for $file:"
        for error in "${errors[@]}"; do
            log_error "  - $error"
        done
        return 1
    else
        log_success "$file is valid"
        return 0
    fi
}

# Find and validate all test files
validate_all_tests() {
    local test_files=()
    local failed_files=()

    # Find all YAML files
    while IFS= read -r -d '' file; do
        test_files+=("$file")
    done < <(find "$TEST_DIR" -name "*.yaml" -type f -print0)

    if [ ${#test_files[@]} -eq 0 ]; then
        log_error "No test files found in $TEST_DIR"
        exit 1
    fi

    log_info "Found ${#test_files[@]} test files"

    # Validate each file
    for file in "${test_files[@]}"; do
        if ! validate_test_file "$file"; then
            failed_files+=("$file")
        fi
    done

    # Generate summary
    {
        echo "Test Validation Summary"
        echo "======================="
        echo ""
        echo "Total files: ${#test_files[@]}"
        echo "Valid files: $((${#test_files[@]} - ${#failed_files[@]}))"
        echo "Invalid files: ${#failed_files[@]}"
        echo ""

        if [ ${#failed_files[@]} -gt 0 ]; then
            echo "Failed files:"
            for file in "${failed_files[@]}"; do
                echo "  - $file"
            done
        fi
    } > "$VALIDATION_RESULTS"

    log_info "Validation results saved to: $VALIDATION_RESULTS"

    if [ ${#failed_files[@]} -gt 0 ]; then
        log_error "${#failed_files[@]} files failed validation"
        return 1
    else
        log_success "All test files are valid"
        return 0
    fi
}

# Main execution
main() {
    log_info "Flow Test Validation"
    log_info "==================="

    validate_all_tests
}

main "$@"
```

## Usage Examples

### Basic Test Execution
```bash
# Run tests in development environment
./scripts/run-tests.sh development

# Run specific test file
./scripts/run-tests.sh production tests/auth-tests.yaml

# Run with verbose output
VERBOSE=true ./scripts/run-tests.sh staging
```

### Parallel Test Execution
```bash
# Run up to 5 tests in parallel
./scripts/run-parallel-tests.sh 5 tests/

# Run all tests in parallel (default max 5)
./scripts/run-parallel-tests.sh
```

### Performance Testing
```bash
# Run performance test for 60 seconds with 10 concurrent users
./scripts/run-performance-tests.sh 60 10

# Run load test for 120 seconds with 50 concurrent users
./scripts/run-performance-tests.sh 120 50 tests/load-test.yaml
```

### Test Validation
```bash
# Validate all test files
./scripts/validate-tests.sh

# Validate specific directory
./scripts/validate-tests.sh tests/integration/

# Validate with URL checking (slower)
VALIDATE_URLS=true ./scripts/validate-tests.sh
```

## Integration with CI/CD

### GitHub Actions Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Validate tests
      run: ./scripts/validate-tests.sh

    - name: Run tests
      run: ./scripts/run-tests.sh production

    - name: Run parallel tests
      run: ./scripts/run-parallel-tests.sh 3 tests/

    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: results/
```

### Jenkins Integration
```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Validate') {
            steps {
                sh './scripts/validate-tests.sh'
            }
        }

        stage('Test') {
            steps {
                sh './scripts/run-tests.sh production'
            }
        }

        stage('Parallel Test') {
            steps {
                sh './scripts/run-parallel-tests.sh 5'
            }
        }

        stage('Performance Test') {
            steps {
                sh './scripts/run-performance-tests.sh 60 20'
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'results',
                reportFiles: 'index.html',
                reportName: 'Test Results'
            ])
        }
    }
}
```

## Script Configuration

### Environment Variables
- `VERBOSE`: Enable verbose output (`true`/`false`)
- `VALIDATE_URLS`: Enable URL validation in test validation (`true`/`false`)
- `NODE_ENV`: Node.js environment (`development`/`staging`/`production`)

### Configuration Files
- `.env`: Base environment variables
- `.env.development`: Development-specific variables
- `.env.staging`: Staging-specific variables
- `.env.production`: Production-specific variables

### Directory Structure
```
scripts/
├── run-tests.sh           # Main test runner
├── run-parallel-tests.sh  # Parallel test execution
├── run-performance-tests.sh # Performance testing
└── validate-tests.sh      # Test validation

results/
├── validation-results.txt # Validation output
├── parallel/              # Parallel test results
└── performance/           # Performance test results

logs/
└── test-run-*.log         # Execution logs
```

These automation scripts provide a comprehensive solution for running Flow Test suites in various scenarios, from simple execution to complex performance testing and CI/CD integration.
