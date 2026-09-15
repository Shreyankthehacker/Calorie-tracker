import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { BarcodeLookupProvider, BarcodeProductLookup } from '../src/barcode/barcode-provider.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
};

const nutella: BarcodeProductLookup = {
  barcode: '3017620422003',
  name: 'Nutella',
  brand: 'Ferrero',
  quantity: 100,
  quantityUnit: 'g',
  calories: 539,
  protein: 6.3,
  carbs: 57.5,
  fat: 30.9,
  micronutrients: [{ nutrientKey: 'sodium', amount: 107, unit: 'mg' }],
  imageUrl: null,
  source: 'open_food_facts',
};

const pricedChips: BarcodeProductLookup = {
  ...nutella,
  barcode: '8901234567890',
  name: 'Potato Chips (Plain Salted flavour) 20rs',
  brand: null,
};

class MapBarcodeProvider implements BarcodeLookupProvider {
  constructor(private readonly products: Map<string, BarcodeProductLookup>) {}

  async lookup(barcode: string): Promise<BarcodeProductLookup | null> {
    return this.products.get(barcode) ?? null;
  }
}

describe('barcode lookup API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `barcode_${label}_${suffix}@example.com`,
        password,
        timezone: 'UTC',
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as AuthResponse;
  }

  beforeAll(async () => {
    app = await buildApp(env, {
      barcodeProvider: new MapBarcodeProvider(
        new Map([
          [nutella.barcode, nutella],
          [pricedChips.barcode, pricedChips],
        ]),
      ),
    });
    await app.ready();
    userA = await register('a');
  });

  afterAll(async () => {
    if (userA?.user.id) {
      await prisma.refreshToken.deleteMany({ where: { userId: userA.user.id } });
      await prisma.user.deleteMany({ where: { id: userA.user.id } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated barcode lookups', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/barcode/lookup',
      payload: { barcode: nutella.barcode },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed barcodes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/barcode/lookup',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: { barcode: 'abc' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns product nutrition from the barcode provider', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/barcode/lookup',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: { barcode: nutella.barcode },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { product: BarcodeProductLookup };
    expect(body.product.name).toBe('Nutella');
    expect(body.product.quantity).toBe(100);
    expect(body.product.quantityUnit).toBe('g');
    expect(body.product.calories).toBe(539);
    expect(body.product.protein).toBe(6.3);
    expect(body.product.source).toBe('open_food_facts');
  });

  it('returns 404 when the product is unknown', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/barcode/lookup',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: { barcode: '0000000000000' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('strips price tokens from barcode product names', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/barcode/lookup',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: { barcode: pricedChips.barcode },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { product: BarcodeProductLookup };
    expect(body.product.name).toBe('Potato Chips (Plain Salted flavour)');
  });
});
