import type { LlmToolDefinition } from '../ai/llm-provider.js';

export const CHAT_TOOL_NAMES = [
  'getGoals',
  'getNutritionSummary',
  'getWeeklyReport',
  'listMeals',
  'searchFood',
  'logMeal',
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

export const CHAT_TOOL_NAME_SET = new Set<string>(CHAT_TOOL_NAMES);

export const CHAT_TOOLS: LlmToolDefinition[] = [
  {
    name: 'getGoals',
    description:
      "Read the authenticated user's current DAILY calorie (kcal) and macro (grams) targets. Do not pass a userId. Do not treat these as weekly totals.",
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'getNutritionSummary',
    description:
      "Read aggregated actual intake vs daily and period targets for a date range in the user's timezone. Defaults to today. Use actualIntake for what was eaten; dailyTargets are per day; periodTargets are daily × dayCount. Does not list individual meals — use listMeals for that. Do not pass a userId.",
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Inclusive start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Inclusive end date YYYY-MM-DD' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getWeeklyReport',
    description:
      "Read Monday–Sunday aggregated actualIntake vs dailyTargets and weeklyTargets. Prefer summaryText when answering. This is totals only — call listMeals with period=week to name individual logged meals. Optional startDate selects the week containing that day. Do not pass a userId.",
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Any YYYY-MM-DD in the desired week; defaults to the current week',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'listMeals',
    description:
      'List the authenticated user\'s logged food entries (name, meal type, quantity, calories, macros, time). Use period=today or period=week, or an explicit startDate+endDate. Use this whenever the user asks what they ate. Do not pass a userId.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Inclusive start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Inclusive end date YYYY-MM-DD' },
        period: {
          type: 'string',
          enum: ['today', 'week'],
          description: 'Shortcut when dates are omitted: today or the current Monday–Sunday week',
        },
        mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] },
        page: { type: 'number', description: '1-based page; 50 meals per page' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'searchFood',
    description:
      'Search the application food catalog for estimated nutrition when the user has incomplete values. Results are catalog estimates, not lab measurements. Do not treat this as an authoritative food database.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Food name to search, e.g. banana' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'logMeal',
    description:
      'Propose a food entry for the authenticated user. The application will NOT save it until the user confirms in the UI. Never pass a userId. Never claim the meal was saved.',
    parameters: {
      type: 'object',
      properties: {
        mealType: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] },
        foodName: { type: 'string' },
        quantity: { type: 'number' },
        quantityUnit: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        consumedAt: { type: 'string', description: 'ISO-8601 date-time' },
        micronutrients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nutrientKey: { type: 'string' },
              amount: { type: 'number' },
              unit: { type: 'string' },
            },
            required: ['nutrientKey', 'amount', 'unit'],
          },
        },
      },
      required: [
        'mealType',
        'foodName',
        'quantity',
        'quantityUnit',
        'calories',
        'protein',
        'carbs',
        'fat',
        'consumedAt',
      ],
      additionalProperties: false,
    },
  },
];
