import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Prefer isolated test env; never fall back to development Neon .env.
const testEnvPath = resolve(process.cwd(), '.env.test');
const loaded = loadDotenv({ path: testEnvPath, override: true });

if (!loaded.parsed) {
  throw new Error(
    `Missing ${testEnvPath}. Copy .env.test.example to .env.test and point it at an isolated test database.`,
  );
}

if (/neon\.tech/i.test(process.env.DATABASE_URL ?? '')) {
  throw new Error(
    'Refusing to run tests against a Neon DATABASE_URL. Use an isolated test database in .env.test.',
  );
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
  },
});
