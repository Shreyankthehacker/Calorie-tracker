# Development Plan

The project will be implemented incrementally.

---

## Phase 0 — Project Foundation

- Initialize Git repository
- Create backend
- Create frontend
- Configure TypeScript
- Configure environment variables
- Configure linting/formatting
- Configure PostgreSQL
- Configure Prisma
- Create basic health endpoint
- Create basic frontend shell

### Completion Criteria

```text
Frontend runs
Backend runs
Database connects
Health endpoint works
Frontend can call backend
```

---

# Phase 1 — Authentication

Implement:

- Registration
- Login
- Password hashing
- JWT authentication
- Refresh token flow
- Current-user endpoint

### Completion Criteria

A user can register, log in, and access protected endpoints.

---

# Phase 2 — Goals

Implement:

- Goal creation
- Goal retrieval
- Goal update
- Goal deletion
- Validation

### Completion Criteria

Authenticated users can manage their own goals.

---

# Phase 3 — Food Entries

Implement:

- Create food entry
- Retrieve food entry
- Update food entry
- Delete food entry
- Date filtering
- Meal type filtering
- Pagination

### Completion Criteria

Users can completely manage their own food history.

---

# Phase 4 — Nutrition Reports

Implement:

- Daily calorie totals
- Weekly calorie trend
- Macro aggregation
- Micro aggregation
- Goal vs actual

### Completion Criteria

Frontend displays all required nutrition reports.

---

# Phase 5 — AI Nutrition Extraction

Implement:

- Image upload
- Image validation
- AI vision integration
- Structured extraction
- Response validation
- Frontend review UI

### Completion Criteria

User can upload an image and receive editable nutrition information.

---

# Phase 6 — Quality

Implement:

- Backend tests
- API tests
- Frontend tests where useful
- Error handling
- Loading states
- Empty states
- Documentation
- README
- Environment documentation

---

# Phase 7 — Bonus: Conversational AI

Implement only after the core system is stable.

Potential tools:

```text
logMeal
getGoals
getNutritionSummary
getWeeklyReport
searchFood
```

The LLM should call application tools rather than directly accessing the database.

---

# Phase 8 — Bonus: PDF Import

Implement:

```text
PDF
 ↓
Extraction
 ↓
Table detection
 ↓
Normalization
 ↓
Validation
 ↓
Preview
 ↓
Import
```

---

# Phase 9 — Future Family System

Only after the above phases are complete.

Potential functionality:

- Family creation
- Invitations
- Memberships
- Roles
- Permissions
- Visibility settings
- Family dashboard