# AresMarket — Technical Requirements Specification

**Document type:** Software Requirements Specification (SRS) for testing practice  
**Product:** AresMarket — Martian Colony Marketplace  
**Audience:** QA interns / full-stack tester trainees  
**Language of UI:** Russian (primary), with locale switcher  
**Version:** 1.1  
**Status:** Baseline for test artifact development  

---

## 1. Purpose of this document

This document describes the **expected behaviour** of the AresMarket web application.  
Trainees shall use it as the single source of truth to independently produce:

| Artifact | Expected outcome |
|----------|------------------|
| Test Strategy | High-level approach, scope, risk areas, test levels |
| Test Plan | Schedule, entry/exit criteria, environment, responsibilities |
| Test Scenarios | End-to-end user journeys |
| Test Cases | Detailed steps with expected results (linked to requirements) |
| Checklists | Smoke, regression, UI, API, localization, roles, security-oriented lists |
| Test Data | Valid / invalid / boundary datasets |
| Bug Reports | Defects found against these requirements |
| Traceability Matrix | Requirement ID ↔ Test Case ID coverage |
| Test Report | Summary of execution, coverage, residual risks |

**Important for trainees:**  
Compare actual system behaviour with this specification. Any deviation is a potential defect and must be reported using the in-app **Bug Reports** feature (or an external template if required by the mentor).

---

## 2. Product overview

### 2.1 Description

AresMarket is a cross-platform web marketplace for residents of a fictional Martian colony.  
Users browse a product catalogue, manage a shopping cart, place orders, leave reviews, switch interface locale, submit feedback with file attachments, and file bug reports about the application itself (training feature).

### 2.2 Business goals (training context)

- Provide a realistic e-commerce-like application for functional, UI, API, role-based, and exploratory testing practice.
- Allow trainees to practice writing structured test documentation and bug reports.
- Cover disciplines typical for a full-stack tester internship: UI, REST API, data integrity, localization, validation, file upload, basic access control.

### 2.3 Technology snapshot (for environment planning)

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python), REST API, JWT authentication |
| Database | SQLite |
| Frontend | Single-page application (HTML / CSS / JavaScript), Bootstrap 5 |
| API docs | OpenAPI / Swagger UI at `/api/docs` |
| Currency | Sols (Ṡ) — primary; Earth Credits (₡) — informational |
| Packaging | Docker / Docker Compose supported |

---

## 3. Scope

### 3.1 In scope

- User registration and authentication (JWT)
- Role model: **guest**, **colonist**, **admin**
- Product catalogue: list, filter, search, sort, product detail
- Shopping cart (add, update quantity, remove) — authenticated only
- Order placement and order history — authenticated only
- Product reviews — authenticated only
- Locale switching (Earth locales and Martian locale)
- In-application bug report creation and listing
- Feedback form with multi-file attachments
- Admin panel capabilities (user list, all orders, feedback inbox, delete bug reports)
- Responsive UI for desktop and mobile browsers
- Public REST API consumed by the UI and available for direct testing
- Deployment via local Python process or Docker Compose

### 3.2 Out of scope

- Real payment processing
- Email / SMS notifications
- Full CMS / product management UI for admin
- Performance / load testing targets (unless assigned separately)
- Native mobile applications
- Production-grade high availability and multi-instance clustering

---

## 4. Users and roles

| Role | How to obtain | Capabilities |
|------|----------------|--------------|
| **Guest** (unauthenticated) | Open the app without login | Browse catalogue and product details; switch locale; open Guide; submit feedback; view bug report list; open login/register |
| **Colonist** | Register or use demo `nova` | All guest capabilities + cart, checkout, own orders, product reviews, create bug reports |
| **Admin** | Demo `admin` (or role assigned in data) | All colonist capabilities + delete bug reports + list all feedback + admin APIs (all users, all orders) + Admin UI section |

**Access control expectations:**

| Action | Guest | Colonist | Admin |
|--------|-------|----------|-------|
| Browse catalogue / product | Yes | Yes | Yes |
| Cart / checkout / own orders | No (401 / redirect to login) | Yes | Yes |
| Submit review | No | Yes | Yes |
| Submit feedback (+ files) | Yes | Yes | Yes |
| List **all** feedback | No | **No (403)** | Yes |
| Delete bug report | No | **No (403)** | Yes |
| Admin: list users / all orders | No | **No (403)** | Yes |

**Demo accounts (seed data):**

| Username | Password | Role |
|----------|----------|------|
| nova | nova123 | colonist |
| admin | admin123 | admin |

---

## 5. Functional requirements

Requirements are identified as **FR-XXX** for traceability.

### 5.1 Authentication and profile

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | A guest shall be able to register with email, username, password, optional full name, and colony. |
| FR-AUTH-02 | Username and email shall be unique. Duplicate registration shall be rejected with a clear error. |
| FR-AUTH-03 | Password shall meet the minimum length defined by the system (at least 4 characters). Stronger password policy may be expected by testers as a quality observation. |
| FR-AUTH-04 | A registered user shall log in with username and password and receive a JWT access token. |
| FR-AUTH-05 | Invalid credentials shall be rejected without revealing whether username or password was wrong (security-friendly behaviour is acceptable). |
| FR-AUTH-06 | Authenticated requests shall include the Bearer token. Expired or invalid tokens shall result in HTTP 401. |
| FR-AUTH-07 | The user shall be able to log out (client discards token). |
| FR-AUTH-08 | The system shall expose current user profile data for an authenticated session (`/api/auth/me`), including **role**. |
| FR-AUTH-09 | UI shall indicate the current role (e.g. badge `colonist` / `admin`) when the user is logged in. |

### 5.2 Catalogue and product detail

| ID | Requirement |
|----|-------------|
| FR-CAT-01 | The system shall display a list of active products with name, brand, price in Sols, optional Credits price, image/emoji placeholder, and stock-related information where applicable. |
| FR-CAT-02 | Products shall belong to categories (e.g. Life Support, Construction, Food, Gear, Energy, Communication). |
| FR-CAT-03 | The user shall filter products by category. |
| FR-CAT-04 | The user shall filter products by minimum and maximum price in Sols. Boundary values shall be included according to inclusive price range rules (`min_price` ≤ price ≤ `max_price`). |
| FR-CAT-05 | The user shall search products by text. Search shall be case-insensitive and match relevant product fields (at least name; ideally also description/brand). |
| FR-CAT-06 | The user shall sort products by: price ascending, price descending, rating, name. Sort direction must match the selected option. |
| FR-CAT-07 | Featured products shall be identifiable and available as a filtered/highlighted set on the home page. |
| FR-CAT-08 | Product detail page shall show full description, Martian-style name (if any), price, stock, rating, and actions (add to cart, reviews). |
| FR-CAT-09 | Requesting a non-existent product ID shall return HTTP 404. |
| FR-CAT-10 | Only active products shall appear in the public catalogue. |
| FR-CAT-11 | Catalogue browsing shall be available to **guests** without authentication. |

### 5.3 Shopping cart

| ID | Requirement |
|----|-------------|
| FR-CART-01 | Only authenticated users (colonist/admin) may use the cart. Guests attempting cart actions shall be prompted to log in or receive HTTP 401 on API. |
| FR-CART-02 | User shall add a product to the cart with a positive integer quantity. |
| FR-CART-03 | Quantity shall not exceed available stock at the time of add/update. |
| FR-CART-04 | Adding the same product again shall increase quantity (or merge lines), not create uncontrolled duplicates, subject to stock rules. |
| FR-CART-05 | User shall update quantity of a cart line. Quantity `0` shall remove the line (or equivalent clear behaviour documented in UI). |
| FR-CART-06 | User shall remove a cart line. |
| FR-CART-07 | Cart total in Sols shall equal the sum of (unit price × quantity) for all lines, displayed with clear numeric formatting. |
| FR-CART-08 | Cart badge / counter in the header shall reflect the total number of items (sum of quantities) and update after add/update/remove without requiring a full page reload. |

### 5.4 Orders

| ID | Requirement |
|----|-------------|
| FR-ORD-01 | Authenticated user with a non-empty cart shall place an order specifying delivery colony. |
| FR-ORD-02 | Empty cart checkout shall be rejected with a clear error. |
| FR-ORD-03 | Successful checkout shall create an order with status (e.g. `pending`), total, delivery colony, and timestamp. |
| FR-ORD-04 | Successful checkout shall clear the user’s cart. |
| FR-ORD-05 | Stock levels shall be reduced according to ordered quantities (data integrity). |
| FR-ORD-06 | User shall view **their own** order history, newest first. |
| FR-ORD-07 | Colonist shall not see other users’ orders via the standard “my orders” API. |
| FR-ORD-08 | Admin shall be able to list orders across users via an admin endpoint/UI. |

### 5.5 Reviews

| ID | Requirement |
|----|-------------|
| FR-REV-01 | Authenticated user shall submit a review for a product: rating 1–5, title, optional body. |
| FR-REV-02 | Reviews shall be listed on the product detail page (visible to guests). |
| FR-REV-03 | Product aggregate rating shall remain consistent with submitted reviews (recalculated or otherwise accurate). |
| FR-REV-04 | Business rule expectation: one review per user per product (duplicate reviews should be prevented or clearly allowed by design — document actual vs expected). |
| FR-REV-05 | Guests shall not submit reviews (401 / login required). |

### 5.6 Localization

| ID | Requirement |
|----|-------------|
| FR-LOC-01 | UI shall provide a locale switcher with at least: Russian (Earth), English (Earth), Martian (Ares). |
| FR-LOC-02 | Selecting an Earth locale (`ru` / `en`) shall succeed (HTTP 200) and confirm the active locale. |
| FR-LOC-03 | Selecting Martian locale shall provide a **usable or explicitly partial** localization response (HTTP 200) with a string dictionary for UI labels. |
| FR-LOC-04 | Martian UI strings shall be complete, correct for the selected language, and not truncated mid-word; placeholders shall match the active locale language. |
| FR-LOC-05 | Locale API shall not return HTTP 500 for a normal Martian locale request under standard operation. |
| FR-LOC-06 | If a dedicated diagnostic/crash locale path exists for training, it must not be invoked as part of the **normal** UI locale-switch success path without a clear product reason. |
| FR-LOC-07 | Switching locale shall not break navigation or leave the UI in an inconsistent half-updated state. |

### 5.7 Bug reports (training module)

| ID | Requirement |
|----|-------------|
| FR-BUG-01 | A user shall create a bug report with: title, steps to reproduce, expected result, actual result, severity, priority, optional discipline, environment, reporter name. |
| FR-BUG-02 | Mandatory fields shall be validated; incomplete reports shall be rejected with HTTP 400 and a meaningful message. |
| FR-BUG-03 | Submitted reports shall appear in a list, newest first. |
| FR-BUG-04 | List shall support filtering by discipline and severity and searching by title. |
| FR-BUG-05 | Severity values shall be restricted to an agreed set (e.g. blocker, critical, major, minor, trivial) or validated; invalid values shall not be silently corrupted without feedback. |
| FR-BUG-06 | **Only admin** may delete a bug report. Colonist and guest shall receive HTTP 403 (or no delete control in UI). |
| FR-BUG-07 | Delete control in UI shall be shown only to admin. |

### 5.8 Feedback form (with attachments)

| ID | Requirement |
|----|-------------|
| FR-FB-01 | Guest and authenticated users shall submit feedback: name, email, category, subject, message, optional rating, optional file attachments. |
| FR-FB-02 | Email shall be validated for basic format (presence of `@` and domain pattern) on client and/or server. |
| FR-FB-03 | Rating, when provided, shall be in range **1–5**. Values outside the range shall be rejected or clearly blocked. |
| FR-FB-04 | Documented attachment limits: **maximum 3 files** per submission; **maximum 5 MB per file**. |
| FR-FB-05 | Allowed attachment types (as documented in UI): PDF, PNG, JPG/JPEG, GIF, TXT, DOC, DOCX, CSV, XLSX. Disallowed types shall be rejected with a clear error. |
| FR-FB-06 | Successful submission shall return HTTP 201 and a confirmation visible in UI. |
| FR-FB-07 | **Only admin** may list all feedback entries (`GET /api/feedback`). Colonist shall receive HTTP 403. |
| FR-FB-08 | Category values shall match the set offered in the UI (or extra values must be documented). |
| FR-FB-09 | Feedback message content shall be stored and displayed safely (no script execution when rendered). |

### 5.9 Admin capabilities

| ID | Requirement |
|----|-------------|
| FR-ADM-01 | Admin UI section shall be available only when `role === admin`. |
| FR-ADM-02 | Admin shall list all registered users (id, username, email, role, colony, active flag). |
| FR-ADM-03 | Admin shall list orders across users (limited list acceptable, e.g. last 100). |
| FR-ADM-04 | Admin shall list all feedback submissions. |
| FR-ADM-05 | Colonist calling admin endpoints shall receive HTTP **403 Forbidden**. |
| FR-ADM-06 | Guest calling admin endpoints shall receive HTTP **401 Unauthorized**. |

### 5.10 Navigation and content pages

| ID | Requirement |
|----|-------------|
| FR-NAV-01 | Main navigation shall include: Home, Catalogue, Cart, Orders, Bug Reports, Feedback, How to Test (Guide), Login/Register or user menu. |
| FR-NAV-02 | Guide page shall describe testing focus areas and main API endpoints for trainees. |
| FR-NAV-03 | Footer shall display product name and copyright information with a current or correctly managed year. |
| FR-NAV-04 | Application shall be usable on desktop and mobile viewport widths (responsive layout). |
| FR-NAV-05 | Admin navigation entry shall appear only for admin users. |

---

## 6. API requirements (summary)

Base path: `/api`  
Interactive documentation: `/api/docs` (Swagger UI)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/auth/register` | No | — | Register user |
| POST | `/auth/login` | No | — | Login (form-urlencoded), returns JWT |
| GET | `/auth/me` | Yes | any auth | Current user incl. role |
| GET | `/categories` | No | — | List categories |
| GET | `/products` | No | — | List/filter/sort products |
| GET | `/products/{id}` | No | — | Product detail |
| GET | `/cart` | Yes | colonist, admin | Current cart |
| POST | `/cart/items` | Yes | colonist, admin | Add item |
| PATCH | `/cart/items/{id}` | Yes | colonist, admin | Update quantity |
| DELETE | `/cart/items/{id}` | Yes | colonist, admin | Remove item |
| POST | `/orders` | Yes | colonist, admin | Create order |
| GET | `/orders` | Yes | colonist, admin | My orders |
| POST | `/reviews` | Yes | colonist, admin | Create review |
| GET | `/products/{id}/reviews` | No | — | List reviews |
| GET | `/locale/{lang}` | No | — | Switch/query locale (`ru`, `en`, `mars`, …) |
| GET | `/locale/mars/crash` | No | — | Diagnostic path (must not be required for normal UI locale success) |
| GET/POST | `/bugreports` | See FR-BUG | — | List / create bug reports |
| GET | `/bugreports/{id}` | No* | — | Get report |
| DELETE | `/bugreports/{id}` | Yes | **admin only** | Delete report |
| POST | `/feedback` | Optional | guest+ | Create feedback (multipart) |
| GET | `/feedback` | Yes | **admin only** | List all feedback |
| GET | `/admin/users` | Yes | **admin only** | List users |
| GET | `/admin/orders` | Yes | **admin only** | List all orders |
| GET | `/stats` | No | — | Basic counters |

**General API rules expected by testers:**

- JSON request/response except login (form-urlencoded) and feedback (multipart/form-data).
- Correct HTTP status codes: 200/201 success, 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 500 only for genuine uncontrolled failures.
- Consistent error body with a readable `detail` or `message`.
- Cart, order, and review operations require authentication.
- Admin-only operations enforce role checks server-side (not only UI hiding).

---

## 7. Business rules

| ID | Rule |
|----|------|
| BR-01 | Currency for calculations and checkout is **Sols**. Credits are informational only. |
| BR-02 | Stock cannot go negative. Orders and cart updates must respect stock. |
| BR-03 | Order total = Σ (line price_sols × quantity) at time of order. |
| BR-04 | After successful order, cart is empty and stock is decremented. |
| BR-05 | Search and filters combine with AND semantics unless documented otherwise. |
| BR-06 | Price filter range is inclusive on both ends. |
| BR-07 | Sort “price ascending” shows cheapest first; “price descending” shows most expensive first. |
| BR-08 | Role `admin` is a superset of `colonist` for marketplace actions, plus admin-only APIs. |
| BR-09 | Feedback attachment limits: max 3 files, max 5 MB each, allowed types as in FR-FB-05. |

---

## 8. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Usability | Primary flows (browse → add to cart → checkout) completable without documentation for a new authenticated user. |
| NFR-02 | Responsive design | Layout usable from ~320px width to desktop; no critical overlap or unreachable controls on mobile. |
| NFR-03 | Compatibility | Latest Chrome, Firefox, Safari (desktop); mobile Safari / Chrome Android. |
| NFR-04 | Performance (soft) | Catalogue and cart interactions respond under normal local/Docker load within a time acceptable for training. |
| NFR-05 | Security (basic) | Passwords stored hashed; API protected by JWT where required; admin actions enforced server-side; no anonymous destructive actions on other users’ data. |
| NFR-06 | Accessibility (soft) | Interactive elements reachable; form labels present; contrast sufficient for main content. |
| NFR-07 | Data persistence | User, cart, order, review, bug report, and feedback data persist across page reloads (until DB/volume reset). |
| NFR-08 | API discoverability | OpenAPI/Swagger available and matches implemented endpoints. |
| NFR-09 | Deployability | Application shall run via `uvicorn` locally and via `docker compose up --build` with published port 8000 (or `PORT` override). |

---

## 9. Data requirements

### 9.1 Core entities

- **User:** email, username, password hash, full name, **role** (`colonist` \| `admin`), colony, active flag  
- **Category:** code, name, optional Martian name, description, icon  
- **Product:** SKU, name, Martian name, brand, description, price_sols, price_credits, stock, category, rating, featured flag, active flag  
- **Cart item:** user, product, quantity  
- **Order / order item:** user, totals, status, delivery colony, line snapshots  
- **Review:** product, user, rating, title, body  
- **Bug report:** title, discipline, steps, expected, actual, severity, priority, environment, reporter, status, timestamps  
- **Feedback:** name, email, category, subject, message, rating, attachments (stored file references), optional user_id, status, timestamps  

### 9.2 Seed / reference data expectations

- Multiple categories and at least 10+ products with varied prices and stock.  
- At least two demo users: colonist (`nova`) and admin (`admin`).  
- Featured products available on the home page.  

### 9.3 Test data guidance (for trainees)

Prepare datasets covering:

- Valid registration / login for colonist and admin  
- Duplicate email and username  
- Guest vs colonist vs admin on protected endpoints (401 / 403 matrix)  
- Boundary quantities: 0, 1, stock, stock+1, negative (if UI allows)  
- Price filters: exact min, exact max, inverted range  
- Search: lower/upper case, partial match, empty, special characters  
- Locale codes: `ru`, `en`, `mars`, invalid  
- Feedback: 0/1/3/4 files; files ≈5 MB and >5 MB; valid/invalid extensions; invalid email; rating 0, 5, 6, 10  
- Bug report mandatory field omissions; severity valid/invalid  
- Admin delete bug report vs colonist delete attempt  

---

## 10. User interface requirements

| ID | Requirement |
|----|-------------|
| UI-01 | Consistent navigation bar on all main views. |
| UI-02 | Cart badge visible when items exist (authenticated). |
| UI-03 | Clear feedback (toast/alert) on success and error actions. |
| UI-04 | Forms show validation messages for required fields. |
| UI-05 | Product cards display essential info without horizontal overflow on mobile. |
| UI-06 | Primary actions (Add to cart, Place order, Submit bug report, Submit feedback) visually distinct. |
| UI-07 | Role badge visible for logged-in users. |
| UI-08 | Admin section reachable from navigation for admin only. |
| UI-09 | Feedback form documents file limits and allowed types next to the file control. |

---

## 11. Environments

| Environment | Purpose / how to run |
|-------------|----------------------|
| Local Python | `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000` |
| Docker Compose | `docker compose up --build` → http://localhost:8000 (override with `PORT=8001`) |
| UI URL | `http://localhost:8000` |
| API docs | `http://localhost:8000/api/docs` |
| Database | SQLite file (local) or volume `ares-data` (Docker) |
| Uploads | Local `uploads/` or `/data/uploads` in container |

Trainees may use browser DevTools, Postman/Insomnia, and SQLite CLI as supporting tools.

**Reset tips:**

- Local: stop server, delete `ares_market.db`, restart (seed data recreated).  
- Docker: `docker compose down -v` removes volume data.

---

## 12. Assumptions and constraints

1. Requirements describe **intended** product behaviour for training. Observed deviations are defects unless the mentor explicitly marks them as accepted limitations.  
2. The in-app Bug Reports module is part of the system under test **and** the channel for reporting other defects.  
3. Russian UI labels are expected; API may use English field names.  
4. No real personal data should be entered; use fictional colony identities only.  
5. File uploads are for training only; malware scanning is out of scope, but type/size rules in this document still apply as functional requirements.

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| Sol (Ṡ) | Primary currency of the Martian colony |
| Credit (₡) | Earth currency shown for reference |
| Colony | Delivery / home location (e.g. Olympus City, Valles Base) |
| Guest | Unauthenticated visitor |
| Colonist | Authenticated standard user |
| Admin | Authenticated administrator with elevated API/UI rights |
| Featured product | Product promoted on the home page |
| Bug report | Structured defect record created inside the application |
| Feedback | User message with optional file attachments |

---

## 14. Requirement groups for traceability

When building the **Traceability Matrix**, map test cases at least to:

- FR-AUTH-*  
- FR-CAT-*  
- FR-CART-*  
- FR-ORD-*  
- FR-REV-*  
- FR-LOC-*  
- FR-BUG-*  
- FR-FB-*  
- FR-ADM-*  
- FR-NAV-*  
- BR-*  
- NFR-* (sample coverage is acceptable)  
- UI-*  

Minimum expected coverage for internship delivery:

- 100% of critical path: AUTH login/register, CAT list/detail, CART/ORD for colonist, guest restriction on cart, LOC switch (Earth + Martian), BUG create, FB submit  
- Role matrix: colonist **403** on admin APIs; admin success on admin APIs  
- Representative coverage of filters, sort, search, validation, file limits, and negative cases  
- At least one exploratory session documented  

---

## 15. Suggested artifact checklist for trainees

Use this specification to produce:

1. **Test Strategy** — goals, levels (smoke / functional / API / UI / roles / regression), risks, tools  
2. **Test Plan** — scope, schedule, entry/exit criteria, environment (Python and/or Docker), deliverables  
3. **Test Scenarios** — e.g. “Guest browses; colonist buys oxygen tank; admin reviews feedback”  
4. **Test Cases** — ID, title, preconditions, steps, expected result, requirement ID, priority  
5. **Checklists** — smoke, mobile UI, API status codes, localization, roles 401/403, feedback uploads  
6. **Test Data** — tables of inputs (valid/invalid/boundary), including files for feedback  
7. **Bug Reports** — filed in the app; export or screenshots for the portfolio if needed  
8. **Traceability Matrix** — Requirement ID ↔ Test Case ID(s) ↔ status  
9. **Test Report** — executed vs planned, pass/fail, defects, residual risk, conclusion  

---

## 16. Document control

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-09-08 | Training team | Initial baseline |
| 1.1 | 2026-09-08 | Training team | Roles guest/colonist/admin; feedback+attachments; locale expectations; admin APIs; Docker environment |

**Related materials:**  
- `STUDENT_GUIDE.md` — beginner runbook  
- Application README  
- Internal intentional defect list (mentor only, if provided)

---

*End of Technical Requirements Specification*
