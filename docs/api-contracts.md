# API Contracts

Base URL: `/api`

Authentication:

- **Session** — `Authorization: Bearer <token>` (token from `POST /auth/verify-code`)
- **Service** — `X-Service-Token: <token>`

Endpoints that need a session can also return `401 UNAUTHORIZED` and `403 FORBIDDEN`.

Every error has the same shape:

```json
{ "error": { "code": "USER_NOT_FOUND", "message": "User not found" } }
```

Dates are ISO 8601 strings. Date filters use `YYYY-MM-DD` and include both days.

Enums:

| Name        | Values                                           |
| ----------- | ------------------------------------------------ |
| Platform    | `bitrix`, `wordpress`, `opencart`, `shopify`     |
| Role        | `customer`, `admin`                              |
| User status | `inactive`, `active`, `blocked`, `removed`       |
| Key status  | `inactive`, `active`, `expired`                  |
| Topic       | `installation`, `activation`, `billing`, `bug`, `other` |
| Solution    | slug, e.g. `personal-price`                      |

List responses:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

---

## System

### GET /health

Auth: none

Response `200`

```json
{ "status": "ok" }
```

### GET /versions

Auth: none

Response `200`

```json
{
  "api": "1.2.0",
  "dashboard": "1.2.0",
  "docs": "1.2.0",
  "commit": "a1b2c3d",
  "builtAt": "2026-09-25T10:00:00.000Z"
}
```

---

## Authentication

### POST /auth/request-code

Auth: none

Request

```json
{ "email": "client@shop.com" }
```

Response `200`

```json
{ "ok": true, "resendAfterSeconds": 60 }
```

Errors

| Status | Code                   |
| ------ | ---------------------- |
| 400    | `VALIDATION_ERROR`     |
| 403    | `USER_BLOCKED`         |
| 404    | `USER_NOT_FOUND`       |
| 429    | `CODE_RESEND_TOO_SOON` |
| 429    | `RATE_LIMITED`         |

### POST /auth/verify-code

Auth: none

Request

```json
{ "email": "client@shop.com", "code": "123456" }
```

Response `200`

```json
{
  "token": "p3Jx...",
  "user": {
    "id": "2f6c0c3e-8a51-4f7e-9a53-0c6c9e0e1d11",
    "email": "client@shop.com",
    "role": "customer",
    "status": "active"
  }
}
```

Errors

| Status | Code                     |
| ------ | ------------------------ |
| 400    | `VALIDATION_ERROR`       |
| 401    | `CODE_INVALID`           |
| 401    | `CODE_EXPIRED`           |
| 403    | `USER_BLOCKED`           |
| 404    | `USER_NOT_FOUND`         |
| 429    | `CODE_ATTEMPTS_EXCEEDED` |
| 429    | `RATE_LIMITED`           |

### GET /auth/me

Auth: session

Response `200`

```json
{
  "id": "2f6c0c3e-8a51-4f7e-9a53-0c6c9e0e1d11",
  "email": "client@shop.com",
  "role": "customer",
  "status": "active"
}
```

Errors

| Status | Code           |
| ------ | -------------- |
| 401    | `UNAUTHORIZED` |

### POST /auth/logout

Auth: session

Response `200`

```json
{ "ok": true }
```

---

## Solutions

### GET /solutions

Auth: session

Response `200`

```json
[
  {
    "id": "0b8d2f7c-5a57-4e3b-9d6e-2f3a1c9b7e10",
    "slug": "personal-price",
    "name": "Personal Price",
    "platform": "bitrix",
    "storeUrl": null
  }
]
```

---

## Invites

### POST /invites

Auth: admin session or service token

Request

```json
{ "email": "client@shop.com", "solutions": ["personal-price"] }
```

One key is created per entry.

Response `201`

```json
{
  "userId": "2f6c0c3e-8a51-4f7e-9a53-0c6c9e0e1d11",
  "created": true,
  "keys": [{ "id": "63d186cc-b651-4c03-9160-52015fa21c7a", "solution": "personal-price", "platform": "bitrix" }]
}
```

Errors

| Status | Code               |
| ------ | ------------------ |
| 400    | `VALIDATION_ERROR` |
| 400    | `UNKNOWN_SOLUTION` |
| 401    | `UNAUTHORIZED`     |
| 403    | `FORBIDDEN`        |
| 409    | `USER_BLOCKED`     |
| 409    | `USER_IS_ADMIN`    |

---

## Customer keys

Key object:

```json
{
  "id": "63d186cc-b651-4c03-9160-52015fa21c7a",
  "platform": "bitrix",
  "solution": { "slug": "personal-price", "name": "Personal Price" },
  "key": "006E-253B-DB66-4070-0FZL-0G9Q",
  "status": "active",
  "activationsUsed": 1,
  "activationLimit": 3,
  "createdAt": "2026-09-25T19:51:33.080Z",
  "expiresAt": "2027-09-25T19:51:33.080Z",
  "regeneratedAt": null
}
```

### GET /keys

Auth: customer session

Query

| Name       | Type                   |
| ---------- | ---------------------- |
| `dateFrom` | `YYYY-MM-DD`           |
| `dateTo`   | `YYYY-MM-DD`           |
| `platform` | Platform               |
| `solution` | Solution               |
| `status`   | Key status             |
| `page`     | number, default 1      |
| `pageSize` | number, default 20, max 100 |

Response `200` — list of key objects

### POST /keys/:id/regenerate

Auth: owner or admin session

Response `200` — key object (`key` is masked for admins)

Errors

| Status | Code            |
| ------ | --------------- |
| 404    | `KEY_NOT_FOUND` |
| 409    | `KEY_EXPIRED`   |

### POST /keys/:id/extend

Auth: owner or admin session

Response `200` — key object

Errors

| Status | Code              |
| ------ | ----------------- |
| 404    | `KEY_NOT_FOUND`   |
| 409    | `KEY_NOT_EXPIRED` |

### PATCH /keys/:id/status

Auth: owner or admin session

Request

```json
{ "status": "inactive" }
```

Response `200` — key object

Errors

| Status | Code               |
| ------ | ------------------ |
| 400    | `VALIDATION_ERROR` |
| 404    | `KEY_NOT_FOUND`    |
| 409    | `KEY_EXPIRED`      |

---

## Plugin

### POST /keys/validate

Auth: none

Request

```json
{ "key": "006E-253B-DB66-4070-0FZL-0G9Q", "domain": "https://www.shop.com", "solution": "personal-price" }
```

`solution` is optional. When sent, a key for another solution is refused.

Response `200`

```json
{
  "valid": true,
  "status": "active",
  "platform": "bitrix",
  "solution": "personal-price",
  "domain": "shop.com",
  "expiresAt": "2027-09-25T19:51:33.080Z",
  "activationsUsed": 1,
  "activationLimit": 3,
  "activatedOnDomain": true
}
```

Errors

| Status | Code             |
| ------ | ---------------- |
| 400    | `INVALID_DOMAIN` |
| 403    | `USER_BLOCKED`      |
| 404    | `KEY_NOT_FOUND`     |
| 409    | `SOLUTION_MISMATCH` |
| 429    | `RATE_LIMITED`      |

### POST /keys/apply

Auth: none

Request

```json
{ "key": "006E-253B-DB66-4070-0FZL-0G9Q", "domain": "shop.com", "solution": "personal-price" }
```

Response `200` — same as `POST /keys/validate`

Errors

| Status | Code                       |
| ------ | -------------------------- |
| 400    | `INVALID_DOMAIN`           |
| 403    | `USER_BLOCKED`             |
| 404    | `KEY_NOT_FOUND`            |
| 409    | `KEY_INACTIVE`             |
| 409    | `KEY_EXPIRED`              |
| 409    | `ACTIVATION_LIMIT_REACHED` |
| 409    | `SOLUTION_MISMATCH`        |
| 429    | `RATE_LIMITED`             |

---

## Support

### POST /support/tickets

Auth: customer session

Request `multipart/form-data`

| Field         | Type                                               |
| ------------- | -------------------------------------------------- |
| `topic`       | Topic                                              |
| `description` | text, 10–5000 characters                           |
| `files`       | up to 3 files, 5 MB each: png, jpeg, pdf, zip, txt |

Response `201`

```json
{ "id": "8c1e7a4e-2f0d-4a57-9d8e-4f5f3f1a6b21" }
```

Errors

| Status | Code                     |
| ------ | ------------------------ |
| 400    | `VALIDATION_ERROR`       |
| 400    | `TOO_MANY_FILES`         |
| 400    | `FILE_TYPE_NOT_ALLOWED`  |
| 413    | `FILE_TOO_LARGE`         |
| 415    | `UNSUPPORTED_MEDIA_TYPE` |

---

## Admin

Auth for every endpoint: admin session

### GET /admin/keys

Query: `dateFrom`, `dateTo`, `platform`, `solution`

`newCustomers24h` and `newKeys24h` count the last 24 hours and ignore `dateFrom`/`dateTo`., `status`, `email` (part of the customer email), `page`, `pageSize`

Response `200` — list of admin key objects

```json
{
  "id": "63d186cc-b651-4c03-9160-52015fa21c7a",
  "userId": "2f6c0c3e-8a51-4f7e-9a53-0c6c9e0e1d11",
  "email": "client@shop.com",
  "platform": "bitrix",
  "solution": { "slug": "personal-price", "name": "Personal Price" },
  "key": "006E…0G9Q",
  "status": "active",
  "activationsUsed": 1,
  "activationLimit": 3,
  "createdAt": "2026-09-25T19:51:33.080Z",
  "expiresAt": "2027-09-25T19:51:33.080Z",
  "regeneratedAt": null
}
```

### PATCH /admin/keys/:id/activation-limit

Request

```json
{ "limit": 5 }
```

`limit`: 1–100

Response `200` — admin key object

Errors

| Status | Code               |
| ------ | ------------------ |
| 400    | `VALIDATION_ERROR` |
| 404    | `KEY_NOT_FOUND`    |

### GET /admin/customers

Query: `dateFrom`, `dateTo`, `platform`, `status` (user status), `email`, `page`, `pageSize`

Response `200` — list of customers

```json
{
  "id": "2f6c0c3e-8a51-4f7e-9a53-0c6c9e0e1d11",
  "email": "client@shop.com",
  "status": "active",
  "keysCount": 2,
  "platforms": ["bitrix"],
  "invitedAt": "2026-09-25T19:51:33.080Z",
  "lastLoginAt": "2026-09-25T20:10:02.511Z"
}
```

### PATCH /admin/customers/:id/status

Request

```json
{ "status": "blocked" }
```

Response `200` — customer object

Errors

| Status | Code               |
| ------ | ------------------ |
| 400    | `VALIDATION_ERROR` |
| 404    | `USER_NOT_FOUND`   |
| 409    | `USER_REMOVED`     |

### GET /admin/stats

Query: `dateFrom`, `dateTo`, `platform`, `solution`

`newCustomers24h` and `newKeys24h` count the last 24 hours and ignore `dateFrom`/`dateTo`.

Response `200`

```json
{
  "customersByStatus": { "inactive": 1, "active": 12, "blocked": 1, "removed": 0 },
  "keysByStatus": { "inactive": 2, "active": 20, "expired": 3 },
  "keysByPlatform": { "bitrix": 5, "wordpress": 10, "opencart": 4, "shopify": 6 },
  "customersByPlatform": { "bitrix": 4, "wordpress": 8, "opencart": 3, "shopify": 5 },
  "totalCustomers": 14,
  "totalKeys": 25,
  "totalActivations": 41,
  "newCustomers24h": 2,
  "newKeys24h": 3,
  "keysBySolution": [{ "slug": "personal-price", "name": "Personal Price", "platform": "bitrix", "count": 25 }],
  "keysPerMonth": [
    { "month": "2026-08", "count": 11 },
    { "month": "2026-09", "count": 14 }
  ]
}
```
