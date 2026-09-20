# OKKHATA — MASTER SPECIFICATION

Updated: 16 September 2026.

Product direction: OkKhata retains OkCredit's publicly documented core functionality and workflows, with the customizations below, mandatory security throughout every flow, and Cloudinary for business logos and profile photos. This document is a development specification, not evidence that the application has been implemented or security-audited.

Sections 61–66 provide additional requirements and resolve conflicting wording elsewhere in this document. Latest scope: no staff or supplier management; simultaneous device logins; own profile management; mandatory mobile, email, password, password confirmation, and email OTP verification for signup.
## Build a Complete OkCredit-Inspired Digital Khata Application — MERN Stack

You are a **senior MERN architect, fintech product engineer, UI/UX designer, database architect, security engineer, mobile/PWA engineer, and DevOps engineer**.

Build a complete digital Khata/business-management application whose **functional scope, workflows, screens, modules, and business capabilities should match the publicly available OkCredit product as closely as legally and technically possible**, while using completely original implementation, branding, source code, design assets, and UI styling.

This application is NOT a pixel-perfect copyrighted clone.

Do not copy:

- OkCredit logo
- OkCredit trademarked branding
- copyrighted illustrations
- proprietary source code
- private/internal APIs
- proprietary backend architecture
- exact copyrighted copy/text
- protected visual assets

However:

> **Do NOT remove, simplify, omit, or reinterpret any user-facing product functionality merely because it is complex.**

Reproduce the **same category of features and workflows** as the reference product, except for the explicit customizations and exclusions in this specification, including Section 66.

---

# 1. CORE OBJECTIVE

Create a production-quality digital business ledger application for Indian small businesses.

The product must provide the same overall type of capabilities as OkCredit, including the publicly visible features available in the reference product, such as:

- Digital Khata
- Customer management
- Credit/debit tracking
- Payment records
- Outstanding balances
- Payment reminders
- Customer statements
- Transaction history
- Reports
- Bills/invoices
- GST billing capabilities
- Inventory/stock management
- Defaulter tracking
- Business profile
- Multi-device access
- Search
- Filtering
- Data export
- Notifications
- Business settings
- Customer-facing account experience
- Other publicly visible core OkCredit capabilities

The implementation should feel like a **real commercial product**, not a CRUD college project.

---

# 2. TECHNOLOGY STACK

## Frontend

Use:

- React
- Vite
- TypeScript preferred
- React Router
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Responsive design
- PWA
- Service Worker
- IndexedDB/local persistence for offline capabilities

## Backend

Use:

- Node.js
- Express.js
- TypeScript preferred
- MongoDB
- Mongoose

## Authentication

Use a unified authentication system supporting:

1. Email + Password
2. Email + OTP
3. Mobile Number + Password
4. Google OAuth

Google OAuth must use Firebase Authentication / Google provider where appropriate.

Do NOT force Google login as the only method.

---

# 3. CRITICAL REQUIREMENT

Everything should remain aligned with the reference product's verified feature scope and core workflows **unless explicitly customized in this document**. Track verified parity and explicit OkKhata additions separately, as required in Section 63.

There are four product customization groups, plus mandatory security and Cloudinary infrastructure requirements and the scope/signup changes in Section 66:

### CUSTOMIZATION 1
Transaction notifications and payment-pending reminders.

### CUSTOMIZATION 2
Multiple login methods.

### CUSTOMIZATION 3
App lock with 4–6 digit passcode OR phone fingerprint authentication only.

### CUSTOMIZATION 4
Complete in-app theme/color customization.

Everything else remains functionally aligned with the reference product.

Keep the additional features already specified here. Record any further proposed product changes explicitly before treating them as requirements.

---

# 4. USER-SPECIFIED CUSTOMIZATIONS

# CUSTOMIZATION 1 — TRANSACTION NOTIFICATIONS + WHATSAPP PAYMENT REMINDERS

This requirement is extremely important.

There are TWO separate communication systems.

---

## A. GIVEN / TAKEN TRANSACTION NOTIFICATION

For:

### Given Transaction

Business gives credit/udhar to customer.

Example:

```text
Owner gives customer ₹2,000 credit.
```

Customer must receive an **in-app notification**.

Notification:

```text
New transaction
₹2,000 has been added to your account with ABC Store.
```

---

### Taken / Received Transaction

Customer pays the business.

Example:

```text
Customer pays ₹800.
```

Customer/owner should receive the appropriate **in-app transaction notification**.

---

### IMPORTANT

Only **transaction events** should trigger these transaction-related in-app notifications.

Do NOT create unnecessary notification spam for every minor application action.

---

## B. PAYMENT PENDING REMINDER

For an unpaid/outstanding customer account:

The business owner has a:

> Remind Payment

action.

This reminder is NOT an internal Firebase reminder.

Instead:

# OPEN WHATSAPP ON THE PHONE

The application should launch WhatsApp using an appropriate phone deep-link / URL-based sharing mechanism.

The WhatsApp message must be prefilled with:

- Customer name
- Business name
- Pending amount
- Optional due date
- Polite reminder text

Example:

```text
Hello Rahul,

This is a friendly reminder from ABC Store.

Your pending amount is ₹2,450.

Please make the payment when convenient.

Thank you.
ABC Store
```

The customer phone number must be automatically populated when the platform supports it.

The user then presses Send inside WhatsApp.

---

## DO NOT

Do not:

- send WhatsApp messages secretly
- automate unauthorized WhatsApp messages
- scrape WhatsApp
- use unofficial WhatsApp APIs
- send messages without user action
- create fake WhatsApp delivery confirmations

The user must explicitly initiate sending through the installed WhatsApp application.

---

## PAYMENT REMINDER UX

Customer account:

```text
Outstanding: ₹2,450

[Receive Payment]
[Remind on WhatsApp]
[View Statement]
```

Click:

```text
Remind on WhatsApp
        ↓
Generate reminder text
        ↓
Open WhatsApp
        ↓
Customer chat
        ↓
Prefilled message
        ↓
Owner manually sends
```

---

# CUSTOMIZATION 2 — FOUR AUTHENTICATION METHODS

Implement all four:

These login methods apply to activated accounts. All new users, including first-time Google users, must complete the signup and email OTP requirements in Section 66 before accessing business data. Signup OTP and email login OTP are separate challenge purposes.

## METHOD 1

### Email + Password

Fields:

- Email
- Password

Support:

- Login
- Logout
- Password reset
- Account recovery

---

## METHOD 2

### Email + OTP

Flow:

```text
Enter Email
↓
Request OTP
↓
Receive OTP
↓
Enter OTP
↓
Verify
↓
Login
```

OTP must:

- expire
- be rate limited
- be one-time use
- be securely generated
- never be stored in plaintext

---

## METHOD 3

### Mobile Number + Password

Fields:

- Mobile number
- Password

Support:

- Login
- Logout
- Password reset/recovery

---

## METHOD 4

### Continue with Google

Use:

- Firebase Authentication
- Google OAuth provider

Flow:

```text
Continue with Google
↓
Google authentication
↓
Firebase credential
↓
Backend verification
↓
Existing linked user lookup / mandatory signup for new users
↓
Login
```

---

# 5. UNIFIED ACCOUNT MODEL

All authentication methods must resolve to ONE user identity.

Example:

```text
User
 ├── email
 ├── mobile
 ├── googleProviderId
 ├── authMethods[]
 └── profile
```

Do NOT create four separate accounts for the same individual.

Support account linking.

Example:

```text
User completes mandatory signup and links Google
↓
Logs in with Google or email/password
↓
Same user account
```

Also support:

```text
User logs in with mobile/password
↓
Later links Google
↓
Same account
```

Prevent accidental duplicate account creation where identity can be securely verified.

---

# CUSTOMIZATION 3 — APP LOCK

Once a user has successfully logged in, the user can enable:

### App Passcode

OR

### Phone Fingerprint / Biometric

---

## PASSCODE

Allow:

- 4 digit passcode
- 5 digit passcode
- 6 digit passcode

User chooses length.

Example:

```text
Set Passcode
Confirm Passcode
```

Never store the passcode directly.

Store a secure hash / derived credential.

---

# BIOMETRIC

Allow:

> Phone biometric authentication where the platform can enforce it. For the web/PWA, follow the capability and fallback rules in Section 64; do not claim fingerprint-only verification when the browser cannot guarantee it.

The system should use the platform's supported biometric authentication mechanism.

Examples:

- fingerprint
- device-supported biometric authentication

Do not implement a fake fingerprint UI.

Do not capture biometric data.

The application must only request authentication through the device's secure biometric API.

---

# APP LOCK FLOW

Example:

```text
User logs in
↓
App opens
↓
User enables App Lock
↓
Choose:
   Passcode
   OR
   Biometric
```

After the user leaves the application and returns:

```text
Application opens
↓
App Lock screen
↓
Fingerprint
OR
4–6 digit passcode
↓
Application unlocked
```

---

# SECURITY RULE

The app lock is NOT a replacement for server authentication.

It is an additional local protection layer.

Authentication:

```text
Login
```

App lock:

```text
Protect local session access
```

Both must exist independently.

---

# PASSCODE LOCK SCREEN

Design:

```text
            [Business Logo]

            Welcome Back

        Enter your passcode

           ● ● ● ○ ○ ○

             1 2 3
             4 5 6
             7 8 9
               0

         [Use fingerprint]
```

The keypad must feel premium and mobile-native.

---

# CUSTOMIZATION 4 — COMPLETE COLOR/THEME SYSTEM

Build a full:

# THEME ENGINE

The user can customize the entire application appearance.

Do NOT hardcode colors throughout components.

Use design tokens.

---

# THEME LIBRARY

Provide many predefined themes.

Example categories:

### Professional

- Navy
- Blue
- Indigo
- Slate
- Teal

### Fintech

- Emerald
- Cyan
- Royal Blue
- Violet

### Vibrant

- Orange
- Amber
- Pink
- Purple
- Red

### Minimal

- Neutral
- Graphite
- Monochrome
- Soft Gray

### Nature

- Forest
- Mint
- Olive
- Ocean

Provide a large theme library.

Target approximately:

> 20–30+ professionally designed presets.

Do not generate random ugly color combinations.

---

# CUSTOM COLOR MODE

Allow users to select/customize:

- Primary
- Secondary
- Accent
- Background
- Surface
- Text
- Muted text
- Success
- Warning
- Error
- Info

Support:

- HEX
- RGB
- HSL where appropriate

Use a color picker.

---

# LIVE THEME PREVIEW

When changing colors:

```text
User selects color
↓
Preview updates immediately
↓
User sees dashboard/cards/buttons
↓
Save theme
```

Do not require application restart.

---

# THEME STORAGE

Store custom theme configuration per user or business.

Example:

```text
theme:
{
  mode: "light",
  preset: "emerald",
  primary: "#...",
  secondary: "#...",
  accent: "#...",
  background: "#...",
  surface: "#..."
}
```

Theme should sync across logged-in devices.

---

# LIGHT/DARK MODE

Support:

- Light
- Dark
- System

Theme colors must work correctly in both modes.

Do not simply invert the colors.

Create separate semantic tokens for dark mode.

---

# 6. EVERYTHING ELSE MUST REMAIN FUNCTIONALLY ALIGNED WITH OKCREDIT

Outside the customization groups, security/Cloudinary requirements, and explicit exclusions in Section 66:

> **Do not deliberately remove features.**

Implement the verified publicly visible product scope of the reference application using the feature matrix in Section 63. Unverified features already requested in this document remain explicit OkKhata requirements.

This includes all relevant customer/business workflows exposed by the current reference product.

---

# 7. CUSTOMER MANAGEMENT

Customers:

- Add
- Edit
- Archive
- Search
- Filter
- Sort
- View details
- View balance
- View transaction history
- View statements
- View payment history
- View bills
- Contact customer
- Payment reminder through WhatsApp
- Customer invitation/account linking

Customer data may include:

- Name
- Mobile
- Email
- Address
- Notes
- Opening balance
- Credit limit
- Due date
- Tags
- Status
- Profile image

---

# 8. CUSTOMER LEDGER

Support:

### Given

Money/credit given to customer.

### Taken

Money/payment received from customer.

Show:

- Current outstanding
- Total given
- Total received
- Transaction history
- Due dates
- Last payment
- Overdue status

---

# 9. EXCLUDED MODULES

Staff and supplier management are out of scope. Do not implement staff invitations, staff permissions, supplier accounts, ledgers, payments, statements, or payable dashboards. Inventory stock-in and purchase-cost records remain available without supplier entities or supplier account balances.

---

# 10. TRANSACTION SYSTEM

Every transaction requires:

- Unique ID
- Business ID
- Account ID
- Party ID
- Type
- Amount
- Currency
- Transaction date
- Note
- Attachment
- Created by
- Updated by
- Status
- Audit metadata
- Timestamps

Transaction types must correctly represent business semantics.

---

# 11. ACCOUNT BALANCE

Do not permit arbitrary frontend balance manipulation.

Balance must be calculated from validated transactions.

Example:

```text
Given ₹5,000
Received ₹2,000
Outstanding ₹3,000
```

Corrections must use:

- adjustment
- reversal
- correction transaction

rather than silently rewriting history.

---

# 12. TRANSACTION NOTIFICATION RULE

When transaction successfully commits:

```text
MongoDB transaction
↓
Ledger update
↓
Notification record
↓
FCM notification
```

Never send a transaction notification before the server confirms the transaction.

---

# 13. NOTIFICATION SYSTEM

Use Firebase Cloud Messaging for:

- Given transaction notification
- Taken/received transaction notification
- Important account activity
- Bill-related notifications where applicable
- Inventory alerts
- Security notifications
- Other relevant transactional notifications

Maintain notification history in MongoDB.

---

# 14. WHATSAPP REMINDER IS SEPARATE

Never confuse these.

### FCM

Used for:

> In-app/push transaction notifications and relevant application notifications.

### WhatsApp

Used for:

> User-initiated payment-pending reminders.

These systems must remain separate.

---

# 15. BILLING

Support complete bill/invoice functionality consistent with the reference product's public offering.

Include:

- Bill creation
- Items
- Quantity
- Price
- Discount
- Tax
- Customer
- Bill number
- Date
- Due date
- Payment status
- PDF
- Share
- Print
- Download

---

# 16. GST

Support GST-enabled billing where applicable:

- GSTIN
- HSN/SAC
- CGST
- SGST
- IGST
- Taxable value
- Tax rate
- Total tax
- Invoice numbering

Do not make unsupported legal/compliance claims.

---

# 17. INVENTORY

Support:

- Products
- Categories
- SKU
- Barcode
- Purchase price
- Sale price
- Current stock
- Minimum stock
- Tax
- Stock history

Operations:

- Purchase
- Sale
- Adjustment
- Return
- Damaged
- Stock-in
- Stock-out

Maintain an inventory transaction history.

---

# 18. LOW STOCK

When:

```text
currentStock <= minimumStock
```

Create an inventory alert.

Use in-app/push notification.

---

# 19. REPORTS

Provide:

- Customer statements
- Outstanding reports
- Payment reports
- Credit reports
- Collection reports
- Sales reports where applicable
- Purchase reports
- Inventory reports
- Daily reports
- Monthly reports
- Yearly reports

Support:

- Date filtering
- Customer filtering
- Export
- PDF

---

# 20. DEFAULTER / OUTSTANDING MANAGEMENT

Dedicated screen:

```text
Outstanding Customers
```

Show:

- Name
- Amount
- Due date
- Days overdue
- Last payment
- Last transaction

Actions:

- Open account
- Receive payment
- WhatsApp reminder
- View statement

---

# 21. PDF STATEMENTS

Generate professional statements.

Include:

- Business information
- Customer
- Date range
- Opening balance
- Transactions
- Given
- Taken
- Total
- Closing balance
- Outstanding

---

# 22. SEARCH

Global search across:

- Customers
- Transactions
- Bills
- Products

Use:

- Debounce
- Indexed backend search
- Pagination
- Filters

---

# 23. OFFLINE SUPPORT

Maintain the reference product's practical offline usability.

Support:

- Cached customer data
- Cached account information
- Offline transaction entry where safe
- Pending sync queue
- Sync state
- Retry
- Conflict detection

Display:

```text
Offline
Syncing
Synced
```

Never create duplicate financial transactions during sync.

---

# 24. MULTI-DEVICE ACCESS

A user must be able to stay signed into the same account/business on multiple phones, tablets, and desktop browsers simultaneously. A new login must not automatically log out existing devices.

Each login creates an independent revocable server session. Show device/browser, creation time, last activity, and a current-session marker. Allow logout of a selected session, the current session, or all other sessions. Device labels are informational, not proof of device identity.

Sync committed ledger data, profile changes, and saved preferences across devices. App-lock settings/credentials and push registrations are device-specific. Revoked sessions must fail on the next server request, including offline sync attempts.

Data must synchronize through the backend.

Do not treat browser/local storage as the source of truth.

---

# 25. BUSINESS PROFILE

Business management:

- Business name
- Logo
- Phone
- Email
- Address
- City
- State
- PIN
- GSTIN
- Business type
- Invoice information
- Payment details

---

# 26. OWN PROFILE MANAGEMENT

User profile:

- Name
- Profile photo
- Email
- Mobile
- Authentication methods
- Notification preferences
- App lock
- Active devices
- Logout
- Account deletion where applicable

Provide a dedicated My Profile screen for viewing/editing the signed-in user's name, photo, and contact details, managing password/login methods, and accessing device sessions. Keep personal profile data distinct from the business profile. Upload, replace, and remove photos using Cloudinary.

Derive the profile owner from the authenticated session. Validate updates server-side; show loading, saved, failure, and retry states. Sync successful changes across active devices.

Changing email requires recent reauthentication and OTP verification of the new address. Retain the existing email until verification succeeds, then notify the old address. Changing mobile requires recent reauthentication and an OTP through the existing verified email; this authorizes the change but does not prove ownership of the new phone number. Never mark it phone-verified. Reject conflicting login identifiers safely.

Password changes require the current password or a verified recovery flow, matching password confirmation, secure hashing, and revocation of other sessions. Never return password hashes or OTP material in profile responses.

---

# 27. SETTINGS

Include:

## Account

- Profile
- Login methods
- Security
- App Lock
- Devices

## Business

- Business profile
- Invoice
- Tax
- Payment settings

## Notifications

- Transaction notifications
- Bills
- Inventory
- Security
- Marketing

## Appearance

- Theme preset
- Custom colors
- Light/Dark/System

## Language

Build localization architecture.

At minimum support:

- English
- Hindi
- Gujarati

Architect so more languages can be added.

---

# 28. USER ROLES

Support appropriate business roles such as:

- Owner
- Customer
- Admin

The owner manages their own business. Customers access only explicitly authorized linked accounts. Platform admin access is separate, restricted, and audited. There are no staff roles, invitations, or permission-management screens.

---

# 29. MULTI-TENANCY

Businesses are isolated tenants.

Every request must validate:

```text
Authenticated user
+
Business ownership or explicitly authorized customer-account link
+
Resource businessId
```

Never trust businessId coming from frontend.

Never allow cross-business access.

---

# 30. DATABASE COLLECTIONS

Recommended:

```text
users
authIdentities
businesses
customers
accounts
transactions
payments
bills
billItems
products
inventoryTransactions
notifications
notificationTokens
notificationPreferences
reminders
auditLogs
subscriptions
plans
supportTickets
themes
deviceSessions
otpRequests
pendingRegistrations
customerAccountLinks
```

Use proper indexes.

Store `ownerUserId` on businesses. Enforce unique normalized email/mobile login identifiers on activated accounts, with safe conflict handling. Pending registrations expire and must not indefinitely reserve another person's identifier. Store signup state, verification timestamps, and password hashes; never store password confirmation. Customer-account links require explicit authorization and cannot be inferred from an unverified phone number.

---

# 31. AUTHENTICATION ARCHITECTURE

Use:

```text
React
↓
Authentication Provider
↓
Credential / OAuth / OTP
↓
Backend Verification
↓
User Identity
↓
Business Ownership / Authorized Customer Link
↓
Authorized Session
```

For Firebase/Google authentication:

```text
Google
↓
Firebase Auth
↓
Firebase ID Token
↓
Express
↓
Verify token
↓
User
```

For email/mobile authentication:

Use secure server-managed authentication/session infrastructure.

Do not store raw passwords.

Hash passwords using a modern password hashing algorithm.

---

# 32. OTP SECURITY

OTP must have:

- Expiration
- Attempt limits
- Request throttling
- Replay protection
- One-time usage
- Secure storage
- Abuse protection

Do not return OTP in API responses.

Do not log OTP.

---

# 33. APP LOCK SECURITY

App lock is local.

The server must still require authenticated authorization.

When app lock is enabled:

```text
Authenticated session
+
Local unlock requirement
```

Do not make app lock itself equivalent to backend authentication.

---

# 34. DEVICE MANAGEMENT

Show active sessions/devices:

- Device/browser
- Last active
- Date
- Session status

Allow:

### Log out all other devices

Revoke appropriate sessions/tokens.

---

# 35. AUDIT LOGS

Log important actions:

- Login
- Logout
- Authentication method changes
- Business creation
- Customer creation
- Transaction creation
- Transaction reversal
- Payment
- Bill generation
- Inventory adjustment
- Profile changes and device session revocation
- Theme changes where useful
- Security settings changes

---

# 36. UI/UX PRINCIPLES

The application must be:

- Mobile-first
- Fast
- Lightweight
- Financial
- Clear
- Professional
- Easy for Indian shopkeepers

But do not copy OkCredit's exact visual appearance.

Create an original fintech design system.

---

# 37. DASHBOARD

Dashboard should surface:

- Receivables
- Today's activity
- Outstanding customers
- Recent transactions
- Quick actions
- Bills
- Inventory information
- Reports/analytics where applicable

Avoid unnecessary visual clutter.

---

# 38. PRIMARY ACTIONS

Make these easy:

```text
Add Customer
Give
Take / Receive
Create Bill
Receive Payment
WhatsApp Reminder
```

The common ledger transaction should be extremely fast.

---

# 39. CUSTOMER DETAIL UX

Customer screen:

```text
Customer Name
Mobile

Outstanding Amount

[Given]
[Taken]

Transactions

[Receive Payment]
[Remind on WhatsApp]
[Statement]
```

The WhatsApp button must clearly indicate that WhatsApp will open on the phone.

---

# 40. COLOR SYSTEM ARCHITECTURE

Do NOT do:

```text
className="bg-blue-500"
```

everywhere.

Instead use semantic theme variables:

```text
--color-primary
--color-secondary
--color-accent
--color-background
--color-surface
--color-text
--color-muted
--color-success
--color-warning
--color-error
--color-info
```

All components must consume semantic tokens.

This guarantees that changing the theme updates the complete application.

---

# 41. DESIGN TOKEN SYSTEM

Define:

```text
colors
typography
spacing
radius
shadows
borders
transitions
z-index
```

Theme engine should modify tokens, not individual components.

---

# 42. THEME PRESETS

Create at least 20 professionally designed presets.

Every preset must define:

- Light colors
- Dark colors
- Primary
- Secondary
- Accent
- Background
- Surface
- Text
- Success
- Warning
- Error

Make sure accessibility contrast remains acceptable.

---

# 43. CUSTOM THEME EDITOR

Create:

### Theme Studio

Features:

- Theme preset gallery
- Custom color picker
- Live preview
- Reset to preset
- Save custom theme
- Duplicate theme
- Rename theme
- Restore default

Preview:

- Dashboard
- Card
- Button
- Form
- Transaction
- Notification

---

# 44. MOBILE DESIGN

Optimize specifically for smartphones.

Use:

- Bottom navigation
- Floating/primary action
- Large touch targets
- Mobile forms
- Bottom sheets where useful
- Native-feeling interactions

Avoid desktop UI compressed onto mobile.

---

# 45. DESKTOP DESIGN

Desktop should provide:

- Sidebar/navigation
- Content workspace
- Tables
- Reports
- Multi-column layouts

Desktop must still feel like a modern fintech application.

---

# 46. ACCESSIBILITY

Support:

- Keyboard navigation
- Screen reader semantics
- Focus states
- Accessible labels
- Color contrast
- Reduced motion
- Touch accessibility

Do not use color as the only indicator of payment/financial state.

---

# 47. PERFORMANCE

Optimize:

- Route loading
- Images
- Bundle size
- MongoDB queries
- API calls
- React rendering
- Search
- Reports
- PDF generation

Use pagination and proper indexes.

---

# 48. ERROR HANDLING

Every operation needs:

- Loading
- Success
- Failure
- Retry
- Empty state

Never leave users staring at blank screens.

---

# 49. API STRUCTURE

Use:

```text
/api/v1/auth
/api/v1/users
/api/v1/businesses
/api/v1/customers
/api/v1//api/v1/accounts
/api/v1/transactions
/api/v1/payments
/api/v1/bills
/api/v1/inventory
/api/v1/reports
/api/v1/notifications
/api/v1/reminders
/api/v1/themes
/api/v1/settings
/api/v1/admin
```

Use:

- Controllers
- Services
- Validators
- Middleware
- Error handlers
- Database layer

---

# 50. SECURITY

Implement:

- Authentication
- Authorization
- Multi-tenant isolation
- Rate limiting
- Secure headers
- CORS
- Request validation
- Sanitization
- Secure password storage
- OTP protections
- Audit logs
- Secure file handling
- Token/session controls

Never expose:

- secrets
- passwords
- OTP
- private keys
- internal stack traces

---

# 51. TRANSACTIONAL CONSISTENCY

For every financial operation:

```text
Validate
↓
Authorize
↓
Create transaction
↓
Update derived financial state if necessary
↓
Create audit event
↓
Create notification
↓
Commit
```

Notification sending must not make the financial transaction falsely appear successful.

If FCM fails:

> Transaction remains successful.

Notification delivery is a separate concern.

---

# 52. WHATSAPP IMPLEMENTATION

Implement a helper:

```text
generatePaymentReminder(customer, business, outstandingAmount)
```

Output:

```text
phoneNumber
+
encodedMessage
```

Then launch WhatsApp using the supported phone/web deep-link mechanism.

Provide fallback:

```text
Copy message
Copy phone number
Open WhatsApp
```

Do NOT claim:

> WhatsApp message sent

unless your application actually receives authoritative confirmation through a supported integration.

For this implementation, use "Continue in WhatsApp to send" when launching the link. A browser link attempt does not prove that the application opened, the user sent the message, or the recipient received it.

---

# 53. NOTIFICATION ARCHITECTURE

Use:

```text
Business Event
      ↓
Notification Service
      ↓
MongoDB Notification
      ↓
FCM
      ↓
Customer Device
```

Notification types:

```text
TRANSACTION_GIVEN
TRANSACTION_TAKEN
PAYMENT_RECEIVED
BILL_CREATED
BILL_STATUS
LOW_STOCK
SECURITY_ALERT
```

Keep WhatsApp payment reminders outside this notification pipeline.

---

# 54. TESTING

Test:

### Authentication

- Email/password
- Email OTP
- Mobile/password
- Google
- Account linking

### App Lock

- Passcode
- Biometric
- Lock/unlock
- Logout behavior

### Ledger

- Given
- Taken
- Payment
- Reversal
- Balance

### Notifications

- Transaction notification
- FCM
- Read/unread
- Deep links

### WhatsApp

- Correct phone
- Correct amount
- Correct message
- Correct deep link

### Themes

- Preset
- Custom
- Light
- Dark
- Sync
- Persistence

### Security

- Cross-business access
- Invalid tokens
- Role escalation
- OTP abuse
- Unauthorized transactions

---

# 55. END-TO-END ACCEPTANCE TEST

The following must work:

```text
User opens app
↓
Enters mobile, email, password, and matching password confirmation; verifies signup email OTP to activate the account
↓
Creates business
↓
Adds customer
↓
Creates GIVEN ₹5,000 transaction
↓
Transaction is saved
↓
Customer receives in-app/FCM transaction notification
↓
Customer opens notification
↓
Customer sees ₹5,000 outstanding
↓
Owner returns to customer account
↓
Clicks "Remind on WhatsApp"
↓
WhatsApp opens
↓
Customer number is selected
↓
Reminder text contains ₹5,000
↓
Owner manually sends message
```

Then:

```text
Customer pays ₹2,000
↓
Owner records TAKEN ₹2,000
↓
Ledger becomes ₹3,000 outstanding
↓
Appropriate transaction notification is generated
```

Then:

```text
Owner changes theme
↓
Theme Studio
↓
Selects preset
↓
Application updates immediately
↓
Owner changes primary color manually
↓
Entire application updates
↓
Theme saved
↓
Theme persists after relogin
```

Then:

```text
Owner enables App Lock
↓
Chooses 6-digit passcode
↓
Leaves application
↓
Returns
↓
Passcode screen
↓
Unlock
```

or:

```text
Owner enables biometric
↓
Leaves application
↓
Returns
↓
Device biometric prompt
↓
Successful biometric authentication
↓
Application unlocked
```

---

# 56. PROJECT STRUCTURE

Frontend:

```text
client/
  src/
    app/
    components/
    layouts/
    pages/
    features/
      auth/
      dashboard/
      customers/
      accounts/
      transactions/
      payments/
      bills/
      inventory/
      reports/
      notifications/
      whatsapp/
      themes/
      profile/
      settings/
    hooks/
    services/
    api/
    stores/
    utils/
    theme/
    i18n/
```

Backend:

```text
server/
  src/
    config/
    controllers/
    services/
    models/
    routes/
    middleware/
    validators/
    repositories/
    notifications/
    auth/
    payments/
    reports/
    jobs/
    utils/
```

---

# 57. REQUIRED DOCUMENTATION

Create:

```text
README.md
PROJECT_MASTER.md
REQUIREMENTS.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_SPECIFICATION.md
AUTH_ARCHITECTURE.md
SECURITY.md
APP_LOCK_ARCHITECTURE.md
NOTIFICATION_ARCHITECTURE.md
WHATSAPP_REMINDER_ARCHITECTURE.md
THEME_SYSTEM.md
OFFLINE_SYNC.md
UIUX_SPECIFICATION.md
TESTING.md
DEPLOYMENT.md
```

---

# 58. DEVELOPMENT ORDER

Implement in this exact order.

## Phase 1

Project foundation.

## Phase 2

Authentication:

- Mandatory signup and email OTP activation
- Email/password
- Email OTP
- Mobile/password
- Google OAuth
- Account linking

## Phase 3

Business/account structure.

## Phase 4

Customer management and authorized customer-account linking.

## Phase 5

Ledger and transactions.

## Phase 6

FCM transaction notifications.

## Phase 7

WhatsApp reminder flow.

## Phase 8

Bills and GST.

## Phase 9

Payments.

## Phase 10

Inventory.

## Phase 11

Reports and statements.

## Phase 12

Offline sync.

## Phase 13

App lock.

## Phase 14

Theme engine.

## Phase 15

Admin/business settings.

## Phase 16

Final testing, security review, and performance verification. Security design, implementation, and regression tests begin in Phase 1 and continue in every phase; they must not be deferred until Phase 16. Integrate Cloudinary with the business/profile flows.

## Phase 17

Final UX polish.

---

# 59. FINAL NON-NEGOTIABLE RULE

The final product should be treated as:

> **"OkCredit-aligned functionality, original OkKhata implementation, four customization groups, explicit scope/signup changes, security throughout, and Cloudinary for logos and profile photos."**

Those four customization groups are:

### 1.
**Communication: Given/Taken transactions use in-app + Firebase push notifications. Payment-pending reminders open WhatsApp with the customer number, reminder text, and outstanding amount; the owner sends manually.**

### 2.
**Authentication supports Email/Password + Email/OTP + Mobile/Password + Google OAuth.**

### 3.
**App lock protects a logged-in session using a 4–6 digit passcode or supported device verification, subject to Section 64.**

### 4.
**Appearance includes the complete theme library, custom colors, and light/dark/system modes.**

PLUS:

**Mandatory infrastructure: secure end-to-end flows and Cloudinary for business logos and user/customer profile photos.**

Do not introduce additional deviations from the reference product unless required by legal, platform, security, or technical constraints.

---

# 60. IMPLEMENTATION STANDARD

The final application must be:

```text
Feature-complete
+
Financially correct
+
Secure
+
Mobile-first
+
Offline-capable
+
Multi-device
+
Themeable
+
Notification-enabled
+
WhatsApp-integrated
+
Production-ready
```

Do not build fake buttons.

Do not build placeholder screens.

Do not omit difficult features.

Do not create a superficial clone.

Build each feature end-to-end:

```text
UI
↓
Validation
↓
API
↓
Business logic
↓
Database
↓
Authorization
↓
Error handling
↓
Audit
↓
Notification where applicable
↓
Testing
```

The application must be maintainable and extensible.

The visual identity must be original.

The functional scope should closely match the reference product.

The four customization groups and mandatory infrastructure requirements must be treated as first-class product requirements.

---

# 61. SECURITY THROUGHOUT EVERY FLOW

Security is a release requirement for every module, including recovery, offline sync, image uploads, reports, customer access, and personal profile management. No claim of absolute security is permitted; demonstrate controls with tests and document residual risks.

## A. Authentication and recovery

- Hash passwords with Argon2id using individually generated salts and a deployment-benchmarked cost no weaker than current OWASP guidance. Support long passwords and reject known compromised passwords. Never silently truncate passwords. See [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Use generic login, OTP request, and recovery responses to reduce account enumeration. Rate-limit by account and network signals using a shared store across server instances.
- Require recent reauthentication before changing identifiers, linking/unlinking login methods, changing security settings, or deleting an account. Verify new email ownership before activating it; apply the mobile identifier rules in Section 66. Never automatically merge accounts solely because an email or phone matches. Do not unlink the last usable login method. See [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- Bind OTPs to a challenge ID, destination, purpose, and expiry. Proposed initial policy: 5-minute validity, 5 verification attempts, 60-second resend cooldown, and additional hourly request limits. Tune limits against abuse and legitimate use. Store short OTPs using a keyed HMAC with a server-held secret; a plain fast hash is insufficient. Atomically consume successful challenges and invalidate superseded challenges.
- Password reset must use expiring, single-use proof through an already verified recovery channel. Resetting a password revokes existing sessions and sends a security notification. Recovery must not rely on customer ledger details or security questions. See [OWASP password recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
- Mobile is required at signup, with email OTP as the required verification channel. Treat mobile as an unverified login identifier paired with the password; never infer phone ownership or use the number alone for recovery, customer linking, or account merging. Recovery uses verified email. SMS OTP is not required by this signup scope.
- Verify Google Firebase ID tokens server-side with the Admin SDK, including issuer, audience/project, expiry, and provider identity. Use verified provider identifiers for linking. Never trust a frontend email or decoded token without signature verification.

## B. Sessions and authorization

- Prefer opaque server-managed sessions in Secure, HttpOnly, appropriately scoped SameSite cookies over long-lived browser-storage tokens. Rotate session identifiers after login or privilege changes; define idle and absolute expiry and immediate server-side revocation. See [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- Protect cookie-authenticated mutations against CSRF; validate origins and use an explicit CORS allowlist. Require HTTPS in production.
- Deny access by default. Check active account status, role, action, business ownership or authorized customer link, and resource ownership on every API, export, background job, download, and notification subscription.
- A customer may access only accounts explicitly linked through verified ownership/invitation. A merchant entering someone's phone number does not authorize that person to view other records or prove a customer account link.
- Scope database reads/writes by authorized tenant and resource. Reject mass assignment of role, owner, balance, verification status, and business identifiers.
- Require MFA for privileged operator/admin access; offer an additional factor for business owners. Keep the four login entry methods. Any enrolled MFA also applies after alternative login and recovery flows.

## C. Financial correctness and reliable flows

- Store money in integer minor units or a consistently configured exact-decimal representation. Define currency, rounding, amount limits, and customer give/receive sign conventions; never use binary floating-point arithmetic for totals.
- Require tenant-scoped idempotency keys for payment, ledger, invoice posting, reversal, and offline sync operations. Enforce unique indexes. Reject reuse with a different payload and return the original result for legitimate retries.
- Atomically commit ledger entries, derived balances, inventory effects when applicable, audit records, and notification outbox events in MongoDB transactions. Use a replica-set-capable deployment. Handle concurrent updates with explicit version checks or transactional invariants.
- Publish notification outbox events only after commit. Retry delivery with backoff and deduplicate by event/recipient. Provider failure must not roll back or duplicate a valid financial record.
- Record corrections as linked reversals/adjustments. Maintain actor, reason, time, and original-entry references. Prevent double reversal and reconcile derived balances against ledger history.
- Distinguish manually recorded payments from provider-confirmed payments. If payment collection is implemented, verify signed provider webhooks and idempotency; a redirect or screenshot does not establish payment success.
- Every mutation must handle double taps, timeout after commit, retry, expired session, revoked permission, and concurrent edits without silent loss or duplication.

## D. Application and operational controls

- Validate request schemas and size limits server-side. Allowlist fields and query operators; prevent NoSQL injection. Escape untrusted text in HTML/PDF output and protect spreadsheet exports from formula injection.
- Apply a restrictive Content Security Policy, secure response headers, safe redirect allowlists, and protections against arbitrary remote URL fetching. Validate theme values as colors, never arbitrary CSS/HTML.
- Keep secrets in deployment secret storage; never place secrets in frontend bundles, repositories, logs, or client-visible errors. Separate environments and use least-privilege database/service credentials.
- Encrypt databases and backups at rest through the hosting platform. Maintain access-controlled audit records with tamper detection, retention rules, redaction, monitoring, and tested restore procedures.
- Define an incident response process, dependency/secret scanning, resource quotas, and alerts for suspicious logins, upload abuse, and financial reconciliation failures.

---

# 62. CLOUDINARY — LOGOS AND PROFILE PHOTOS

Cloudinary is the required storage and delivery service for business logos and user/customer profile photos. MongoDB stores asset metadata and ownership references rather than image binaries or base64 content. Financial attachments require a separately documented private-media policy.

## Secure upload and update flow

1. The user selects/crops an image and submits it to an authenticated OkKhata media endpoint.
2. The server checks permission for the target profile/business and applies upload quotas.
3. Initially accept JPEG, PNG, and WebP, with a proposed 5 MB file limit and 20-megapixel decoded-image limit. Verify decoded content, reject SVG/HTML and malformed files, strip metadata, and re-encode using a maintained image library with resource limits.
4. Upload the validated image server-to-server using Cloudinary's signed SDK upload. Keep the API secret server-side. Use server-generated asset IDs and controlled parameters; never let clients choose another tenant's asset or unrestricted transformations. See [Cloudinary uploads](https://cloudinary.com/documentation/upload_images).
5. Store the verified provider response: asset ID, public ID, version, resource type, delivery type, format, size, dimensions, owner ID/business ID, purpose, and timestamps. Validate ownership again when attaching the asset.
6. Atomically switch the profile reference only after successful upload. Retain the previous image if upload/save fails; clean up abandoned uploads and old unreferenced assets with retryable jobs.

## Delivery, replacement, and deletion

- Business logos may be public when intended for customer-facing display. Treat profile photos as access-controlled by default and scope visibility to authorized viewers.
- Signed upload authorization does not make delivery private. Cloudinary `authenticated` delivery protects originals and derivatives; expiring access requires an appropriate time-limited download/token mechanism or an authorized backend delivery layer. Ordinary signed transformation URLs must not be described as automatically expiring. See [Cloudinary media access control](https://cloudinary.com/documentation/control_access_to_media).
- Authorize image reads before issuing protected access. Do not use guess-resistant filenames as authorization. Do not log sensitive delivery URLs or cache private photos in shared/public caches.
- Restrict transformations to required avatar/logo sizes and optimized formats. Use responsive rendering, loading/error states, initials fallback, and a remove-photo action.
- Authorize replacement/deletion using stored asset ownership. Delete through the backend, invalidate cached delivery where applicable, and retain retries/audit metadata for failures. Document that existing downloaded copies cannot be recalled.
- Configuration: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Only nonsecret public configuration may reach the browser. Use separate product environments for development and production.
- Add `/api/v1/media` and media/upload lifecycle records, plus `CLOUDINARY_MEDIA_ARCHITECTURE.md` covering ownership, visibility, deletion, quotas, and failure recovery.

---

# 63. OKCREDIT BASELINE AND EXPLICIT OKKHATA CHANGES

Keep OkCredit's core workflow behavior as the reference: customer selection, give/receive entries, balances, history, statements, reminders, billing, stock, and multi-device use. Preserve the included features even where reference parity remains unverified. Staff and supplier features are excluded regardless of reference-product support.

Create `FEATURE_PARITY_MATRIX.md` before implementation. Each row must contain:

- Feature and relevant screen/workflow.
- Official public reference URL, observation date, platform, and plan where known.
- Status: verified reference feature, explicit OkKhata addition/customization, or reference behavior requiring verification.
- Expected behavior, acceptance criteria, implementation state, and test evidence.
- Any documented deviation and its security, platform, provider, or product reason.

Initial official references checked on 16 September 2026:

- [OkCredit public website](https://okcredit.in/en/).
- [OkCredit pricing and plans](https://okcredit.in/pricing).
- [OkCredit FAQ](https://okcredit.in/faq).
- [Official Android listing](https://play.google.com/store/apps/details?id=in.okcredit.merchant).

These sources describe ledger functionality and offerings including billing, inventory-related billing workflows, and multi-device access. Some capabilities depend on platform or plan. They do not establish that every requested module has exact feature parity. Do not claim complete parity until the matrix is verified. OkCredit subscription prices, advertisements, and commercial restrictions are not automatically OkKhata requirements.

Keep original OkKhata branding, assets, wording, and implementation. Additional changes require an explicit requirement entry; never silently remove requested functionality because it is difficult.

---

# 64. WEB/PWA SECURITY AND CAPABILITY LIMITS

## App lock

- Relock when the application backgrounds according to the configured policy, before displaying private content on return. Clear sensitive in-memory views on logout and coordinate logout across tabs.
- Prefer a 6-digit passcode while allowing the requested 4–6 digits. Use a salted derived verifier, progressive retry delays, and full reauthentication for recovery. Do not recover or email the original passcode.
- A browser-local retry counter or hash cannot prevent a device owner/attacker with local storage or script access from bypassing UI checks or brute-forcing a short PIN. Do not present this lock as strong protection for a compromised browser or encryption of all local records.
- WebAuthn can request platform user verification, but verification may use biometrics or a device PIN. A web app cannot reliably force fingerprint-only authentication. See the [W3C WebAuthn specification](https://www.w3.org/TR/webauthn/).
- Label supported browser verification accurately as device verification. If strict fingerprint-only behavior is required, mark it unsupported on browsers that cannot enforce it and retain the application passcode option. Any native implementation must document the platform guarantees before claiming biometric-only support.
- Verify WebAuthn challenge, origin, RP ID, signature, user-verification flag, and credential ownership server-side. Enrollment requires recent authentication. Do not use a successful browser callback alone as proof.

## Offline data and customer notifications

- Cache the application shell separately from private data. Do not cache authenticated API responses or private images in a public/shared service-worker cache.
- Minimize offline records; document encryption and key storage without suggesting that a short PIN alone protects a stolen database. Where adequate device-backed protection is unavailable, restrict sensitive persistent caching and explain the resulting offline limits.
- Partition queued entries by account/business. On sync, reauthenticate and reauthorize every operation. Quarantine revoked/conflicting writes for review; never silently send one user's queued data under another user's session.
- Logout/account switching removes accessible private caches and credentials. Warn about unsynced entries before destructive cleanup and provide an explicit resolution flow.
- In-app notification history does not depend on push permission. Push requires a verified linked customer account, valid device registration, permission, and platform support. If these are absent, show the actual notification state; do not claim delivery.
- Bind device tokens to authenticated users, remove them on logout/revocation, and authorize notification deep links. Hide financial amounts from lock-screen push previews by default.
- WhatsApp actions remain manually initiated and must display the latest available amount and any offline/stale-data warning before opening the message.

---

# 65. RELEASE ACCEPTANCE — SECURITY AND CLOUDINARY

Add integration and end-to-end tests that exercise actual boundaries:

1. An owner/customer from another business cannot read, edit, export, receive notifications about, or replace images for a victim business by altering identifiers.
2. OTP replay, concurrent verification, resend abuse, expired recovery links, mismatched Google identities, and unverified account-link attempts fail safely.
3. Revoked sessions and removed customer-account links cannot perform unauthorized actions, including queued offline writes. CSRF requests and forbidden field assignments are rejected.
4. Double submission, request timeout, concurrent payments, and repeated sync produce exactly one ledger effect per authorized operation. Reversals reconcile balances and notification delivery failures do not corrupt entries.
5. Oversized, malformed, spoofed-format, and unauthorized image uploads fail. Cloudinary credentials remain absent from client bundles and logs. Private original and transformed images reject unauthorized delivery.
6. Failed image replacement preserves the prior photo; orphan cleanup, deletion retries, and cache behavior are verified with a Cloudinary test environment.
7. App lock, background/return behavior, unsupported device verification, account switching, offline cache cleanup, and push-denied scenarios are tested on supported mobile browsers.
8. Document backup restore evidence, secret/dependency scan results, rate-limit behavior, authorization test results, and a security review. Resolve exploitable critical/high findings before production release.

Development must fail closed when required production credentials or services are missing. Clearly separate local test adapters from real integrations. Do not claim production readiness until these checks and the feature acceptance criteria pass.

---

# 66. LATEST SCOPE AND SIGNUP REQUIREMENTS

This section takes precedence over any earlier instruction to reproduce all reference-product functionality without exclusions.

## A. Included and excluded scope

- Remove staff management completely: roles, invitations, permissions, screens, APIs, collections, and workflows.
- Remove supplier management completely: supplier profiles, ledgers, payments, statements, filters, navigation, reports, and payables summaries.
- Retain customer management, customer ledgers, billing, inventory, reports, notifications, WhatsApp reminders, app lock, themes, Cloudinary, and the security requirements for these features.
- Inventory purchase/stock-in and purchase-cost reporting remain independent of supplier accounts. Do not reintroduce supplier management through inventory or billing.
- Businesses are managed by their owner; multiple device logins refer to the same person's account, not additional staff accounts.
- Record these exclusions and signup changes explicitly in the feature parity matrix.

## B. Mandatory new-user signup

Required fields:

| Field | Requirement |
| --- | --- |
| Mobile number | Required; normalize with country code and validate format |
| Email address | Required; validate and normalize consistently for login uniqueness |
| Password | Required; apply the password security policy |
| Confirm password | Required; must exactly match password; never persist it |
| Email OTP | Required after form submission, before account activation |

Flow:

```text
Sign up
↓
Enter mobile + email + password + confirm password
↓
Validate fields and identifier conflicts server-side
↓
Create expiring pending registration with a password hash
↓
Send verification OTP to the entered email
↓
Enter OTP / resend within configured limits
↓
Verify purpose, destination, registration, expiry, and attempts
↓
Atomically consume OTP and activate the unique account
↓
Create authenticated device session
↓
Complete own profile and business setup
```

- A pending registration may access only the minimal verification/resend flow; it has no business or ledger access. Mark email verified only after a successful signup OTP check.
- Recheck identifier uniqueness at activation using database constraints. Concurrent submissions and OTP retries must not create duplicate users, duplicate sessions from replay, or overwrite an existing account.
- Tie the challenge to the pending registration and a secure registration continuation token. Starting a pending signup must not log out, alter, or reset any existing account.
- Apply the OTP protections in Section 61: secure generation, keyed storage, expiry, attempt limits, resend cooldown, abuse limits, and atomic one-time consumption. Clear password/confirmation from client state once submitted; never persist them in browser storage or logs.
- Changing the pending email invalidates its old OTP. Expire abandoned registrations and handle delivery failure with an accurate retry state. Do not activate accounts because an email was merely sent.
- Keep errors useful without exposing whether a particular person already has an account. Guide legitimate users toward login/recovery through a safe flow.
- Email verification is mandatory. Mobile collection does not establish phone ownership; `mobileVerifiedAt` remains unset. Never automatically link customer financial records based on the supplied mobile number. Handle disputed/conflicting phone identifiers through authenticated recovery/support without exposing or transferring another account.

## C. Existing users and Google login

- Retain Email/Password, Email/OTP, Mobile/Password, and Google login for activated accounts, with enrolled MFA applied consistently.
- A login OTP cannot activate an incomplete registration or be reused as a signup, email-change, or password-reset OTP.
- First-time Google users must provide mobile, email, password, and matching confirmation and complete the app's signup email OTP verification. Google verification alone does not bypass this explicitly required signup step.
- Returning Google users with a securely linked, activated account sign in normally. Link Google only after verified provider authentication and account-ownership checks; never merge on a matching email alone.
- Password recovery goes through the verified email. Mobile/password login uses the mobile identifier plus password; it does not assert phone possession.

## D. Acceptance criteria

1. Missing required fields, invalid formats, weak passwords, and password mismatch prevent signup on both client and server.
2. Unverified registrations cannot access the dashboard, create businesses, read customer records, or use ordinary login to bypass activation.
3. Correct signup OTP activates exactly one account. Wrong, expired, superseded, replayed, or wrong-purpose OTPs fail; resends and attempts are rate-limited.
4. First-time Google and email-OTP users cannot bypass required signup fields or email OTP activation.
5. The same activated user stays signed in on two devices. A profile/ledger update appears on both, while revoking one session leaves the other usable.
6. A user can edit their own profile and Cloudinary photo, but cannot edit another user's profile by changing request identifiers. Email change remains pending until OTP verification.
7. No staff/supplier navigation, routes, role grants, models, reports, or workflows are exposed. Remaining inventory and customer flows work without these entities.
8. Concurrent signup attempts, abandoned registrations, identifier conflicts, OTP delivery failures, and unverified-phone account-link attempts are tested without leaking or taking over existing accounts.

## 67. Personal-first preferences and payment privacy

- **Typography controls:** users can choose DM Sans, Manrope, Inter, Plus Jakarta Sans, Nunito Sans, Lora, or Atkinson Hyperlegible. A reading scale from 90% to 125% is stored on the account and applied on every signed-in device.
- **India mobile default:** signup and contact-change flows start with `+91` (India). The server normalizes and validates the complete E.164 number before storing it.
- **Feature visibility:** Customers and Transactions are enabled by default. Bills, Inventory, Reports, and Notifications start disabled and are individually enabled in Settings. The server enforces these toggles on workspace reads and write routes.
- **Verified profile edits:** display-name edits require a one-time code sent to the already verified email. Email or mobile changes require OTP verification and a seven-day cooldown, enforced using a server timestamp. Other sessions are revoked after a successful contact change.
- **Personal mode:** new accounts default to Personal. Shared profile views expose name and photo while hiding email and phone. Business mode and contact visibility are explicit opt-ins.
- **UPI collection:** an owner can save a UPI ID or upload a scanner QR. A customer chooses the full pending balance or enters an amount; the app creates an amount-specific `upi://pay` QR/deep link, records a payment request, and only deducts the ledger after explicit confirmation or a trusted provider webhook. Payment requests remain in history with amount, status, and timestamps.

## 68. Personal payments, calculator, language, and deployment

- UPI ID and scanner QR settings are available for personal and business accounts. They are shown wherever a customer payment is initiated; changing either value updates future payment requests without exposing account credentials.
- Give-credit and receive-payment dialogs include a local calculator with addition, subtraction, multiplication, division, and percentage operations. Only the resulting numeric amount is submitted to the server's integer minor-unit validation.
- English is the default UI language. Users can choose Hindi, Gujarati, or Hinglish in the app settings/global language control. The preference is stored on the account and applied across routes and devices. User-entered customer names remain exactly as entered.
- Deployment supports a GitHub-connected Vercel client and Render API. `VITE_API_URL` points the client to Render, `APP_ORIGIN` allowlists the exact Vercel URL, and Render uses secure credentialed CORS cookies. SMTP variables are configured with the owner's personal mailbox and app password for signup and profile OTP delivery.
