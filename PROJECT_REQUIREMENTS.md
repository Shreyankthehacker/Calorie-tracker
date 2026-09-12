# Personal Calorie Tracker — Project Requirements

## 1. Objective

Build a full-stack Personal Calorie Tracker that allows users to monitor, manage, and understand their daily nutritional intake.

Users should be able to:

- Set health and nutrition goals.
- Log meals.
- Track calories and macronutrients.
- Track micronutrients.
- View historical food entries.
- Analyze nutrition trends.
- Compare actual intake against goals.
- Use AI to extract nutrition information from food images.

---

# 2. Required Features

## 2.1 Goal Setting

Users must be able to create and manage personal health goals.

Supported goals should include:

- Daily calorie target
- Daily protein target
- Daily carbohydrate target
- Daily fat target
- Weight goal

Goals must be persisted in the database.

---

# 3. Meal Entries

Users must be able to create food entries.

Supported meal types:

- Breakfast
- Lunch
- Dinner
- Snacks

Each food entry must support:

- Food item name
- Quantity
- Calories
- Protein
- Carbohydrates
- Fat
- Micronutrients

---

# 4. Food Entry Listing

Users must be able to list food entries within a specified time range.

Filtering must support:

- Start date
- End date
- Meal type

List APIs must support pagination.

---

# 5. Nutrition Reports

The application must provide visual nutrition reports.

Required reports:

### Weekly calorie intake trend

Show calorie intake by day over a weekly period.

### Macronutrient breakdown

Show:

- Protein
- Carbohydrates
- Fat

by day and/or week.

### Micronutrient summary

Show relevant vitamins and minerals over the selected period.

### Goal vs Actual

Compare actual nutrition intake against the user's configured goals.

---

# 6. AI-Powered Nutrition Extraction

Users must be able to upload an image containing:

- A nutrition label
- A plate of food

The application should use AI image analysis to extract nutritional information.

Extracted data should be converted into structured data.

The extracted values must be displayed to the user for review.

The user must be able to modify the values before saving the food entry.

---

# 7. Data Persistence

Persist:

- User data
- Goals
- Food entries
- Nutrition data

in a relational database.

---

# 8. API Architecture

Frontend and backend must be separate applications.

The frontend communicates with the backend exclusively through APIs.

The backend must expose REST APIs.

---

# 9. Pagination

All list APIs must support pagination.

Pagination must:

- have a maximum page size
- avoid unbounded database queries
- return enough metadata for the frontend

---

# 10. Code Quality

The implementation should demonstrate:

### Clean Code

- meaningful names
- readable functions
- limited complexity

### Modularity

Separate:

- routes
- controllers/handlers
- business logic
- repositories
- database access

### Documentation

Provide:

- README
- setup instructions
- architecture documentation
- assumptions

### Error Handling

Implement:

- input validation
- consistent API errors
- database error handling
- authentication errors
- authorization errors
- AI extraction errors

---

# 11. Bonus Features

These are secondary to the core requirements.

## Conversational AI

Users can interact with the application through natural language to:

- log meals
- check goals
- ask nutritional questions
- receive weekly summaries
- perform application actions

## Multi-User Support

Users can:

- register
- log in
- maintain private data

## PDF Import

Users can upload a tabular food diary/nutrition history PDF.

The application should parse and import the entries.

---

# 12. Future Feature

After the core product is complete, the application may be extended with family nutrition management.

Potential functionality:

- Family creation
- Invitations
- Family memberships
- Roles
- Permissions
- Visibility controls
- Family dashboards
- Family meal planning

This is intentionally outside the initial implementation scope.