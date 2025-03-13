import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/integration',
  testMatch: ['**/*.int.test.ts'],  // Only run files with .int.test.ts pattern
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://localhost:3000',
  },
  globalSetup: require.resolve('./tests/integration/setup/globalSetup.ts'),
  globalTeardown: require.resolve('./tests/integration/setup/globalTeardown.ts'),
};

export default config; 