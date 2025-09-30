# Cultivasia CRM — Architecture (High Level)

This document maps the main routes, components, API endpoints, and data models.
It helps us debug faster, onboard easier, and stay consistent.

- Last updated by: Edison & [Brother]
- Context: Built on Replit (Agent 3) + GitHub Desktop workflow

---

## Frontend Pages

| Route         | File                              | Purpose                                | Key Components (guess)   |
|---------------|-----------------------------------|----------------------------------------|--------------------------|
| /auth         | client/src/pages/auth-page.tsx    | Login / Authentication screen          | <LoginForm/>             |
| /calls        | client/src/pages/call-list.tsx    | Show all calls, maybe CRUD             | <CallsTable/>, <CallForm/> |
| /dashboard    | client/src/pages/dashboard.tsx    | Main overview with KPIs and shortcuts  | <KpiCards/>, <Sidebar/>  |
| * (fallback)  | client/src/pages/not-found.tsx    | Shown if route doesn’t exist (404)     | –                        |
| /setup        | client/src/pages/setup.tsx        | Initial setup screen (first-time use?) | <SetupForm/>             |
| /transactions | client/src/pages/transactions.tsx | Transactions list + filters            | <TransactionsTable/>, <Filters/> |

---

## Frontend Components (selected)

| Component       | File                              | Purpose                                  | Likely Used By           |
|-----------------|-----------------------------------|------------------------------------------|--------------------------|
| Sidebar         | client/src/components/sidebar.tsx | Left navigation (Monday.com style)       | Dashboard, Transactions, Calls |
| CustomerModal   | client/src/components/customer-modal.tsx | Popup to view or edit customer info | Customers page           |
| UpsellModal     | client/src/components/upsell-modal.tsx | Popup for upsell offers/details         | Upsells page             |
| CsvImport       | client/src/components/csv-import.tsx | Upload CSVs into the CRM (data import)  | Setup page, Admin tools  |
| ui/ (folder)    | client/src/components/ui/         | Generic UI pieces (buttons, inputs, etc) | All pages/components     |

---

## API Endpoints (from server/routes.ts)

### Auth & Middleware
- **requireAuth** → user must be logged in (`req.isAuthenticated()` check)
- **requireAdmin** → user must be logged in **and** have `role: 'admin'`

---

### Products API
| Method | Path              | Purpose               | Needs Auth?       | Notes |
|--------|-------------------|-----------------------|-------------------|-------|
| GET    | /api/products     | List all products     | Yes (requireAuth) | Returns array of products |
| POST   | /api/products     | Create new product    | Yes (requireAdmin)| Validates body with Zod schema |
| PUT    | /api/products/:id | Update product by ID  | Yes (requireAdmin)| Returns 404 if not found |

---

### Calls API
| Method | Path                       | Purpose                 | Needs Auth?       | Notes |
|--------|----------------------------|-------------------------|-------------------|-------|
| GET    | /api/calls                 | List calls (with filters) | Yes (requireAuth) | Filters: `dateFrom`, `dateTo`, `status`, `agentId`, `callType`, `search` |
| POST   | /api/calls                 | Create new call         | Yes (requireAuth) | Rejects duplicates (phone + date) |
| PUT    | /api/calls/:id             | Update call by ID       | Yes (requireAuth) | Partial updates allowed; 404 if not found |
| POST   | /api/calls/:id/assign      | Assign call to agent    | Yes (requireAuth) | Body requires `{ agentId }`; 404 if not found |
| POST   | /api/calls/import          | Import calls from CSV   | Yes (requireAdmin)| Uses `multer` + `Papa.parse`; auto-assigns agents round-robin |

---

### Transactions API
| Method | Path                    | Purpose                      | Needs Auth?       | Notes |
|--------|-------------------------|------------------------------|-------------------|-------|
| GET    | /api/transactions       | List transactions            | Yes (requireAuth) | Filters: `dateFrom`, `dateTo`, `status` (with special cases), `agentId`, `callType`, `search`, `isUpsell` |
| GET    | /api/transactions/:id   | Get transaction by ID        | Yes (requireAuth) | Returns 404 if not found |

---

## Data Models (rough)

*(Based on routes & naming; refine later with actual DB schema)*

### User
- id, email, password_hash, role, created_at

### Call
- id, agent_id, customer_id, outcome, notes, created_at

### Customer
- id, name, phone, email, tags, created_at

### Product
- id, name, description, price, created_at

### Upsell
- id, customer_id, product, amount, created_at

### Transaction
- id, customer_id, agent_id, product_id, amount, status, payment_method, created_at

---

## App Flows

### Flow 1 — Login → Dashboard

**Why (in one line):** If login is broken, nothing else works. This flow shows how the user gets authenticated and lands on the app.

**Frontend page(s):**
- `/auth` → `client/src/pages/auth-page.tsx`
- Redirect target: `/dashboard` → `client/src/pages/dashboard.tsx`

**API endpoint(s):**
- `POST /api/login` (logs in; sets session cookie)
- `GET /api/user` (returns current logged-in user)

**Data touched:**
- `users` table (check credentials)
- `sessions` (stores the logged-in user id)

**Steps (plain English):**
1) User opens **/auth** and types username + password.  
2) Frontend sends **POST `/api/login`** with those credentials.  
3) Server checks them, then sets a **session cookie** in the browser.  
4) Frontend calls **GET /api/user`** to confirm who is logged in.  
5) If it returns 200 + user data → **redirect to `/dashboard`**.  
6) If not, show “Invalid credentials” on the login page.

**Gotchas:**
- Frontend must include cookies: `fetch(url, { credentials: 'include' })`.  
- Server must allow cookies from the client origin (CORS with `credentials: true`).  
- Frontend must call **`/api/login`** (not `/auth/login`).  
- After login, frontend should call **`/api/user`** before redirecting.

**Diagram:**
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (/auth)
  participant BE as Backend (auth.ts)
  participant DB as DB (users & sessions)

  U->>FE: type username + password
  FE->>BE: POST /api/login (credentials: include)
  BE->>DB: validate user (check password)
  BE-->>FE: 200 + set session cookie
  FE->>BE: GET /api/user (credentials: include)
  BE-->>FE: 200 { user }
  FE->>U: redirect to /dashboard
