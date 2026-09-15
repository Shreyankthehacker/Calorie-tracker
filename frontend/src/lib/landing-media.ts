type LandingPhoto = {
  src: string;
  fallback: string;
  alt: string;
  width: number;
  height: number;
};

function unsplash(photoId: string, width: number): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

const LOCAL = {
  salad: '/foods/mixed-salad.jpg',
  chicken: '/foods/chicken-breast.jpg',
  salmon: '/foods/salmon.jpg',
  oats: '/foods/oats.jpg',
  eggs: '/foods/eggs.jpg',
  yogurt: '/foods/greek-yogurt.jpg',
  rice: '/foods/white-rice.jpg',
} as const;

export const landingMedia = {
  hero: {
    src: unsplash('photo-1512621776951-a57141f2eefd', 1400),
    srcSet: [
      `${unsplash('photo-1512621776951-a57141f2eefd', 800)} 800w`,
      `${unsplash('photo-1512621776951-a57141f2eefd', 1200)} 1200w`,
      `${unsplash('photo-1512621776951-a57141f2eefd', 1600)} 1600w`,
    ].join(', '),
    fallback: LOCAL.salad,
    alt: 'Grain bowl with greens, roasted vegetables, and seeds on a wooden table in daylight',
    width: 1400,
    height: 1750,
  } satisfies LandingPhoto & { srcSet: string },
  today: {
    src: unsplash('photo-1498837164418-9b900c5ddcbd', 1200),
    srcSet: [
      `${unsplash('photo-1498837164418-9b900c5ddcbd', 800)} 800w`,
      `${unsplash('photo-1498837164418-9b900c5ddcbd', 1200)} 1200w`,
    ].join(', '),
    fallback: LOCAL.eggs,
    alt: 'Prepared meals and produce laid out for the day',
    width: 1200,
    height: 900,
  } satisfies LandingPhoto & { srcSet: string },
  liveMeal: {
    src: unsplash('photo-1604908176997-125f25cc6f3d', 1200),
    fallback: LOCAL.chicken,
    alt: 'Chicken rice bowl with vegetables, photographed from above',
    width: 1200,
    height: 1500,
  },
  logMeal: {
    src: unsplash('photo-1482049016688-2d3e1b311543', 1100),
    fallback: LOCAL.eggs,
    alt: 'Avocado toast with egg on a ceramic plate',
    width: 1100,
    height: 1320,
  },
  reports: {
    src: unsplash('photo-1493770348161-369560ae357d', 1100),
    fallback: LOCAL.oats,
    alt: 'Breakfast table with oats, fruit, and coffee',
    width: 1100,
    height: 900,
  },
  strip: [
    {
      src: unsplash('photo-1493770348161-369560ae357d', 800),
      fallback: LOCAL.oats,
      alt: 'Breakfast of oats and fruit',
      width: 800,
      height: 1000,
      shape: 'tall' as const,
    },
    {
      src: unsplash('photo-1467003909585-2f8a72700288', 900),
      fallback: LOCAL.salmon,
      alt: 'Plated lunch with greens and grains',
      width: 900,
      height: 700,
      shape: 'wide' as const,
    },
    {
      src: unsplash('photo-1544025162-d7664023455a', 800),
      fallback: LOCAL.chicken,
      alt: 'Grilled protein with vegetables',
      width: 800,
      height: 800,
      shape: 'square' as const,
    },
    {
      src: unsplash('photo-1529042410759-befb1204b468', 800),
      fallback: LOCAL.salmon,
      alt: 'Dinner plate with salmon',
      width: 800,
      height: 1060,
      shape: 'tall' as const,
    },
    {
      src: LOCAL.yogurt,
      fallback: LOCAL.yogurt,
      alt: 'Greek yogurt in a bowl',
      width: 640,
      height: 640,
      shape: 'square' as const,
    },
  ],
} as const;
