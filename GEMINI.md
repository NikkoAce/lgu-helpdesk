# LGU Daet IT Helpdesk & Identity Provider — AI Agent Guidelines

Internal IT Helpdesk and Identity Management system for the LGU of Daet, Camarines Norte. Full-stack TypeScript MERN application.

**Core Directives**: Stop live data leaks, establish accountability, and secure the perimeter. Prioritize security hotfixes and helpdesk stabilization over complex ecosystem features.

---

## 1. Technology Constraints

- **Icons**: `Tabler` ONLY — do not use lucide-react, Heroicons, or others.
- **UI**: DaisyUI 4 semantic classes first (`btn`, `card`, `modal`, `badge`, `steps`). Do not build custom UI if DaisyUI provides a component.
- **Styling**: TailwindCSS 3 + DaisyUI 4.
- **Routing**: `react-router-dom` for client-side routing.
- **Backend**: Express 4, Mongoose 8, JWT in `httpOnly` cookies or standard Authorization header depending on context.
- **Dependencies**: Check `package.json` before adding new packages. Avoid overengineering (No Redis, No Keycloak/Custom OAuth servers, No BullMQ for now).

---

## 2. Architecture Rules

- **Dual Purpose**: This system acts as BOTH an Identity Provider (IAM) and an IT Helpdesk (ITSM). Maintain clear boundaries between these domains.
- **No Database Separation**: Keep `identity` and `helpdesk` in the same database using collection-level separation. Do not split into microservices or separate databases.
- **Ticket Scoping**: NEVER scope tickets by name strings. Always use `requesterId` to prevent live data authorization leaks.
- **Ticket Assignment**: Tickets must be assignable (`assignedTo`) to enforce accountability for ICTO.
- **SLA Tracking**: Include timestamps for `firstResponseAt` and `resolvedAt`.
- **Resolution Capture**: Require resolution notes and restrict status regressions (e.g., Resolved tickets shouldn't silently go back to Pending without cause).
- **Authentication**: Stick to the RS256 JWT redirect pattern. Migrate away from hardcoded Google OAuth IDs to standardized `employeeId`.

---

## 3. Security Requirements

- **Route Protection**: Use `requireRole()` middleware instead of fragile inline string checks. Build a simple `systemAccess` array for users.
- **Fallback Secrets**: NEVER use fallback secrets for JWT or OAuth (e.g., `'fallback_secret'`). The server MUST throw a fatal error on startup if environment variables are missing.
- **Audit Logging**: Critical for Identity events (COA compliance). Log all login, approval, and role change events in an `AuditLog` collection.
- **Password Validation**: Enforce complexity rules during registration.
- **API Keys**: Transition away from a single `INTERNAL_API_KEY` to per-system API keys for ecosystem integrations.

---

## 4. Database Rules

- **Validation**: Validate requests via Zod schemas.
- **Error Handling**: Centralize error handling; never expose raw Mongoose stack traces to clients.
- **Data Preservation**: Do not drop fields or collections without approval.

---

## 5. Coding Standards

- **Logging**: Use structured logging for server events.
- **Naming Conventions**: Follow standard MERN conventions (e.g., `camelCase` for controllers/routes, `PascalCase` for models and React components).

---

## 6. AI Agent Rules

### Instruction Priority (highest → lowest)

1. **Critical Blockers & Security** — Fix ticket scoping (`requesterId`), remove fallback secrets, enforce `requireRole()`.
2. **Helpdesk Stabilization** — Add `assignedTo`, basic notifications, and SLA tracking.
3. **Data Integrity** — Audit logging for identity events, standardize `employeeId`.
4. **Ecosystem Integration** — JWKS endpoint, API versioning.
5. **Feature Enhancement** — New functionality (HRIS sync, Knowledge Base).

> Never sacrifice a higher-priority concern for a lower-priority one. Do not build complex ecosystem features if the core helpdesk workflow is broken.

### Constraints

- Review existing code before making changes.
- Do not build a custom OAuth 2.0 server or implement SCIM/SAML.
- Do not add Redis infrastructure unless explicitly approved; use Brevo API for notifications.
- Do not build a full RBAC permission engine with dynamic inheritance. `requireRole()` is sufficient.
- Mark unavoidable workarounds with `// TODO: TEMPORARY —` and document the fix plan.

### Completion Requirements

Before marking any task complete, provide:

1. **Files Changed**: Created, modified, or deleted.
2. **Features Implemented**: What was built and how it maps to the roadmap.
3. **Security Considerations**: Status of ticket scoping, fallback secrets, and audit logging.
4. **Testing Performed**: Type-checking, manual testing, and results.
