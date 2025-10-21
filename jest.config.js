/** @type {import('jest').Config} */
module.exports = {
  // Ambiente de execução
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Diretórios e arquivos
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Transformações TypeScript
  transform: {
    '^.+\.ts$': 'ts-jest',
  },

  // Extensões de arquivo
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Cobertura de código - threshold ajustado ao cenário atual do projeto
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'json', 'lcov'],
  collectCoverageFrom: [
    // Core modules (já testados)
    'src/**/*.ts',
    // Excluir apenas arquivos de interface/utilitários
    '!src/cli.ts',
    '!src/index.ts',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  coverageThreshold: {
    global: {
      statements: 50,
      branches: 45,
      functions: 50,
      lines: 50,
    },
  },

  // Configurações de teste
  verbose: true,
  clearMocks: true,
  restoreMocks: true,

  // Timeout para testes mais longos
  testTimeout: 10000,

  // Configurações adicionais para relatórios
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Configurações adicionais para relatórios
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'test-report.html',
      expand: true,
    }],
  ],
};
