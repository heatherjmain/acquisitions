export default async (): Promise<any> => {
  return {
    verbose: true,
    preset: 'ts-jest',
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    },
    testMatch: ["<rootDir>/(src)/**/*(*.)@(test|spec).ts?(x)"],
    transform: {
      "^.+\\.tsx?$": "ts-jest",
    },
    clearMocks: true,
    collectCoverage: true,
    coverageReporters: ['clover', 'json', 'lcov', 'text'],
    collectCoverageFrom: [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts", // ignore type files
      "!src/graphql.local.ts",
      "!src/db/seed-db-lambda.ts",
      "!src/cdk/index.ts"
    ],
    coverageProvider: 'v8',
    coverageThreshold: {
      global: {
        branches: 90,
        functions: 100,
        lines: 95,
        statements: 95,
      }
    },
  };
};
