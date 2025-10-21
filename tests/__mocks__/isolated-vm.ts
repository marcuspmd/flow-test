/**
 * Mock for isolated-vm module in Jest tests
 *
 * isolated-vm is a native module that cannot run in Jest's test environment.
 * This mock provides a simplified implementation that allows testing the
 * ScriptExecutorService logic without the actual sandboxing.
 */

// Simple mock for isolated-vm
const mockScript = {
  run: jest.fn().mockResolvedValue(undefined),
};

const mockIsolate = {
  createContext: jest.fn().mockResolvedValue({
    global: {
      set: jest.fn().mockResolvedValue(undefined),
    },
    eval: jest.fn().mockResolvedValue(undefined),
    evalClosure: jest.fn().mockResolvedValue(undefined),
  }),
  compileScript: jest.fn().mockResolvedValue(mockScript),
};

module.exports = {
  Isolate: jest.fn().mockImplementation(() => mockIsolate),
  Reference: jest.fn().mockImplementation((fn) => ({
    applySync: jest.fn().mockImplementation((...args) => fn(...args[2])),
  })),
  __mockIsolate: mockIsolate,
  __mockScript: mockScript,
};
