#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

/**
 * Smart test runner that checks Docker status and optimizes execution
 */
class SmartTestRunner {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.services = ['httpbin'];
        this.flowTestArgs = process.env.FLOW_TEST_ARGS || '';
    }

    /**
     * Check if Docker is running
     */
    isDockerRunning() {
        try {
            execSync('docker info', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if specific Docker services are running
     */
    areServicesRunning() {
        try {
            const result = execSync('docker compose ps --services --filter status=running', {
                encoding: 'utf8',
                cwd: this.projectRoot
            });

            const runningServices = result.trim().split('\n').filter(Boolean);
            return this.services.every(service => runningServices.includes(service));
        } catch (error) {
            return false;
        }
    }

    /**
     * Get status of Docker services
     */
    getServicesStatus() {
        try {
            const result = execSync('docker compose ps --format json', {
                encoding: 'utf8',
                cwd: this.projectRoot
            });

            if (!result.trim()) return [];

            const services = result.trim().split('\n').map(line => JSON.parse(line));
            return services;
        } catch (error) {
            return [];
        }
    }

    /**
     * Start Docker services if needed
     */
    async startServicesIfNeeded() {
        console.log('🔍 Checking Docker services status...');

        if (!this.isDockerRunning()) {
            console.log('❌ Docker is not running. Please start Docker first.');
            process.exit(1);
        }

        const servicesStatus = this.getServicesStatus();
        const runningServices = servicesStatus
            .filter(service => service.State === 'running')
            .map(service => service.Service);

        const needToStart = this.services.filter(service => !runningServices.includes(service));

        if (needToStart.length === 0) {
            console.log('✅ All required services are already running:');
            servicesStatus.forEach(service => {
                if (this.services.includes(service.Service)) {
                    console.log(`   📦 ${service.Service}: ${service.State} (${service.Status})`);
                }
            });
            return false; // Services already running
        }

        console.log('🚀 Starting missing services:', needToStart.join(', '));

        try {
            execSync(`docker compose up -d ${needToStart.join(' ')}`, {
                stdio: 'inherit',
                cwd: this.projectRoot
            });

            // Wait a moment for services to be ready
            console.log('⏳ Waiting for services to be ready...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            return true; // Services were started
        } catch (error) {
            console.error('❌ Failed to start Docker services:', error.message);
            process.exit(1);
        }
    }

    /**
     * Run the flow tests
     */
    async runTests() {
        console.log('🧪 Running Flow Test Engine...');

        const servicesWereStarted = await this.startServicesIfNeeded();

        try {
            // Build the project first
            console.log('🔨 Building project...');
            execSync('npm run build', {
                stdio: 'inherit',
                cwd: this.projectRoot
            });

            // Determine test command based on whether we need Docker or not
            let testCommand;

            if (this.flowTestArgs.includes('--config') || this.flowTestArgs.includes('--suite') || this.flowTestArgs.includes('--tag')) {
                // Direct execution for specific tests
                testCommand = `node dist/cli.js ${this.flowTestArgs}`;
            } else if (servicesWereStarted || this.flowTestArgs) {
                // Use Docker compose for full test suite
                testCommand = `docker compose up --build --abort-on-container-exit --exit-code-from flow-test flow-test`;
            } else {
                // Services already running, use direct execution
                testCommand = `node dist/cli.js`;
            }

            console.log(`📋 Executing: ${testCommand}`);

            execSync(testCommand, {
                stdio: 'inherit',
                cwd: this.projectRoot,
                env: { ...process.env, FLOW_TEST_ARGS: this.flowTestArgs }
            });

            console.log('✅ Tests completed successfully!');

        } catch (error) {
            console.error('❌ Tests failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Cleanup services if we started them
     */
    async cleanup() {
        // Only cleanup if specifically requested
        if (process.env.CLEANUP_AFTER_TESTS === 'true') {
            console.log('🧹 Cleaning up Docker services...');
            try {
                execSync('docker compose down', {
                    stdio: 'inherit',
                    cwd: this.projectRoot
                });
            } catch (error) {
                console.warn('⚠️  Warning: Failed to cleanup Docker services:', error.message);
            }
        }
    }

    /**
     * Main execution method
     */
    async run() {
        console.log('🚀 Smart Flow Test Runner');
        console.log('📁 Project root:', this.projectRoot);

        if (this.flowTestArgs) {
            console.log('⚙️  Arguments:', this.flowTestArgs);
        }

        try {
            await this.runTests();
        } finally {
            await this.cleanup();
        }
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️  Test execution interrupted');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Test execution terminated');
    process.exit(0);
});

// Run the smart test runner
if (require.main === module) {
    const runner = new SmartTestRunner();
    runner.run().catch(error => {
        console.error('💥 Smart test runner failed:', error);
        process.exit(1);
    });
}

module.exports = SmartTestRunner;