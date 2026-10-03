# OkKhata — Full Application Performance Optimization & Speed Refactor Prompt

## ROLE

You are a senior full-stack performance engineer specializing in:

- React + TypeScript
- Vite
- React Query / TanStack Query
- Node.js + Express
- Mongoose + MongoDB Atlas
- Render deployment
- Financial / ledger applications
- Secure transactional systems
- Web performance and API performance

You are working on the existing **OkKhata** application:

**GitHub:** https://github.com/Kunu01/okkhata

Your job is to make the application **materially faster end-to-end** while preserving all existing business functionality, security guarantees, data integrity, authentication behaviour, and UI/UX.

Do NOT redesign the product.
Do NOT remove existing features.
Do NOT replace MongoDB Atlas.
Do NOT add unnecessary infrastructure just to hide bad application architecture.

The goal is:

> Make OkKhata feel fast when opening the application, searching customers, opening a customer ledger, recording a transaction, loading dashboard data, viewing transactions, managing products/bills, and navigating between screens.

---

# 1. PRIMARY OBJECTIVE

Transform the current application from a large "load most of the workspace every time" architecture into a **query-specific, paginated, cached, low-latency application**.

The application must remain reliable for real financial transactions.

Priority order:

1. Correctness
2. Data integrity
3. Security
4. API reliability
5. Perceived speed
6. Database efficiency
7. Scalability

Never sacrifice financial correctness for speed.

---

# 2. CURRENT PERFORMANCE PROBLEMS TO FIX

The current implementation contains several confirmed performance risks.

## 2.1 Large workspace endpoint

Current endpoint:

`GET /api/v1/workspace`

Current behaviour includes:

- `connectPendingCustomers()`
- up to 500 customers
- up to 500 entries
- up to 500 products
- up to 500 bills
- up to 50 notifications
- up to 500 payment requests
- customer totals aggregation
- 180-day monthly transaction aggregation
- customer enrichment queries

The endpoint is doing too much work for a normal page load.

### REQUIRED CHANGE

Do not use `/workspace` as the primary data transport for the entire application.

Replace the architecture with smaller resources such as:

- `/workspace/summary`
- `/customers`
- `/customers/:id`
- `/customers/:id/entries`
- `/entries`
- `/products`
- `/bills`
- `/notifications`
- `/payment-requests`

Keep the existing `/workspace` endpoint temporarily if required for backward compatibility, but stop the frontend from depending on it as the main source of truth.

---

# 3. REMOVE WRITE-HEAVY WORK FROM READ REQUESTS

Current `GET /workspace` calls:

```ts
await connectPendingCustomers(req.auth!.userId);
```

This is unacceptable for a high-frequency read endpoint because customer-linking can trigger additional queries, transactions, historical-entry mirroring, notifications, and writes.

## REQUIRED CHANGE

Move pending customer connection logic out of normal workspace reads.

Possible safe approaches:

### Preferred

Perform customer linking at the event where it becomes necessary:

- account creation
- customer creation
- customer mobile update
- explicit shared-account connection
- transaction flow when required

### Alternative

Create a dedicated synchronization endpoint:

```text
POST /api/v1/customers/sync
```

Only invoke it when there is a legitimate reason.

Never execute a potentially write-heavy synchronization process every time the dashboard refreshes.

---

# 4. CREATE A FAST SUMMARY ENDPOINT

Create:

```text
GET /api/v1/workspace/summary
```

This endpoint should return only data needed for high-level UI elements.

Example response:

```json
{
  "customers": 42,
  "receivable": 1250000,
  "advance": 45000,
  "recentActivityCount": 10,
  "unreadNotifications": 2,
  "recentTransactions": [],
  "monthly": []
}
```

Only include `recentTransactions` if genuinely required by the current dashboard.

Do not return hundreds of unrelated records.

---

# 5. PAGINATION IS REQUIRED

Every large collection endpoint must be paginated.

Minimum required resources:

```text
GET /customers?page=1&limit=25&q=
GET /entries?page=1&limit=25
GET /customers/:id/entries?page=1&limit=25
GET /products?page=1&limit=25
GET /bills?page=1&limit=25
GET /payment-requests?page=1&limit=25
GET /notifications?page=1&limit=25
```

Do not return 500 records just because the frontend might need them.

## Pagination rules

Default:

```text
limit = 25
```

Maximum:

```text
limit = 100
```

Validate all pagination parameters with Zod.

Do not trust client-provided limits.

---

# 6. PREFER CURSOR PAGINATION FOR LARGE/FAST-GROWING DATA

For transaction history and other high-volume lists, prefer cursor-based pagination.

Example:

```text
GET /entries?cursor=<last-id>&limit=25
```

or a cursor based on the compound sort fields.

Use deterministic sorting.

Example:

```ts
sort({
  date: -1,
  createdAt: -1,
  _id: -1
})
```

The cursor must contain enough information to continue from the exact position.

Do not use deep `.skip()` pagination for potentially large transaction collections.

Offset pagination can remain for small customer/product lists if it is sufficient.

---

# 7. MONGODB INDEX AUDIT

Review the indexes in:

```text
server/src/models.ts
```

Create indexes based on actual query patterns.

At minimum, investigate and add appropriate indexes for these access patterns.

## Session

Frequent authentication lookup:

```text
tokenHash
expiresAt
lastSeen
```

The unique `tokenHash` index is useful. Verify the actual MongoDB query plan instead of creating duplicate indexes.

## Customer

Common patterns:

```text
businessId + archived + name
businessId + linkedUserId
businessId + mobile
```

## Entry

Critical:

```text
businessId + customerId + date + createdAt
businessId + date + createdAt
businessId + idempotencyKey
sourceEntryId
reversalOf
```

Use compound indexes that match the real query + sort pattern.

For example, investigate:

```ts
{ businessId: 1, date: -1, createdAt: -1, _id: -1 }
```

for the global transaction timeline.

For customer history, investigate:

```ts
{ businessId: 1, customerId: 1, date: -1, createdAt: -1, _id: -1 }
```

Do not blindly add all possible indexes.

Too many indexes slow writes and increase storage.

## Product

Investigate:

```ts
{ businessId: 1, name: 1 }
```

and existing SKU index.

## Bills

Investigate:

```ts
{ businessId: 1, createdAt: -1 }
```

## Notifications

Investigate:

```ts
{ userId: 1, createdAt: -1 }
```

## PaymentRequest

Investigate:

```ts
{ businessId: 1, customerId: 1, createdAt: -1 }
```

---

# 8. VERIFY INDEXES WITH EXPLAIN

Do not declare an index "good" just because it exists.

Use MongoDB `explain("executionStats")` for important query patterns.

Inspect:

- `executionTimeMillis`
- `totalDocsExamined`
- `totalKeysExamined`
- `nReturned`
- winning plan
- collection scan vs index scan

The desired principle is:

```text
nReturned << totalDocsExamined
```

for selective queries.

Document the before/after results.

---

# 9. SERVER-SIDE PROJECTION

Do not return entire documents when the frontend needs only a subset of fields.

Use projections such as:

```ts
Customer.find(filter)
  .select('_id name mobile email balance archived dueDate linkedUserId photo')
  .lean();
```

Use different projections for:

- list view
- detail view
- summary view

Do not send:

- internal fields
- unnecessary metadata
- large attachment objects
- unrelated security data
- large embedded documents

---

# 10. USE LEAN FOR READ-ONLY QUERIES

For read endpoints that do not need Mongoose document methods:

```ts
.lean()
```

Use it consistently where safe.

Example:

```ts
const customers = await Customer.find(filter)
  .select('_id name mobile balance archived')
  .sort({ name: 1, _id: 1 })
  .limit(25)
  .lean();
```

Do not use `.lean()` blindly when document middleware/methods are required.

---

# 11. STOP RETURNING THE ENTIRE DATABASE STATE

The frontend currently assumes a large workspace object.

Refactor the React data architecture.

Do NOT keep this mental model:

```text
data = everything
```

Move toward:

```text
summaryQuery
customersQuery
transactionsQuery
productsQuery
billsQuery
notificationsQuery
```

Each query should own its own cache.

---

# 12. REACT QUERY ARCHITECTURE

Inspect:

```text
client/src/App.tsx
client/src/api.ts
client/src/context.tsx
client/src/pages.tsx
```

Create stable query keys.

Examples:

```ts
['workspace-summary', userId]

['customers', userId, { page, q }]

['customer', userId, customerId]

['customer-entries', userId, customerId, { cursor }]

['entries', userId, filters]

['products', userId, { page, q }]

['bills', userId, { page }]

['notifications', userId, { page }]
```

Do not create unstable query keys from newly constructed objects unless the query library handles serialization predictably.

---

# 13. REMOVE FULL WORKSPACE POLLING

Current code uses approximately:

```ts
refetchInterval: 30000
```

for the entire workspace.

Remove that pattern.

Do NOT fetch hundreds of records every 30 seconds.

Instead:

### Summary

Refresh summary at a low frequency only if genuinely required.

### Notifications

Use a lightweight unread-count endpoint:

```text
GET /notifications/unread-count
```

Only return:

```json
{
  "count": 2
}
```

### Transactions

Refresh after actual transaction mutations or use a narrowly scoped synchronization strategy.

Do not repeatedly pull 500 transactions.

---

# 14. STOP INVALIDATING SESSION AFTER NORMAL DATA CHANGES

Current code does approximately:

```ts
invalidateQueries(['workspace']);
invalidateQueries(['session']);
```

after ordinary business operations.

Creating a transaction does not require re-fetching authentication/session data.

Change mutation invalidation to target only affected data.

Example:

```text
create customer
→ invalidate customers + summary

create transaction
→ invalidate customer
→ invalidate customer entries
→ invalidate transactions
→ invalidate summary

create product
→ invalidate products + summary if required

create bill
→ invalidate bills
→ invalidate customer
→ invalidate summary

mark notification read
→ invalidate notifications + unread count
```

---

# 15. OPTIMISTIC UI FOR TRANSACTIONS

The most important user action in OkKhata is recording a transaction.

A customer should not stare at a spinner while waiting for MongoDB.

Implement optimistic UI carefully.

When a transaction is submitted:

1. Validate input locally.
2. Immediately update the visible customer balance optimistically.
3. Add the pending transaction to the local transaction list.
4. Show a subtle saving state.
5. Send the request.
6. On success, replace the temporary record with the server record.
7. On failure, roll back the optimistic update and show the exact error.

Pseudo-flow:

```text
Tap "Save"
   ↓
UI updates immediately
   ↓
"Saving…"
   ↓
POST /entries
   ↓
Server transaction commits
   ↓
Server response
   ↓
UI reconciles
```

Do not fake successful financial transactions.

The UI may be optimistic, but the final state must always reconcile with the server.

---

# 16. PRESERVE IDEMPOTENCY

This is a financial application.

DO NOT remove:

```text
idempotencyKey
```

Do not disable duplicate-request protection.

Do not make the transaction API fire multiple times because of UI retries.

The desired behaviour is:

```text
Same idempotencyKey
    ↓
same logical operation
    ↓
safe retry
    ↓
no duplicate financial transaction
```

---

# 17. TRANSACTIONAL INTEGRITY MUST REMAIN

Do not remove MongoDB transactions from financial operations merely to gain speed.

Especially preserve transaction integrity around:

- customer balance update
- entry creation
- mirrored shared entry
- reversal
- payment confirmation
- audit record
- notification creation
- stock updates
- bill posting

Performance optimization must not produce inconsistent balances.

---

# 18. MAKE TRANSACTION ENDPOINT FAST

Audit:

```text
server/src/ledger.ts
```

Optimize transaction creation.

Target:

```text
POST /entries
```

should generally have very little unnecessary work before commit.

Inspect every DB operation.

Where safe:

- reduce duplicate reads
- use atomic updates
- use appropriate projections
- avoid loading documents when only existence is needed
- avoid repeated queries for the same entity
- avoid unnecessary post-commit work

Keep all correctness validations.

---

# 19. SEPARATE CRITICAL WORK FROM NON-CRITICAL WORK

For a financial transaction, categorize work.

### Critical

Must complete before returning success:

- validate transaction
- validate customer
- update balance
- create entry
- enforce idempotency
- required shared ledger consistency

### Non-critical

Can happen after the critical commit when safe:

- email
- analytics
- non-critical notifications
- other informational side effects

Do not introduce unsafe background processing for anything that must be transactional.

If asynchronous processing is introduced, document the consistency model.

---

# 20. AUTHENTICATION PERFORMANCE

Inspect:

```text
server/src/security.ts
```

Current authentication performs:

- Session lookup
- Business lookup
- User lookup
- Session `lastSeen` update

on authenticated requests.

Improve this carefully.

## Important

Do not remove session validation.

Do not introduce insecure in-memory authentication state.

Prefer batching existing independent reads where practical.

Avoid updating `lastSeen` on every single request if the business requirements allow a throttled update.

For example:

```text
if lastSeen older than 5–15 minutes
    update it
else
    skip the write
```

This reduces a write on nearly every API request.

Choose the interval based on the security requirements already present in the app.

Do not weaken session expiration semantics.

---

# 21. PROFILE / SESSION PROJECTION

`/auth/session` should return only what the frontend actually requires.

Do not return the entire User or Business MongoDB documents.

Use explicit fields.

---

# 22. CUSTOMER SEARCH MUST BE FAST

Inspect:

```text
GET /customers
```

Current searching uses case-insensitive regex.

Keep the current search functionality, but make it scalable.

First step:

- anchor regex where UX permits
- use normalized search fields when appropriate
- create suitable indexes
- avoid unnecessary `countDocuments()` on every keystroke

### Frontend

Debounce customer search:

```text
250–350ms
```

Do not issue one request per keystroke.

Example:

```text
r
ra
rah
rahu
rahul
```

should result in approximately:

```text
one backend request after typing pauses
```

not five requests.

---

# 23. CUSTOMER LIST PERFORMANCE

Customer list page should load:

```text
25–50 customers
```

not 500.

Display:

- name
- balance
- mobile if needed
- status
- minimal metadata

Load full customer details only when opening the customer.

---

# 24. CUSTOMER DETAIL PERFORMANCE

When opening:

```text
/customers/:id
```

do not load all global workspace data first.

Load:

```text
customer summary
recent entries
pagination metadata/cursor
```

Then load additional history on demand.

Use:

```text
GET /customers/:id
GET /customers/:id/entries?...
```

---

# 25. TRANSACTION HISTORY

Transactions should support:

- pagination
- server-side filters
- server-side date range
- server-side type filter
- deterministic sorting

Do not load 500 transactions and filter everything in React.

Current client-side filtering should be moved server-side for scalable usage.

Possible API:

```text
GET /entries?page=1
    ?kind=given
    &from=2026-01-01
    &to=2026-12-31
    &customerId=...
```

---

# 26. SERVER-SIDE SEARCH + FILTERS

Move expensive filtering away from the browser when datasets can grow.

Frontend should not do:

```ts
data.entries.filter(...)
```

for the complete transaction database.

Instead:

```text
Browser
 ↓
GET /entries?filters
 ↓
MongoDB indexed query
 ↓
small result set
```

---

# 27. DASHBOARD OPTIMIZATION

The dashboard should load quickly even when the user has thousands of records.

Do not calculate large historical reports on every general request.

The 180-day aggregation should not be part of every normal workspace refresh.

Separate:

```text
summary
```

from:

```text
reports
```

Reports can load independently.

Example:

```text
GET /workspace/summary
GET /reports/monthly
```

Only request reports when the Reports screen is opened.

---

# 28. REPORT AGGREGATIONS

Inspect the monthly aggregation.

Ensure:

- date filtering happens early
- `businessId` filtering happens early
- an appropriate index supports the match stage
- only required fields participate
- reports are not recomputed every 30 seconds

Possible index:

```ts
{ businessId: 1, date: -1 }
```

Validate with `explain()`.

---

# 29. NOTIFICATIONS

Create lightweight endpoints:

```text
GET /notifications/unread-count
GET /notifications?page=1
POST /notifications/read
```

The global UI needs only the unread count most of the time.

Do not fetch 50 full notifications on every route render.

---

# 30. BUSINESS DATA

Business information changes far less frequently than transaction information.

Cache it appropriately with React Query.

Suggested:

```text
staleTime: 5–15 minutes
```

Do not repeatedly fetch identical business metadata.

---

# 31. REACT QUERY CACHE SETTINGS

Use appropriate cache policy.

Example direction:

### Static-ish profile/business data

```ts
staleTime: 5 * 60 * 1000
gcTime: 30 * 60 * 1000
```

### Customers

```ts
staleTime: 30 * 1000
```

### Transaction list

```ts
staleTime: 10–30 * 1000
```

### Notifications

Use the lightweight unread count and refresh it separately.

Do not copy these values blindly. Measure actual UX needs.

---

# 32. PREFETCHING

Use prefetching strategically.

Example:

When the customer list renders, prefetch the first part of the next page if that is cheap.

When the user hovers/focuses a customer row, consider prefetching:

```text
/customer/:id
```

Do not prefetch hundreds of records.

---

# 33. BACKEND RESPONSE SIZE

Measure JSON payload size.

Set performance targets.

Suggested targets after optimization:

### Summary endpoint

Prefer:

```text
< 20–50 KB
```

### Customer list page

Prefer:

```text
< 50 KB
```

### Transaction page

Prefer:

```text
< 75 KB
```

Actual acceptable values depend on the application data.

The important principle is:

> Do not send a large response when a small response solves the UI requirement.

---

# 34. ADD PERFORMANCE INSTRUMENTATION

Create lightweight API timing middleware.

For every API request, log:

```text
method
route
status
durationMs
```

For database-heavy endpoints, optionally log:

```text
dbDurationMs
```

Never log:

- passwords
- session tokens
- OTPs
- CSRF tokens
- secret environment variables
- full financial payloads

Example development log:

```text
GET /api/v1/customers 200 84ms
POST /api/v1/entries 201 132ms
GET /api/v1/workspace/summary 200 67ms
```

---

# 35. PERFORMANCE TRACE FOR CRITICAL ENDPOINTS

For:

```text
GET /workspace/summary
GET /customers
GET /customers/:id
GET /customers/:id/entries
GET /entries
POST /entries
```

measure separately:

```text
middleware time
database time
serialization time
total request time
```

Do not guess where the delay is.

---

# 36. RENDER OPTIMIZATION

Inspect:

```text
render.yaml
```

and current Render deployment.

Do not assume the problem is only MongoDB.

Measure:

```text
browser → Render network latency
Render startup latency
server processing latency
MongoDB latency
response transfer time
browser processing/render time
```

Keep the existing health check.

Do not rely on GitHub Actions as the core performance solution.

If using a free Render instance, distinguish cold-start latency from warm-request latency.

If possible, compare:

```text
cold request
warm request
```

and document the difference.

---

# 37. HEALTH ENDPOINT

Keep:

```text
GET /api/health
```

It should remain extremely cheap.

It should not query MongoDB repeatedly unless a real database health check is intentionally required.

Use it for deployment health checking.

---

# 38. MONGODB CONNECTION MANAGEMENT

Inspect:

```text
server/src/index.ts
server/src/config.ts
```

Keep one reusable Mongoose connection per running Node.js process.

Do not:

```ts
mongoose.connect(...)
```

inside every request.

The current startup connection pattern is appropriate in principle.

Do not introduce connection churn.

Also inspect:

- connection pool configuration
- server selection timeout
- socket timeout
- max pool size

Do not blindly increase pool size.

Tune based on actual Render instance concurrency and Atlas limits.

---

# 39. MONGODB ATLAS REGION

Measure geographic latency between:

```text
Render region
MongoDB Atlas region
```

If they are geographically far apart, network latency can materially affect every database round trip.

Do not change regions immediately.

First measure.

Then document:

```text
Render region = ?
Atlas region = ?
Observed database round-trip latency = ?
```

If relocation is recommended, provide it as a deployment-level optimization with rollback instructions.

---

# 40. DATABASE ROUND-TRIP REDUCTION

Every request should be reviewed for:

```text
How many MongoDB calls?
How many can be combined?
Which calls are sequential?
Which can run in parallel?
Which are unnecessary?
Which can use atomic MongoDB operations?
```

Do not make everything parallel blindly.

Parallel queries are useful only when:

- queries are independent
- database capacity supports the concurrency
- total response size remains reasonable

Eight simultaneous huge queries are not inherently faster than two small queries.

---

# 41. AVOID N+1 QUERIES

Inspect:

```text
server/src/shared.ts
```

especially:

```ts
enrichCustomers()
connectCustomer()
mirrorEntry()
```

Avoid querying one database record repeatedly inside loops.

For example, do not do:

```text
500 customers
→ 500 User.findById()
```

Instead batch fetch related records:

```ts
User.find({ _id: { $in: ids } })
```

Then map them using a Map:

```ts
const usersById = new Map(
  users.map(user => [String(user._id), user])
);
```

Do the same for businesses.

Do not use repeated `.find()` across arrays for every customer if a Map gives O(1)-style lookup.

---

# 42. MAP ENRICHMENT DATA

Refactor enrichment logic from:

```ts
users.find(...)
businesses.find(...)
```

inside a loop

to:

```ts
const usersById = new Map(...)
const businessesByOwnerId = new Map(...)
```

This reduces repeated application-side searches.

---

# 43. COUNT QUERIES

Be careful with:

```ts
countDocuments()
```

on high-frequency searches.

For customer search, do not make the UI wait for both:

```text
records query
+
full count query
```

unless the UI truly needs exact totals.

Possible alternatives:

- return `hasNextPage`
- fetch `limit + 1`
- provide count only when necessary
- calculate count through a separate request
- cache count

The preferred approach for list UIs is usually:

```json
{
  "items": [],
  "nextCursor": "...",
  "hasMore": true
}
```

rather than forcing an expensive exact count.

---

# 44. FRONTEND DEBOUNCING

Add debounce to:

- customer search
- product search
- transaction filters where requests are triggered automatically

Use approximately:

```text
250–350ms
```

Do not debounce explicit submit/save actions.

---

# 45. DO NOT BLOCK THE UI ON NONESSENTIAL REFRESHES

When a transaction succeeds:

Do not wait for every secondary query before telling the user:

> Transaction saved.

The critical mutation response should be sufficient to confirm success.

Then refresh/reconcile background queries.

Good:

```text
POST /entries
 ↓
201 response
 ↓
UI confirms transaction
 ↓
background cache reconciliation
```

Bad:

```text
POST /entries
 ↓
wait
 ↓
invalidate everything
 ↓
refetch everything
 ↓
wait
 ↓
finally tell user success
```

---

# 46. ROUTE-LEVEL DATA LOADING

Do not load all feature datasets just because the user is authenticated.

For example:

When opening Customers:

```text
customers query
summary query
```

When opening Transactions:

```text
transactions query
```

When opening Reports:

```text
monthly-report query
```

When opening Inventory:

```text
products query
```

When opening Bills:

```text
bills query
```

When opening Notifications:

```text
notifications query
```

---

# 47. CODE ORGANIZATION

Do not leave all API data management inside `App.tsx`.

Create a clean structure such as:

```text
client/src/api/
  client.ts
  customers.ts
  transactions.ts
  products.ts
  bills.ts
  notifications.ts
  summary.ts

client/src/queries/
  customers.ts
  transactions.ts
  products.ts
  bills.ts
  notifications.ts
  summary.ts
```

If the current project structure makes this too disruptive, introduce it gradually.

Do not rewrite working UI unnecessarily.

---

# 48. API MODULES

Create strongly typed API functions.

Example:

```ts
getCustomers(params)
getCustomer(id)
getCustomerEntries(id, params)
createCustomer(input)
updateCustomer(id, input)

getEntries(params)
createEntry(input)
reverseEntry(id, input)
```

Avoid scattering raw `api('/workspace')` calls everywhere.

---

# 49. KEEP TYPES STRONG

Do not solve performance by using more `any`.

Use existing TypeScript types in:

```text
client/src/types.ts
```

Update them when API contracts change.

---

# 50. BACKWARD COMPATIBILITY

Do not break existing routes unless required.

If replacing an endpoint:

1. Add the new endpoint.
2. Migrate frontend.
3. Test existing functionality.
4. Keep compatibility temporarily if practical.
5. Remove old endpoint only after confirming no client uses it.

---

# 51. ERROR HANDLING

Do not make the application appear fast by hiding failures.

A failed API request must remain visible.

Use:

- loading states
- error states
- retry
- optimistic rollback
- clear confirmation

Never silently discard failed financial mutations.

---

# 52. LOADING UX

Perceived speed matters.

Avoid blank full-page spinners wherever possible.

Use:

- skeleton lists
- immediate cached data
- stale-while-revalidate
- optimistic balance updates
- disabled submit button only during actual mutation
- subtle "Updating…" indicator

Example:

Instead of:

```text
Loading...
```

render existing cached customer list immediately and refresh it silently.

---

# 53. STALE-WHILE-REVALIDATE BEHAVIOUR

For frequently visited views:

```text
cached data
   ↓
render immediately
   ↓
background revalidation
   ↓
replace with newer server data
```

Do not force the user to wait for a request if usable cached data already exists.

---

# 54. OFFLINE BEHAVIOUR

The application already has offline awareness.

Preserve it.

Do not allow fake transaction success while offline.

For safe read-only UI:

- show cached data
- clearly indicate stale/offline state

For financial writes:

- either queue with a robust idempotent sync mechanism
- or explicitly require reconnection

Do not implement an unsafe homemade transaction queue.

---

# 55. PERFORMANCE BUDGETS

Use these as targets, not guarantees.

### Warm authenticated API

Preferred:

```text
P50 < 200ms
P95 < 500ms
```

for simple list/summary endpoints.

### Transaction creation

Preferred:

```text
P50 < 300ms
P95 < 800ms
```

excluding unavoidable external services.

### Customer search

Preferred:

```text
P95 < 400ms
```

### Customer detail

Preferred:

```text
P95 < 500ms
```

### Summary

Preferred:

```text
P95 < 500ms
```

If targets are missed, profile instead of guessing.

---

# 56. FIRST CONTENT / PERCEIVED PERFORMANCE

For the authenticated application, aim for:

```text
initial shell renders immediately
cached user/business state appears immediately
data loads progressively
```

Do not wait for every feature dataset before rendering the UI shell.

---

# 57. BUNDLE / FRONTEND PERFORMANCE

Inspect:

```text
client/src/App.tsx
client/src/pages.tsx
client/src/components.tsx
client/src/SettingsPage.tsx
client/src/styles.css
```

and Vite output.

Find large dependencies and excessive initial JavaScript.

Consider route-level lazy loading for large pages such as:

- Settings
- Reports
- Inventory
- Bills

Use React lazy loading where appropriate.

Do not lazy-load the most frequently used screen if it makes first interaction slower.

Measure bundle impact.

---

# 58. IMAGE / MEDIA PERFORMANCE

Inspect image handling.

Do not return full image binary data through normal API JSON.

Use URLs / media endpoints.

Use:

- appropriately sized images
- browser caching for immutable media
- versioned URLs for changed assets
- lazy loading where appropriate

Do not reload profile images on every workspace request unnecessarily.

---

# 59. HTTP CACHING

API financial data currently uses no-store behaviour.

Keep no-store semantics for sensitive frequently changing financial API data unless you can prove safe caching.

For static assets, use strong caching:

```text
Cache-Control: public, max-age=31536000, immutable
```

only for fingerprinted/versioned assets.

Do not cache authenticated financial responses in shared browser/proxy caches.

---

# 60. SECURITY CONSTRAINTS

Never weaken:

- CSRF protection
- same-origin protection
- secure cookies
- session expiration
- rate limiting
- authentication
- authorization
- input validation
- duplicate prevention
- transaction integrity
- audit logs

Do not move secrets to frontend code.

Do not log secrets.

Do not expose MongoDB connection strings.

---

# 61. RATE LIMITING

Current rate limiting itself uses MongoDB.

Inspect whether high-frequency authenticated requests are causing excessive `RateBucket` database writes.

Do not remove abuse protection.

But consider whether all read requests need the same rate-limiter cost.

Possible strategy:

- stricter limits on auth
- stricter limits on mutation endpoints
- reasonable limits on reads
- ensure the implementation does not become a DB bottleneck

Measure before changing.

---

# 62. FIX THE `lastSeen` WRITE AMPLIFICATION

Authenticated requests currently update session `lastSeen`.

Avoid:

```text
every API request
→ Session.updateOne()
```

Prefer a throttled update.

Example concept:

```text
if lastSeen < 10 minutes ago:
    update
else:
    skip
```

Choose an interval that preserves acceptable session semantics.

Do not make session activity inaccurate enough to weaken security.

---

# 63. SERVER RESPONSE SHAPES

Use stable response shapes.

Example list:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Example mutation:

```json
{
  "entry": {},
  "customer": {}
}
```

Do not force clients to understand inconsistent payload formats.

---

# 64. DATABASE WRITE OPTIMIZATION

For bulk operations that are truly independent and safe:

- use `bulkWrite`
- reduce repeated round trips
- maintain transaction boundaries where required

Do not use bulk operations where per-record validation or transactional semantics would be broken.

---

# 65. CONNECT CUSTOMER / SHARED LEDGER OPTIMIZATION

Inspect:

```text
server/src/shared.ts
```

especially historical mirroring.

Ensure:

- historical sync happens only when needed
- it cannot be triggered repeatedly
- it is idempotent
- repeated calls detect already mirrored entries efficiently
- batch operations are used where safe

Do not perform historical synchronization during every normal read.

---

# 66. REPORTS MUST BE ISOLATED

Move reporting work out of generic workspace requests.

Implement:

```text
GET /reports/monthly
```

The endpoint should execute only when the Reports screen needs it.

Consider caching report output briefly if the data changes less frequently than requests.

Do not introduce a complex cache before measuring.

---

# 67. CUSTOMER BALANCE SOURCE OF TRUTH

Do not calculate customer balance by downloading and summing all transactions in the browser.

Continue using the balance field as the operational source where the current design depends on it.

Ensure mutations maintain:

```text
Customer.balance
```

and:

```text
Entry.delta
```

consistently.

---

# 68. FRONTEND DATA NORMALIZATION

Avoid repeatedly doing:

```ts
data.customers.find(c => c._id === e.customerId)
```

for every transaction row.

Create a map:

```ts
const customersById = useMemo(
  () => new Map(data.customers.map(c => [c._id, c])),
  [data.customers]
);
```

Then:

```ts
customersById.get(entry.customerId)
```

This is a frontend optimization and should be applied to large rendered lists.

---

# 69. VIRTUALIZATION

Only use list virtualization where lists can become genuinely large.

Potential targets:

- transaction history
- notification list
- customer list

Do not introduce virtualization everywhere.

For normal 25-item pages it may be unnecessary.

---

# 70. AVOID UNNECESSARY RE-RENDERS

Inspect:

```text
client/src/App.tsx
client/src/context.tsx
```

The global context currently exposes broad `data`.

Avoid forcing the entire application tree to rerender when one small piece changes.

Prefer:

- query-specific hooks
- smaller contexts
- memoized derived values
- stable callbacks
- component-level data ownership

---

# 71. DO NOT REWRITE THE UI

Performance work should preserve:

- colours
- design
- routes
- labels
- existing feature set
- user workflows

Only alter UI when it is needed for performance feedback such as:

- loading indicators
- optimistic states
- pagination controls
- progressive loading

---

# 72. TESTING REQUIREMENTS

Before modifications:

Run existing tests.

After each major phase:

Run:

```text
npm test
npm run build
```

or the exact repository-supported equivalents.

Also run the client build.

Do not ship TypeScript errors.

The repository currently includes:

```text
server/test/integration.test.ts
server/test/utilities.test.ts
```

Expand tests for all changed endpoints.

---

# 73. ADD PERFORMANCE TESTS

Add tests for:

### Customers

- first page
- search
- pagination

### Transactions

- first page
- date range
- type filter
- customer filter

### Customer ledger

- first page
- cursor/next page

### Summary

- only required fields returned

### Transaction creation

- successful creation
- duplicate idempotency request
- rollback on failure

---

# 74. LOAD TESTING

Create a lightweight repeatable benchmark.

Test:

```text
10 concurrent users
25 concurrent users
50 concurrent users
```

Measure:

- p50
- p95
- error rate
- database latency
- Render latency
- response size

Do not call a system "fast" based only on local localhost testing.

---

# 75. TEST WARM AND COLD DEPLOYMENT CONDITIONS

Because the backend is on Render:

Test:

```text
cold request after idle
warm request
```

Document:

```text
cold latency
warm latency
```

If Render cold starts dominate, provide a deployment recommendation separately from application-code optimizations.

Do not mix cold-start latency with MongoDB query latency.

---

# 76. OBSERVE MONGODB ATLAS

After refactoring, compare Atlas metrics:

Before:

```text
operations/sec
connections
latency
CPU
data returned
```

After:

```text
operations/sec
connections
latency
CPU
data returned
```

The goal is not simply "fewer queries".

The goal is:

```text
less unnecessary data
less unnecessary work
fewer round trips
better indexes
predictable latency
```

---

# 77. EXACT IMPLEMENTATION ORDER

Follow this order.

## PHASE 0 — Baseline

1. Run the application.
2. Record current API timings.
3. Record response sizes.
4. Record MongoDB Atlas metrics.
5. Record current frontend initial load behaviour.
6. Record transaction-save latency.

Do not modify code yet.

---

## PHASE 1 — Instrumentation

Add:

- API timing
- key database timing logs
- safe performance logging

Do not expose secrets.

---

## PHASE 2 — Remove the biggest bottleneck

Remove `connectPendingCustomers()` from generic workspace reads.

Create a safe explicit customer synchronization path.

---

## PHASE 3 — Split the workspace API

Create:

```text
/workspace/summary
/customers
/customers/:id
/customers/:id/entries
/entries
/products
/bills
/notifications
/payment-requests
/reports/monthly
```

Keep old workspace support temporarily if necessary.

---

## PHASE 4 — Pagination

Implement pagination/cursors.

---

## PHASE 5 — Index optimization

Add only indexes supported by actual query patterns.

Verify with `explain()`.

---

## PHASE 6 — Frontend query refactor

Replace one global workspace query with feature-specific React Query caches.

---

## PHASE 7 — Remove broad polling

Remove 30-second full-workspace refresh.

---

## PHASE 8 — Mutation optimization

Implement targeted invalidation and optimistic UI for safe transactions.

---

## PHASE 9 — Search optimization

Debounce frontend search.

Move filtering server-side.

Optimize indexes/search strategy.

---

## PHASE 10 — Frontend render optimization

Reduce broad context rerenders.

Memoize maps.

Lazy-load large routes where beneficial.

---

## PHASE 11 — Production benchmarking

Test against Render + MongoDB Atlas.

Measure:

- cold
- warm
- p50
- p95
- error rate

---

# 78. ACCEPTANCE CRITERIA

The work is NOT complete merely because the code compiles.

All of the following must be true.

## Application loading

- Initial authenticated UI shell appears quickly.
- Only required data is requested.
- No full 500-record workspace fetch on every page.

## Customers

- Customer list is paginated.
- Search is debounced.
- Search is server-side.
- Customer detail loads independently.

## Transactions

- Transaction creation feels immediate.
- Optimistic UI is used where safe.
- Server response reconciles state.
- Duplicate submissions remain protected.
- No duplicate financial entries are possible because of UI optimization.

## MongoDB

- Important queries use suitable indexes.
- Query plans are verified.
- No major collection scans remain for normal workloads.
- Database payload sizes are reduced.

## Authentication

- Security remains intact.
- Session checking remains secure.
- Session `lastSeen` writes are reduced without weakening semantics.

## React Query

- Feature-specific queries exist.
- No full workspace polling.
- Mutations invalidate only related queries.
- Cached data is reused.

## Reports

- Reports are not fetched on every normal page request.
- Heavy aggregation is isolated.

## Notifications

- Unread count is lightweight.

## Render

- Cold vs warm latency is measured separately.

---

# 79. PERFORMANCE "KILL SWITCH"

The optimization strategy is considered unsuccessful and must be reconsidered if, after deployment:

- p95 critical API latency is still above 1 second without an external dependency causing it
- MongoDB queries still examine vastly more documents than they return
- frontend still downloads hundreds of records on initial load
- transaction save still requires a full workspace refetch
- Atlas CPU/connection load increases substantially despite reduced data transfer
- financial correctness tests fail
- duplicate transactions appear
- stale balances can remain visible without reconciliation
- user-facing failures increase

If any kill-switch condition occurs:

1. Stop adding more optimization layers.
2. Capture traces.
3. Identify the exact bottleneck.
4. Reproduce it.
5. Fix the underlying issue.

Do not respond to a performance problem by blindly adding caching or infrastructure.

---

# 80. IMPORTANT: DO NOT ADD REDIS YET

Do NOT introduce:

- Redis
- Kafka
- message queues
- WebSockets
- microservices
- separate read databases
- Elasticsearch
- complex distributed caching

unless measurements prove the simpler architecture is still insufficient.

The current application first needs:

- better endpoint boundaries
- pagination
- indexing
- query efficiency
- reduced data transfer
- React Query architecture
- optimistic UI
- reduced polling
- reduced authentication writes

Only after these are optimized should additional infrastructure be evaluated.

---

# 81. FINAL IMPLEMENTATION REPORT REQUIRED

When the work is complete, produce a report with:

## Before

- initial load latency
- workspace API latency
- transaction creation latency
- response sizes
- MongoDB query count
- MongoDB execution stats
- Render warm/cold latency

## After

- same measurements

## Code changes

List every changed file.

Example:

```text
server/src/models.ts
server/src/workspace.ts
server/src/security.ts
server/src/shared.ts
server/src/ledger.ts
client/src/App.tsx
client/src/api.ts
client/src/pages.tsx
client/src/context.tsx
...
```

For each file explain:

- what changed
- why
- performance impact
- correctness impact

## Database changes

List:

- indexes added
- indexes removed
- reason
- query they support

## API changes

List:

- old endpoint
- new endpoint
- response shape
- pagination strategy

## Frontend changes

List:

- queries introduced
- cache settings
- polling removed
- optimistic mutations
- lazy routes
- debouncing

---

# 82. DO NOT STOP AT "IT IS FASTER ON LOCALHOST"

The final validation must use the production architecture:

```text
Browser
  ↓
Render
  ↓
Node.js / Express
  ↓
MongoDB Atlas
```

Localhost-only measurements are insufficient.

---

# 83. FINAL ENGINEERING PRINCIPLE

The desired OkKhata architecture is:

```text
                    ┌─────────────────┐
                    │     Browser     │
                    │ React + Query   │
                    └────────┬────────┘
                             │
                       small requests
                             │
                             ▼
                    ┌─────────────────┐
                    │ Render / Express│
                    │  focused APIs   │
                    └────────┬────────┘
                             │
                    efficient queries
                             │
                             ▼
                    ┌─────────────────┐
                    │  MongoDB Atlas  │
                    │ indexed data    │
                    └─────────────────┘
```

NOT:

```text
Browser
  ↓
GET EVERYTHING
  ↓
many DB operations
  ↓
large JSON
  ↓
re-render whole application
  ↓
repeat every 30 seconds
```

The application should behave like a real financial product:

**fast reads, fast writes, small payloads, indexed queries, predictable latency, optimistic user feedback, and uncompromised financial correctness.**

---

# 84. EXECUTION INSTRUCTION TO THE CODING AGENT

Start by inspecting the repository and confirming the current implementation against this document.

Then work in this exact sequence:

```text
1. Baseline measurements
2. Instrumentation
3. Remove write-heavy work from workspace reads
4. Split API
5. Pagination
6. Indexes + explain
7. React Query refactor
8. Remove full-workspace polling
9. Targeted mutations + optimistic transaction UI
10. Search optimization
11. Render / Atlas production validation
12. Tests
13. Final performance report
```

After each phase:

- run tests
- run build
- verify existing features
- verify security
- record performance metrics

Do not perform a massive blind rewrite.

Make controlled changes, validate them, then continue.

The final goal is not merely "faster code".

The final goal is:

> **When a customer opens OkKhata, searches a person, opens their khata, records a transaction, or checks their balance, the application should respond quickly enough that the user feels the action is immediate — while the server and MongoDB maintain authoritative, correct, auditable financial data.**
