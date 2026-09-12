# Architecture

## 1. High-Level Architecture

```text
┌───────────────────────────────┐
│          React App            │
│        TypeScript + Vite      │
└───────────────┬───────────────┘
                │
                │ HTTPS / REST
                ▼
┌───────────────────────────────┐
│       Node.js Backend         │
│       TypeScript + Fastify    │
│                               │
│  Routes                       │
│     ↓                         │
│  Services                     │
│     ↓                         │
│  Repositories                 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          PostgreSQL           │
│           + Prisma            │
└───────────────────────────────┘

                │
                │
                ▼
        ┌────────────────┐
        │  AI Vision API │
        └────────────────┘
```

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Recharts

## Backend

- Node.js
- TypeScript
- Fastify
- Zod
- Prisma

## Database

PostgreSQL

## Testing

- Vitest
- Fastify API testing

## AI

Vision-capable LLM API.

---

# 3. Backend Architecture

The backend follows:

```text
HTTP Request
     ↓
Route
     ↓
Validation
     ↓
Handler
     ↓
Service
     ↓
Repository
     ↓
Prisma
     ↓
PostgreSQL
```

### Routes

Responsible for:

- defining endpoints
- authentication hooks
- request validation
- calling handlers/services

### Services

Responsible for business logic.

Examples:

```text
GoalService
FoodEntryService
NutritionReportService
AIExtractionService
```

### Repositories

Responsible for database operations.

Examples:

```text
UserRepository
GoalRepository
FoodEntryRepository
```

---

# 4. Frontend Architecture

```text
Pages
 ↓
Feature Components
 ↓
Hooks
 ↓
API Client
 ↓
Backend API
```

Frontend should not contain database logic.

---

# 5. Database Design

Initial entities:

```text
User
  │
  ├── Goal
  │
  └── FoodEntry
          │
          └── FoodEntryNutrient
```

Potential schema:

```text
users
-----
id
email
password_hash
created_at
updated_at


goals
-----
id
user_id
daily_calorie_target
protein_target
carb_target
fat_target
weight_goal
created_at
updated_at


food_entries
------------
id
user_id
meal_type
food_name
quantity
calories
protein
carbs
fat
created_at
updated_at


food_entry_nutrients
--------------------
id
food_entry_id
nutrient_name
amount
unit
```

---

# 6. Data Ownership

Every user-owned resource must contain an ownership relationship.

Example:

```text
food_entries.user_id → users.id
goals.user_id       → users.id
```

The backend must always enforce ownership.

The frontend must never be trusted to enforce access control.

---

# 7. Reporting

Reports should be calculated from persisted food entries.

Example:

```text
Food Entries
     ↓
Aggregate by date
     ↓
Aggregate nutrition
     ↓
Compare against goals
     ↓
Report API
     ↓
Charts
```

Reports should not require storing redundant daily totals unless performance requirements justify caching/materialization later.

---

# 8. AI Extraction

```text
User uploads image
        ↓
Backend validates file
        ↓
AI Vision Service
        ↓
Structured extraction
        ↓
Zod validation
        ↓
Normalized nutrition data
        ↓
Frontend review
        ↓
User confirms
        ↓
Food Entry API
        ↓
Database
```

AI output is never treated as authoritative.

---

# 9. Authentication

Authentication should be implemented at the backend boundary.

The backend determines:

```text
Who is this user?
```

Then services operate on that authenticated user.

A client-provided `user_id` must not override the authenticated identity.

---

# 10. API Versioning

Initial APIs should use:

```text
/api/v1/
```

Example:

```text
/api/v1/auth/login
/api/v1/goals
/api/v1/food-entries
/api/v1/reports
```

---

# 11. Pagination

List APIs should use a common structure.

Example request:

```text
GET /api/v1/food-entries?page=1&pageSize=20
```

Example response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

# 12. Future Extensibility

The architecture should allow future entities such as:

```text
Family
FamilyMember
FamilyInvitation
FamilyPermission
```

without changing the existing ownership model.

The family system should be implemented as a separate authorization layer rather than changing basic user ownership semantics.