module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  modulePaths: ['<rootDir>/node_modules/expo/node_modules'],
};
