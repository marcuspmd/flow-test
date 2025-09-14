#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const PORT = 3000;
const HTTPBIN_PORT = 8080;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false)); // Port is occupied
    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });
    server.listen(port);
  });
}

function waitForServer(port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function checkConnection() {
      const client = new net.Socket();
      client.setTimeout(1000);
      
      client.on('connect', () => {
        client.destroy();
        resolve(true);
      });
      
      client.on('error', () => {
        if (Date.now() - startTime < timeout) {
          setTimeout(checkConnection, 100);
        } else {
          reject(new Error(`Server not available on port ${port} after ${timeout}ms`));
        }
      });
      
      client.on('timeout', () => {
        client.destroy();
        if (Date.now() - startTime < timeout) {
          setTimeout(checkConnection, 100);
        } else {
          reject(new Error(`Server not available on port ${port} after ${timeout}ms`));
        }
      });
      
      client.connect(port, 'localhost');
    }
    
    checkConnection();
  });
}

async function main() {
  console.log('🚀 Flow Test Engine - Smart Server Detection');
  
  try {
    const skipLocalMock = process.env.SKIP_LOCAL_MOCK === '1' || process.env.SKIP_LOCAL_MOCK === 'true';
    if (skipLocalMock) {
      console.log('⏭️  SKIP_LOCAL_MOCK is set; will not start local mock server.');
    }
    // Check if port 3000 is available (not occupied)
    const hasLocalMockFile = fs.existsSync(path.join(process.cwd(), 'mock-server.js'));
    const canStartLocalMock = !skipLocalMock && hasLocalMockFile;
    const port3000Available = canStartLocalMock ? await isPortAvailable(PORT) : false;
    console.log(`🔍 Port ${PORT} available: ${port3000Available}`);
    
    if (port3000Available && canStartLocalMock) {
      console.log(`📡 Starting mock server on port ${PORT}...`);
      
      // Start mock server in background
      const mockServer = spawn('node', ['mock-server.js'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      mockServer.stdout.on('data', (data) => {
        console.log(`[Mock Server] ${data.toString().trim()}`);
      });
      
      mockServer.stderr.on('data', (data) => {
        console.error(`[Mock Server Error] ${data.toString().trim()}`);
      });
      
      // Wait for server to be ready
      try {
        await waitForServer(PORT);
        console.log(`✅ Mock server is ready on http://localhost:${PORT}`);
      } catch (error) {
        console.error(`❌ Failed to start mock server: ${error.message}`);
        process.exit(1);
      }
      
      // Allow server to detach from parent
      mockServer.unref();
    } else {
      console.log(`✅ Server already running on port ${PORT}`);
    }
    
    // Now run the tests
    console.log('🧪 Starting tests...');
    
    // Pass any command line arguments to the test runner
    const args = process.argv.slice(2);
    const testCommand = ['npx', 'ts-node', 'src/cli.ts', ...args];
    
    try {
      execSync(testCommand.join(' '), {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.error('❌ Test execution failed');
      process.exit(error.status || 1);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
