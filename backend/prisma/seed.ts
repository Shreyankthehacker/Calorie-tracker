import { prisma } from '../src/db/prisma.js';
import { upsertSystemCatalog } from '../src/food-items/system-catalog.js';

async function main() {
  const count = await upsertSystemCatalog();
  console.log(`Seeded ${count} system food items.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
