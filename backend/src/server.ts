import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { prisma } from './db/prisma.js';

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
