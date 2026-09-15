function catalogPhoto(file: string): string {
  return `/foods/${file}`;
}

const PHOTO_BY_NAME: Record<string, string> = {
  almonds: catalogPhoto('almonds.jpg'),
  apple: catalogPhoto('apple.jpg'),
  banana: catalogPhoto('banana.jpg'),
  chapati: catalogPhoto('chapati.jpg'),
  'chicken breast': catalogPhoto('chicken-breast.jpg'),
  eggs: catalogPhoto('eggs.jpg'),
  'greek yogurt': catalogPhoto('greek-yogurt.jpg'),
  idli: catalogPhoto('idli.jpg'),
  milk: catalogPhoto('milk.jpg'),
  'mixed salad': catalogPhoto('mixed-salad.jpg'),
  'mutton biryani': catalogPhoto('mutton-biryani.jpg'),
  oats: catalogPhoto('oats.jpg'),
  paneer: catalogPhoto('paneer.jpg'),
  salmon: catalogPhoto('salmon.jpg'),
  toast: catalogPhoto('toast.jpg'),
  'white rice': catalogPhoto('white-rice.jpg'),
};

/** Most specific keywords first so "mutton biryani" is not matched as rice. */
const PHOTO_BY_KEY: Array<{ test: RegExp; src: string }> = [
  { test: /biryani|gosht|pulao/, src: catalogPhoto('mutton-biryani.jpg') },
  { test: /idli/, src: catalogPhoto('idli.jpg') },
  { test: /chapati|roti|paratha/, src: catalogPhoto('chapati.jpg') },
  { test: /paneer/, src: catalogPhoto('paneer.jpg') },
  { test: /almond/, src: catalogPhoto('almonds.jpg') },
  { test: /greek yogurt|yogurt|yoghurt|dahi|\bcurd\b/, src: catalogPhoto('greek-yogurt.jpg') },
  { test: /oatmeal|\boats\b|porridge/, src: catalogPhoto('oats.jpg') },
  { test: /chicken/, src: catalogPhoto('chicken-breast.jpg') },
  { test: /salmon/, src: catalogPhoto('salmon.jpg') },
  { test: /banana/, src: catalogPhoto('banana.jpg') },
  { test: /apple/, src: catalogPhoto('apple.jpg') },
  { test: /\beggs?\b/, src: catalogPhoto('eggs.jpg') },
  { test: /toast|sourdough/, src: catalogPhoto('toast.jpg') },
  { test: /salad/, src: catalogPhoto('mixed-salad.jpg') },
  { test: /rice/, src: catalogPhoto('white-rice.jpg') },
  { test: /milk/, src: catalogPhoto('milk.jpg') },
];

export const FALLBACK_FOOD_PHOTO = catalogPhoto('mixed-salad.jpg');

/** Real food photo for a catalog or logged name. Never returns a cartoon/emoji. */
export function foodPhoto(name: string): string {
  const key = name.trim().toLowerCase();
  if (PHOTO_BY_NAME[key]) return PHOTO_BY_NAME[key];
  const match = PHOTO_BY_KEY.find((row) => row.test.test(key));
  return match?.src ?? FALLBACK_FOOD_PHOTO;
}
