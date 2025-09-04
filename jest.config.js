module.exports = {
  // The test environment that will be used for testing.
  // 'jsdom' is a browser-like environment and is needed for testing web applications.
  testEnvironment: 'jsdom',

  // A list of paths to directories that Jest should use to search for files in.
  // We point it to our tests directory.
  roots: ['<rootDir>/tests'],

  // An array of glob patterns indicating a set of files for which coverage information should be collected.
  // This helps in getting an accurate coverage report.
  collectCoverageFrom: [
    'src/modules/**/*.js',
    '!src/modules/cli.js', // Exclude CLI as it's not suitable for unit testing with Jest.
    '!src/modules/build.js', // Exclude the build script from coverage.
  ],

  // An array of regexp pattern strings that are matched against all source file paths.
  // Matched files will skip transformation. This is the key to fixing the source map warnings.
  // We are telling Jest to not transform anything inside node_modules.
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$',
  ],

  // The directory where Jest should output its coverage files.
  coverageDirectory: 'coverage',

  // Indicates whether each individual test should be reported during the run.
  verbose: true,
};