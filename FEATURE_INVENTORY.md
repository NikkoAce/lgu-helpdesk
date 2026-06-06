# FEATURE INVENTORY & API REGISTRY

This document catalogs the application features, frontend page layouts, and backend REST API endpoints of the IT Helpdesk backend and frontend workspace.

---

## 1. Feature Inventory

### 1.1 Support Ticket Management
* **Ticket Submission**: Forms for users to report IT issues, selecting subject descriptions, categorizations, and urgency tags.
* **Role-Based Scope Security**:
  - **Regular Employees**: Restrained to listing and writing comments on tickets they created.
  - **Department Heads**: Can view and comment on all ticket lists filed by employees of their respective office.
  - **ICTO Staff / Heads**: Can access, modify state (New, In Progress, Resolved, Closed), and delete ticket files system-wide.
* **Comment Timelines**: Interactive timeline for discussing troubleshooting steps on active tickets.
* **Cloudinary Media Attachments**: Upload of troubleshooting screenshots/files directly to Cloudinary storage, with administrative deletion capability.

### 1.2 Portal Account Administration (ICTO Only)
* **Approval Portal**: Review new employee registrations, changing account status (`Pending` ➔ `Active` / `Rejected`). Sends email notifications to users upon activation.
* **User Management Directory**: Search registered accounts by email, office, name, or Employee ID, with options to update roles or delete inactive profiles.

### 1.3 Helpdesk Analytics
* **Dashboard Summary Widgets**: Queries count summaries of status fields (New, In Progress, Resolved, Closed) customized by user role visibility scope.
* **Global Support Analytics**: Aggregated ticket trends and charts for ICTO heads.

### 1.4 SSO Auth Provider (Symmetric Token Minting)
* **JWT Cookie Session**: Verifies credentials or Google authentication, setting HttpOnly session cookies.
* **Single Sign-On Redirect Service**: Validates cookie sessions and redirects users to external platforms (like GSO Asset System) with short-lived SSO JWT tokens.

---

## 2. Page Inventory (Frontend Routes)

All pages are located under the `public/` folder, built with static HTML and Vanilla JavaScript.

* `/app.html` — The main helpdesk container interface. Handles auth verification redirects.
* `/tickets.html` — Table log displaying support tickets, filtered by status, role scope, and search strings.
* `/new-ticket.html` — Submission form for filing support requests.
* `/ticket-details.html` — Ticket details view containing parameters, comments thread, and file attachment form.
* `/users.html` — Operator directory to manage registration requests.
* `/analytics.html` — Chart dashboards compiling ticket status statistics (for ICTO Heads).

---

## 3. REST API Endpoint Catalog

### 3.1 Authentication & SSO Routing (`/api/auth`)
* `POST /api/auth/register` — Registers a new user account (defaults to `Pending`).
* `POST /api/auth/login` — Authenticates credentials and sets an HttpOnly cookie.
* `POST /api/auth/logout` — Destroys the authentication cookie session.
* `PUT /api/auth/change-password` — Updates the logged-in user's password.
* `POST /api/auth/forgot-password` — Generates a 15-minute reset token and emails it to the user.
* `POST /api/auth/reset-password/:token` — Validates the reset token and updates the password.
* `GET /api/auth/check-employee-id/:id` — Checks if an Employee ID is already registered.
* `GET /api/auth/me` — Returns the authenticated user's profile.
* `GET /api/auth/sso/redirect/gso` — SSO redirect handler for GSO System.
* `GET /api/auth/sso/redirect/helpdesk` — SSO redirect handler for IT Helpdesk.
* `GET /api/auth/google` — Redirects browser to Google OAuth consent page.
* `GET /api/auth/google/callback` — Handles Google callback, logs user in, and redirects to dashboard.

### 3.2 User Management (`/api/users`)
* `GET /api/users/me` — Fetches the current user's profile details.
* `PUT /api/users/me` — Updates profile settings (name, email, office).
* `GET /api/users/offices` — Proxy route fetching the LGU Daet offices config list from GSO System API.
* `GET /api/users` — Queries the user directory with search and status filters (restricted to ICTO).
* `PATCH /api/users/:id/status` — Sets user status to `Active` or `Rejected` (restricted to ICTO).
* `PATCH /api/users/:id` — Edits user account fields (restricted to ICTO).
* `DELETE /api/users/:id` — Deletes user account record (restricted to ICTO).

### 3.3 IT Helpdesk Tickets (`/api/tickets`)
* `GET /api/tickets` — Queries tickets with pagination and search, scoped by user role.
* `POST /api/tickets` — Creates a new support ticket.
* `GET /api/tickets/:id` — Fetches a single ticket and its comment history.
* `PATCH /api/tickets/:id` — Updates ticket status.
* `POST /api/tickets/:id/comments` — Adds comment with file attachment (Cloudinary upload).
* `DELETE /api/tickets/:ticketId/comments/:commentId/attachment` — Deletes file from Cloudinary and clears reference.

### 3.4 Helpdesk Analytics (`/api/analytics`)
* `GET /api/analytics/dashboard-summary` — Retrieves personalized ticket statistics for standard dashboards.
* `GET /api/analytics/summary` — Generates global ticket breakdown statistics (restricted to ICTO).
