module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 60000,
  // Ensure each test file gets a fresh module state
  clearMocks: true,
  // Force serial execution — tests share an in-memory DB
  maxWorkers: 1,
};
