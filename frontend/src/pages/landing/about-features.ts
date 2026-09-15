export type AboutFeature = {
  title: string;
  body: string;
};

export type AboutFeatureGroup = {
  title: string;
  intro: string;
  items: AboutFeature[];
};

export const aboutFeatureGroups: AboutFeatureGroup[] = [
  {
    title: 'Goals and meals',
    intro: 'The core tracker: a current goal, meals you logged, and nutrition that stays on those entries.',
    items: [
      {
        title: 'Personal health goals',
        body: 'Set a daily calorie target, protein, carbohydrate, and fat targets, plus an optional weight goal. One current goal per account, saved in the database.',
      },
      {
        title: 'Meal entries',
        body: 'Log breakfast, lunch, dinner, and snacks with food name, quantity, calories, macros, micronutrients, and the time you ate.',
      },
      {
        title: 'Catalog and custom foods',
        body: 'Pick a catalog item and scale nutrition by quantity, or enter a homemade dish with your own numbers. Edited macros save as a snapshot on the entry.',
      },
      {
        title: 'Time-range listing',
        body: 'Browse the entries log by start date, end date, and meal type. The list API paginates (default 20, maximum 50) and sorts by when the meal was eaten.',
      },
    ],
  },
  {
    title: 'Reports and charts',
    intro: 'Totals are computed when you open the report. There is no cached daily ledger.',
    items: [
      {
        title: 'Weekly calorie trend',
        body: 'See calories by day over a week (or a range you choose), bucketed in your timezone from consumedAt.',
      },
      {
        title: 'Macronutrient breakdown',
        body: 'Protein, carbohydrates, and fat by day, with a period total you can compare against the week you actually logged.',
      },
      {
        title: 'Micronutrient summary',
        body: 'Vitamins and minerals rolled up from the child nutrient rows on your food entries.',
      },
      {
        title: 'Goal vs actual',
        body: 'Compare logged intake to your current goal. The range target is the daily goal multiplied by the inclusive day count.',
      },
    ],
  },
  {
    title: 'AI, scan, and import',
    intro: 'Extraction and chat can propose numbers. Nothing is written until you review and save.',
    items: [
      {
        title: 'Photo nutrition extraction',
        body: 'Upload a JPEG, PNG, or WebP of a nutrition label or a plate. AI returns structured calories and macros for you to edit before you save the meal.',
      },
      {
        title: 'Barcode lookup',
        body: 'Look up packaged food against Open Food Facts, then confirm quantity and nutrition the same way as any other entry.',
      },
      {
        title: 'Sage chat',
        body: 'Ask about goals, weekly summaries, or a plate in natural language. Sage uses application tools only. Logging still needs Save meal.',
      },
      {
        title: 'PDF food diary import',
        body: 'Upload a text-based tabular diary, preview and edit the parsed meals, then confirm. Preview never creates entries. Scanned PDFs are not OCR’d.',
      },
    ],
  },
  {
    title: 'Accounts and extras',
    intro: 'Your log is yours. Family membership groups profiles without mixing meals.',
    items: [
      {
        title: 'Multi-user accounts',
        body: 'Register, sign in, refresh, and sign out. Food entries, goals, and reports are scoped to the signed-in user on the server.',
      },
      {
        title: 'Household',
        body: 'Create or join a family with a unique ID. Each member keeps their own meals and goals; the household view shows today’s logged calories.',
      },
      {
        title: 'Water, BMI, and portions',
        body: 'Log glasses of water, check BMI from height and weight, and size a portion against remaining calories for the day.',
      },
    ],
  },
];
