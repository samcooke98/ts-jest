const cfg = {}

if (require('jest/package.json').version.split('.').shift() === '22') {
  Object.assign(cfg, require('ts-jest').jestPreset)
} else {
  cfg.preset = 'ts-jest'
}

module.exports = Object.assign({}, cfg, {
  collectCoverage: true,
  collectCoverageFrom: ["**/*.ts", "!**/*.d.ts", "!**/build/**", "!/FrontEnd/**"],
  forceCoverageMatch: ["**/*.test.ts"],
  coverageDirectory: "Tests/coverage",
  coverageReporters: ["lcov"],
  rootDir: "..",
  testMatch: ["**/*.test.ts"],
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.json",
    },
  },
  // testResultsProcessor: "jest-teamcity-reporter",
})
