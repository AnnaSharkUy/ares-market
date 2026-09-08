# AresMarket — Technical Requirements Specification

**Document type:** Software Requirements Specification (SRS) for testing practice  
**Product:** AresMarket — Martian Colony Marketplace  
**Audience:** QA interns / full-stack tester trainees  
**Language of UI:** Russian (primary), with locale switcher  
**Version:** 1.0  
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
| Checklists | Smoke, regression, UI, API, localization, security-oriented lists |
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
Users browse a product catalogue, manage a shopping cart, place orders, leave reviews, switch interface locale, and submit bug reports about the application itself (training feature).

### 2.2 Business goals (training context)

- Provide a realistic e-commerce-like application for functional, UI, API, and exploratory testing practice.
- Allow trainees to practice writing structured test documentation and bug reports.
- Cover disciplines typical for a full-stack tester internship: UI, REST API, data integrity, localization, validation, basic security awareness.

### 2.3 Technology snapshot (for environment planning)

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python), REST API, JWT authentication |
| Database | SQLite |
| Frontend | Single-page application (HTML / CSS / JavaScript), Bootstrap 5 |
| API docs | OpenAPI / Swagger UI at `/api/docs` |
| Currency | Sols (Ṡ) — primary; Earth Credits (₡) — informational |

---

## 3. Scope

### 3.1 In scope

- User registration and authentication (JWT)
- Product catalogue: list, filter, search, sort, product detail
- Shopping cart (add, update quantity, remove)
- Order placement and order history
- Product reviews
- Locale switching (Earth locales and Martian locale)
- In-application bug report creation and listing
- Responsive UI for desktop and mobile browsers
- Public REST API consumed by the UI and available for direct testing

### 3.2 Out of scope

- Real payment processing
- Email / SMS notifications
- Admin back-office UI (beyond role flag)
- Performance / load testing targets (unless assigned separately)
- Native mobile applications
- Production-grade high availability

---

## 4. Users and roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| Guest (unauthenticated) | Visitor | Browse catalogue, view product details, open login/register, view guide, switch locale (Earth), view public bug report list |
| Colonist (authenticated user) | Registered colony resident | All guest capabilities + cart, checkout, orders, reviews, full bug report workflow |
| Admin | Colony administrator account | Same as colonist in current training build (extended admin UI is out of scope) |

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
| FR-AUTH-08 | The system shall expose current user profile data for an authenticated session (`/api/auth/me`). |

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

### 5.3 Shopping cart

| ID | Requirement |
|----|-------------|
| FR-CART-01 | Only authenticated users may use the cart. Guests attempting cart actions shall be prompted to log in. |
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
| FR-ORD-06 | User shall view their own order history, newest first. |
| FR-ORD-07 | User shall not see other users’ orders. |

### 5.5 Reviews

| ID | Requirement |
|----|-------------|
| FR-REV-01 | Authenticated user shall submit a review for a product: rating 1–5, title, optional body. |
| FR-REV-02 | Reviews shall be listed on the product detail page. |
| FR-REV-03 | Product aggregate rating shall remain consistent with submitted reviews (recalculated or otherwise accurate). |
| FR-REV-04 | Business rule expectation: one review per user per product (duplicate reviews should be prevented or clearly allowed by design — document actual vs expected). |

### 5.6 Localization

| ID | Requirement |
|----|-------------|
| FR-LOC-01 | UI shall provide a locale switcher with at least: Russian (Earth), English (Earth), Martian (Ares). |
| FR-LOC-02 | Selecting an Earth locale (ru / en) shall succeed and confirm the active locale. |
| FR-LOC-03 | Selecting Martian locale shall either fully switch the UI language **or** fail in a controlled, user-visible way consistent with product policy. Silent failure is not acceptable. |
| FR-LOC-04 | Locale API endpoint shall exist and return appropriate HTTP status codes. |

### 5.7 Bug reports (training module)

| ID | Requirement |
|----|-------------|
| FR-BUG-01 | Any user (or authenticated user, per design) shall create a bug report with: title, steps to reproduce, expected result, actual result, severity, priority, optional discipline, environment, reporter name. |
| FR-BUG-02 | Mandatory fields shall be validated; incomplete reports shall be rejected with HTTP 400 and a meaningful message. |
| FR-BUG-03 | Submitted reports shall appear in a list, newest first. |
| FR-BUG-04 | List shall support filtering by discipline and severity and searching by title. |
| FR-BUG-05 | Severity values shall be restricted to an agreed set (e.g. blocker, critical, major, minor, trivial) or validated; invalid values shall not be silently corrupted without feedback. |
| FR-BUG-06 | Deletion of bug reports, if available, shall be restricted to authorized roles (training expectation: not world-writable without auth). |

### 5.8 Navigation and content pages

| ID | Requirement |
|----|-------------|
| FR-NAV-01 | Main navigation shall include: Home, Catalogue, Cart, Orders, Bug Reports, How to Test (Guide), Login/Register or user menu. |
| FR-NAV-02 | Guide page shall describe testing focus areas and main API endpoints for trainees. |
| FR-NAV-03 | Footer shall display product name and copyright information. Copyright year shall be current or intentionally managed (outdated year is a defect relative to common quality expectations). |
| FR-NAV-04 | Application shall be usable on desktop and mobile viewport widths (responsive layout). |

---

## 6. API requirements (summary)

Base path: `/api`  
Interactive documentation: `/api/docs` (Swagger UI)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register user |
| POST | `/auth/login` | No | Login (form-urlencoded), returns JWT |
| GET | `/auth/me` | Yes | Current user |
| GET | `/categories` | No | List categories |
| GET | `/products` | No | List/filter/sort products |
| GET | `/products/{id}` | No | Product detail |
| GET | `/cart` | Yes | Current cart |
| POST | `/cart/items` | Yes | Add item |
| PATCH | `/cart/items/{id}` | Yes | Update quantity |
| DELETE | `/cart/items/{id}` | Yes | Remove item |
| POST | `/orders` | Yes | Create order |
| GET | `/orders` | Yes | My orders |
| POST | `/reviews` | Yes | Create review |
| GET | `/products/{id}/reviews` | No | List reviews |
| GET | `/locale/{lang}` | No | Switch/query locale |
| GET/POST | `/bugreports` | See FR-BUG | List / create bug reports |
| GET/DELETE | `/bugreports/{id}` | See FR-BUG | Get / delete report |
| GET | `/stats` | No | Basic counters |

**General API rules expected by testers:**

- JSON request/response (except login form encoding).
- Correct HTTP status codes: 200/201 success, 400 validation, 401 unauthorized, 404 not found, 500 only for genuine server failures.
- Consistent error body with a readable `detail` or `message`.
- Cart and order operations must respect authentication and ownership.

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

---

## 8. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Usability | Primary flows (browse → add to cart → checkout) completable without documentation for a new user. |
| NFR-02 | Responsive design | Layout usable from ~320px width to desktop; no critical overlap or unreachable controls on mobile. |
| NFR-03 | Compatibility | Latest Chrome, Firefox, Safari (desktop); mobile Safari / Chrome Android. |
| NFR-04 | Performance (soft) | Catalogue and cart interactions respond under normal local load within a time acceptable for training (subjective, note if unusable). |
| NFR-05 | Security (basic) | Passwords stored hashed; API protected by JWT where required; no anonymous destructive actions on other users’ data. |
| NFR-06 | Accessibility (soft) | Interactive elements reachable; form labels present; contrast sufficient for main content (report serious a11y issues). |
| NFR-07 | Data persistence | User, cart, order, review, and bug report data persist across page reloads (until DB reset). |
| NFR-08 | API discoverability | OpenAPI/Swagger available and matches implemented endpoints. |

---

## 9. Data requirements

### 9.1 Core entities

- **User:** email, username, password hash, full name, role, colony, active flag  
- **Category:** code, name, optional Martian name, description, icon  
- **Product:** SKU, name, Martian name, brand, description, price_sols, price_credits, stock, category, rating, featured flag, active flag  
- **Cart item:** user, product, quantity  
- **Order / order item:** user, totals, status, delivery colony, line snapshots  
- **Review:** product, user, rating, title, body  
- **Bug report:** title, discipline, steps, expected, actual, severity, priority, environment, reporter, status, timestamps  

### 9.2 Seed / reference data expectations

- Multiple categories and at least 10+ products with varied prices and stock.  
- At least two demo users (colonist + admin).  
- Featured products available on the home page.  

### 9.3 Test data guidance (for trainees)

Prepare datasets covering:

- Valid registration / login  
- Duplicate email and username  
- Boundary quantities: 0, 1, stock, stock+1, negative (if UI allows)  
- Price filters: exact min, exact max, inverted range  
- Search: lower/upper case, partial match, empty, special characters  
- Locale codes: `ru`, `en`, `mars` / `mrt` / invalid  
- Bug report mandatory field omissions  
- Severity/priority valid and invalid values  

---

## 10. User interface requirements

| ID | Requirement |
|----|-------------|
| UI-01 | Consistent navigation bar on all main views. |
| UI-02 | Cart badge visible when items exist. |
| UI-03 | Clear feedback (toast/alert) on success and error actions. |
| UI-04 | Forms show validation messages for required fields. |
| UI-05 | Product cards display essential info without horizontal overflow on mobile. |
| UI-06 | Primary actions (Add to cart, Place order, Submit bug report) visually distinct. |

---

## 11. Environments

| Environment | Purpose |
|-------------|---------|
| Local | `uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000` |
| UI URL | `http://localhost:8000` |
| API docs | `http://localhost:8000/api/docs` |
| Database | SQLite file (resettable between sessions) |

Trainees may use browser DevTools, Postman/Insomnia, and SQLite CLI as supporting tools.

---

## 12. Assumptions and constraints

1. Requirements describe **intended** product behaviour for training. Observed deviations are defects unless the mentor explicitly marks them as accepted limitations.  
2. The in-app Bug Reports module is part of the system under test **and** the channel for reporting other defects.  
3. Russian UI labels are expected; API may use English field names.  
4. No real personal data should be entered; use fictional colony identities only.

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| Sol (Ṡ) | Primary currency of the Martian colony |
| Credit (₡) | Earth currency shown for reference |
| Colony | Delivery / home location (e.g. Olympus City, Valles Base) |
| Colonist | Authenticated end user |
| Featured product | Product promoted on the home page |
| Bug report | Structured defect record created inside the application |

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
- FR-NAV-*  
- BR-*  
- NFR-* (sample coverage is acceptable)  
- UI-*  

Minimum expected coverage for internship delivery:

- 100% of Critical path requirements: AUTH login/register, CAT list/detail, CART add/checkout path, ORD create, LOC switch, BUG create  
- Representative coverage of filters, sort, search, validation, and negative cases  
- At least one exploratory session documented  

---

## 15. Suggested artifact checklist for trainees

Use this specification to produce:

1. **Test Strategy** — goals, levels (smoke / functional / API / UI / regression), risks, tools  
2. **Test Plan** — scope, schedule, entry/exit criteria, environment, deliverables  
3. **Test Scenarios** — e.g. “New colonist registers, buys oxygen tank, places order”  
4. **Test Cases** — ID, title, preconditions, steps, expected result, requirement ID, priority  
5. **Checklists** — smoke, mobile UI, API status codes, localization, forms  
6. **Test Data** — tables of inputs (valid/invalid/boundary)  
7. **Bug Reports** — filed in the app; export or screenshots for the portfolio if needed  
8. **Traceability Matrix** — Requirement ID ↔ Test Case ID(s) ↔ status  
9. **Test Report** — executed vs planned, pass/fail, defects, residual risk, conclusion  

---

## 16. Document control

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-09-08 | Training team | Baseline for AresMarket internship testing practice |

**Related materials (mentor only — not for unguided defect hunting):**  
- Application README  
- Internal intentional defect list (restricted)

---

*End of Technical Requirements Specification*
