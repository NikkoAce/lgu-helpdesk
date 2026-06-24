# IT HELPDESK ARCHITECTURE AUDIT REPORT

This architecture audit details the structural health, security risks, technical debt, and modernization roadmap for the LGU Daet IT Helpdesk and integrated portal backend.

---

## 1. Application Overview

The IT Helpdesk system (code name `applayout`) is a MERN stack application that acts as the backend API for both the LGU Employee Portal and the IT Helpdesk client. It exposes endpoints for authentication, role-based user directory administration, single sign-on (SSO) redirects, ticket tracking, and ticket comments.

### Core Modules
1. **User Identity Backend**: Manages user schemas, email registration approvals, and Google OAuth credentials.
2. **SSO Redirection Engine**: Authenticates browser cookie sessions and redirects users to external platforms (such as GSO and Helpdesk) with short-lived SSO JWT tokens.
3. **Support Tickets Control**: Handles ticket submissions, comment boards, and attachment uploads (integrated with Cloudinary).
4. **Dashboard Analytics**: Queries support complaint summaries and monthly trend records.

---

## 2. Security Concerns & Vulnerabilities

### 2.1 Google OAuth Registration Status Bypass
* **Finding**: Users registering through the portal's credential registration are created with `status: 'Pending'` and must wait for ICTO approval. However, Google Sign-In sign-ups (defined in `passport.js`) are created directly as active users:
  ```javascript
  const newUser = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      employmentType: 'Permanent',
      role: 'Employee',
      employeeId: `google-${profile.id}`,
      status: 'Active' // Bypasses pending review!
  });
  ```
* **Risk**: **Critical**. Any user with a Google account can sign up and immediately access the portal and download templates or request SSO access to GSO and helpdesk systems.
* **Recommendation**: Force all new Google OAuth sign-ups into a `Pending` registration review state, requiring the user to complete their profile (Employee ID, office location) and wait for ICTO approval.

### 2.2 Shared JWT Secrets (HS256)
* **Finding**: GSO, IT Helpdesk, and the Portal backend verify SSO credentials symmetrically using the exact same secret key (`process.env.JWT_SECRET`).
* **Risk**: **High**. If the secret is compromised on any service, attackers can forge credentials for the entire LGU application ecosystem.
* **Recommendation**: Adopt asymmetric RS256 token verification. The portal backend (SSO authority) signs tokens with a private key, and downstream consumers (like GSO) verify them using a public key.

### 2.3 SSO Token Leaking in URL Queries
* **Finding**: The SSO redirect controller (`auth.controller.js`) redirects the user to connected services (e.g. GSO) by appending the JWT token directly to the URL query string:
  ```javascript
  const redirectUrl = `${gsoFrontendUrl}?sso_token=${ssoToken}`;
  res.redirect(redirectUrl);
  ```
* **Risk**: **High**. This leaks the SSO token to browser history, server logs, and referrer headers. If the user navigates away from GSO to an external link, the token is sent in the referrer log.
* **Recommendation**: Implement a POST-based token exchange or use a secure, shared-domain cookie.

### 2.4 Lack of Login Rate Limiting
* **Finding**: Standard credentials login (`POST /api/auth/login`) has no rate limiting middleware registered.
* **Risk**: **Medium**. Leaves user accounts vulnerable to automated brute-force attacks on Employee IDs.
* **Recommendation**: Add the `express-rate-limit` middleware to the login route.

### 2.5 Static Shared API Key Integration
* **Finding**: The proxy route for retrieving GSO offices (`getGsoOffices`) relies on a static shared API key (`X-Internal-API-Key`) sent via header requests:
  ```javascript
  const response = await fetch(`${gsoApiUrl}/api/offices/public`, {
      headers: { 'X-Internal-API-Key': internalApiKey }
  });
  ```
* **Risk**: **Low-Medium**. If this static key is leaked or hardcoded in configurations, attackers can bypass public restrictions on GSO.
* **Recommendation**: Rotate the key regularly or secure the communication via mutual TLS (mTLS) or server-to-server OAuth.

---

## 3. Technical Debt Analysis

### 3.1 Split Authentication Session Architectures
* **Finding**: The backend manages two different authentication mechanisms:
  1. Standard credentials login uses JWT-based HttpOnly cookies (`portalAuthToken`).
  2. Google OAuth uses express-session cookies (`connect.sid`) stored in a MongoDB `sessions` collection.
* **Debt Impact**: **High**. This split architecture complicates logout, session invalidation, and middleware tracking. It requires maintaining both Passport session stores and manual JWT decoding logic.
* **Recommendation**: Unify authentication. After Google OAuth completes, generate the same JWT `portalAuthToken` cookie and disable Express session persistence.

### 3.2 Inconsistent Validation Coverage
* **Finding**: Validation rules (like password strength) are duplicated between different files (e.g., `auth.controller.js` and frontend JS scripts) using custom regex patterns.
* **Debt Impact**: **Medium**. Changes to validation rules must be manually copied to multiple locations, leading to inconsistencies.
* **Recommendation**: Centralize validation using Zod in a shared npm workspace shared by both backend and frontend.

### 3.3 Vanilla DOM UI Logic
* **Finding**: The frontend directory (`public/`) consists of static HTML and JS scripts that manually parse elements and inject strings.
* **Debt Impact**: **High**. Prone to state bugs and memory leaks.

---

## 4. Recommended MERN + TypeScript Architecture

We recommend converting the codebase into a monorepo structure with TypeScript on both the frontend and backend.

### 4.1 Monorepo Folder Structure
```text
/helpdesk-root/
  ├── package.json
  ├── tsconfig.base.json
  ├── packages/
  │   ├── shared/                 # Shared validation schemas & interface types
  │   │   ├── package.json
  │   │   └── src/
  │   │       ├── types/          # Shared User/Ticket types
  │   │       └── validation/     # Shared Zod validation schemas
  │   ├── backend/                # Express API Backend in TypeScript
  │   │   ├── package.json
  │   │   ├── tsconfig.json
  │   │   └── src/
  │   │       ├── config/         # Server config (db, passport, cloudinary)
  │   │       ├── controllers/    # Controller request handlers
  │   │       ├── services/       # Core business logic
  │   │       ├── models/         # Mongoose schemas with type safety
  │   │       ├── middlewares/    # Auth, Validation, Errors
  │   │       └── routes/         # Type-safe API routers
  │   └── frontend/               # React + TypeScript + Vite Frontend
  │       ├── package.json
  │       ├── tsconfig.json
  │       ├── vite.config.ts
  │       └── src/
  │           ├── components/     # UI components
  │           ├── pages/          # Login, Dashboard, Profile, Tickets
  │           └── services/       # API interface clients
```

### 4.2 Architecture Implementation Strategies
1. **Frontend Framework**: Migrate the static HTML/CSS structure to **React + Vite + TypeScript**.
2. **Component & Design Library**: Standardize on **Tailwind CSS + Shadcn/ui** to replace Vanilla CSS and raw DaisyUI. This provides clean visual aesthetics, responsive drawers, and modern dashboards.
3. **Unified Auth**: Retire `express-session` and unify authentication on the backend to issue a JWT token cookie after successful password or Google OAuth login.
4. **Data Validation**: Enforce request parameters using Zod validation schemas shared between frontend inputs and backend route middlewares.

---

## 5. Migration Risks

1. **Google Auth Account Linking**:
   - **Risk**: Migrating user accounts to a new model structure could break existing Google-linked profiles if `googleId` fields are not mapped correctly.
   - **Mitigation**: Run a staging database validation pass to verify account linking matches email mappings.
2. **SSO Secret Rollout Decoupling**:
   - **Risk**: Changing the portal's SSO signing method (e.g., from HS256 to RS256) will break SSO with the GSO system if not deployed concurrently.
   - **Mitigation**: Deploy the update in phases. Keep HS256 validation enabled on GSO as a fallback until the portal's key rotation is complete.

---

## 6. Refactoring Priority List

### Phase 1: High Priority (Security & Fixes)
1. **Fix Google Sign-Up Auto-Approval**: Update `passport.js` so that users signing up via Google are created in a `Pending` state, requiring admin approval.
2. **Decouple JWT Secrets (RS256)**: Implement RS256 asymmetric signatures for SSO tokens.
3. **Login Rate Limiter**: Apply `express-rate-limit` to `/api/auth/login`.

### Phase 2: Medium Priority (Framework & Unification)
4. **Initialize React Frontend**: Create React + Vite workspace, replacing static HTML files.
5. **Unify Backend Session Management**: Retire Express Session and Mongo session collections, using JWT HttpOnly cookies for both credential and Google OAuth logins.
6. **Introduce Zod Validations**: Implement backend schema validation on register and reset-password routes.

### Phase 3: Low Priority (Optimization)
7. **Logging**: Add a logger (e.g., Winston) on the backend.
8. **Testing**: Write unit tests for ticket routing scopes and ticket analytics calculators.
