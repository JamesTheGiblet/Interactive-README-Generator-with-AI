module.exports = {
  // The test environment that will be used for testing.
  // 'jsdom' simulates a browser environment, which is needed for modules that interact with the DOM.
  testEnvironment: 'jest-environment-jsdom',

  // Automatically clear mock calls, instances, contexts and results before every test.
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test.
  collectCoverage: true,

  // The directory where Jest should output its coverage files.
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected.
  // We exclude files that are difficult or not practical to unit test.
  collectCoverageFrom: [
    'src/modules/**/*.js',
    '!**/node_modules/**',
    '!build.js',
    '!cli.js',
    '!jest.config.js',
    '!**/coverage/**',
  ],
};