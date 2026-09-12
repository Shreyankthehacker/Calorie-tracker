# API Design

Base URL:

```text
/api/v1
```

---

# Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

---

# Goals

```text
GET    /goals
POST   /goals
GET    /goals/:id
PUT    /goals/:id
DELETE /goals/:id
```

Goals belong to the authenticated user.

---

# Food Entries

```text
POST   /food-entries
GET    /food-entries
GET    /food-entries/:id
PUT    /food-entries/:id
DELETE /food-entries/:id
```

Supported filters:

```text
startDate
endDate
mealType
page
pageSize
```

Example:

```text
GET /food-entries?startDate=2026-09-01&endDate=2026-09-07&mealType=DINNER&page=1&pageSize=20
```

---

# Reports

```text
GET /reports/calories
GET /reports/macros
GET /reports/micros
GET /reports/goals
```

Reports should support a time range.

Example:

```text
GET /reports/calories?startDate=2026-09-01&endDate=2026-09-07
```

---

# AI Nutrition Extraction

```text
POST /ai/nutrition-extract
```

Input:

```text
multipart/form-data
image=<file>
```

Response should contain structured nutrition information.

The response is intended to pre-fill a food entry and must not automatically create a database entry.

---

# Common API Response Pattern

Successful list response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

---

# HTTP Status Codes

Use appropriate status codes:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

# API Rules

- Validate every request.
- Authenticate protected endpoints.
- Enforce resource ownership.
- Paginate list endpoints.
- Never expose sensitive user information.
- Return consistent error structures.