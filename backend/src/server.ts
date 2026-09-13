import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './db/prisma.js';

// Always load backend/.env, even when the process is started from the repo root.
loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      { geminiConfigured: Boolean(env.GEMINI_API_KEY) },
      'AI nutrition extraction',
    );
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
