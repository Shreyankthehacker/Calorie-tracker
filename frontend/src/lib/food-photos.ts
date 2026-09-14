const PHOTO_BY_KEY: Array<{ test: RegExp; src: string }> = [
  { test: /egg|breakfast|toast|sourdough/, src: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80&auto=format&fit=crop' },
  { test: /salad|tuna|lunch|greens/, src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&auto=format&fit=crop' },
  { test: /salmon|fish/, src: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80&auto=format&fit=crop' },
  { test: /chicken/, src: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&q=80&auto=format&fit=crop' },
  { test: /oat|oatmeal|banana/, src: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80&auto=format&fit=crop' },
  { test: /rice/, src: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&q=80&auto=format&fit=crop' },
  { test: /yogurt/, src: 'https://images.unsplash.com/photo-1488477304112-4944851de03d?w=400&q=80&auto=format&fit=crop' },
  { test: /avocado/, src: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80&auto=format&fit=crop' },
  { test: /wrap/, src: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80&auto=format&fit=crop' },
];

export function foodPhoto(name: string): string {
  const haystack = name.toLowerCase();
  const match = PHOTO_BY_KEY.find((row) => row.test.test(haystack));
  if (match) return match.src;
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`;
}

export function fallbackPhoto(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/300`;
}
