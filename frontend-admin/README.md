# meetCITAD v2 — Administration Portal

The administration portal is a Vue 3 single-page application for CITAD staff.
It covers event operations, attendance, certificates, participants, feedback,
notifications, administrator accounts, audit history, exports, and system
status.

## 1. Stack and requirements

| Item | Value |
| --- | --- |
| Framework | Vue 3 + Vite 5 |
| UI | Vuetify 3, Material Design Icons |
| State | Pinia |
| HTTP | Axios |
| QR decoding | `jsqr` with the browser `getUserMedia` camera API |
| Dev port | `5174` |
| API target | `http://localhost:4000` by default |
| Node.js | 20 LTS or newer recommended |

## 2. Setup

```bash
cd meetCITAD/frontend-admin
npm install
npm run dev
```

Open `http://localhost:5174`. The backend must be running on port `4000` (or
`VITE_API_BASE_URL` must point to another API origin).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 5174 |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

### Environment

Create `.env.local` when the defaults are not suitable:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_PUBLIC_SITE_URL=http://localhost:5173
```

- `VITE_API_BASE_URL` defaults to `/api/v1`; in development, Vite proxies
  `/api` and `/uploads` to `http://localhost:4000`. Certificate PDFs are not
  served from a public file path.
- `VITE_PUBLIC_SITE_URL` is shown on the Settings page and is used to link to
  the participant site.

## 3. Authentication and session

- Login uses `POST /auth/admin/login` with `email`, `password`, and, when
  enabled for the account, `twoFactorCode` (TOTP or a single-use recovery code).
- Super administrators must enroll in TOTP before a full session is issued. The
  login screen displays the QR code and manual setup key, then shows recovery
  codes once enrollment is verified.
- Recovery codes can be regenerated from Settings after re-entering the current
  password and a valid TOTP code.
- Administrator emails must belong to an approved CITAD domain; the backend
  rejects other addresses.
- The access token is short-lived (default 15 minutes). The API client retries
  one failed request after refreshing through `POST /auth/refresh`.
- Session values are stored in `localStorage`:

| Key | Content |
| --- | --- |
| `admin_token` | Access token |
| `admin_refresh_token` | Refresh token |
| `admin_user` | Normalized administrator profile |
| `admin_theme` | Selected light/dark theme |

- A `401` after refresh fails clears the session and redirects to
  `/login?redirect=...`.
- Logout calls the API and always clears local state. Queued scanner entries
  remain on the device by design.

> **Security note:** tokens in `localStorage` are readable by any script that
> achieves XSS. The production hardening plan is to move to `HttpOnly`,
> `Secure`, `SameSite` cookies or memory-held access tokens with a protected
> refresh cookie. See `docs/SECURITY.md`.

## 4. Roles, permissions, and navigation

The portal recognises four roles:

| Role | Default permissions |
| --- | --- |
| `super_admin` | Full access; bypasses permission checks |
| `event_manager` | Create/edit/delete events, view reports, generate certificates, send notifications, view analytics, export data |
| `staff` | View reports, generate certificates, view analytics |
| `auditor` | View reports, view analytics |

Supported permission values:

`create_event`, `edit_event`, `delete_event`, `manage_users`,
`view_reports`, `generate_certificates`, `send_notifications`,
`manage_admins`, `view_analytics`, `export_data`, `manage_settings`.

Route metadata and the navigation drawer hide items the current administrator
cannot use. A blocked route redirects to `/forbidden`. Super administrators
always pass.

| Route | Page | Permission |
| --- | --- | --- |
| `/login` | Sign in | Public |
| `/` | Dashboard | `view_analytics` (navigation) |
| `/events` | Event list | Authenticated administrator |
| `/events/new` | Create event | Authenticated administrator |
| `/events/:id` | Event details | Authenticated administrator |
| `/events/:id/edit` | Edit event | Authenticated administrator |
| `/attendance` | Attendance register and manual check-in | Authenticated administrator |
| `/scanner` | QR scanner | Authenticated administrator |
| `/users` | Participant list | `manage_users` |
| `/users/:id` | Participant details | `manage_users` |
| `/certificates` | Certificate list and bulk generation | `generate_certificates` |
| `/certificates/templates` | Certificate template management | `generate_certificates` |
| `/feedback` | Feedback list, analytics, responses | `view_reports` |
| `/notifications` | Broadcast, event, reminder, test sends | `send_notifications` |
| `/admins` | Administrator management | `manage_admins` |
| `/settings` | Profile, security, audit, system, exports | `manage_settings` |
| `/forbidden` | Access denied | Authenticated administrator |

> **Important:** the frontend guards are usability controls, not a security
> boundary. In the current backend, most administrative routes check only that
> the caller is an administrator. Server-side permission enforcement is tracked
> as SEC-02 in `docs/SECURITY.md` and must be completed before production.

Only `super_admin` accounts can create administrators or change roles and
permissions. Non-super administrators can review the administrator list but the
create/edit controls are restricted.

## 5. Screens

### Dashboard

Shows participant, event, attendance, certificate, and feedback totals plus
recent activity. Data comes from `GET /admin/dashboard` and
`GET /admin/analytics`.

### Events

- List, search, filter, and paginate events.
- Create and edit with validation for future start time, title length,
  description length, end-after-start, and venue name.
- Upload a banner or gallery images; gallery images can be removed.
- Publish, cancel, view statistics, and inspect attendees.
- Event form cleans up object URLs to avoid browser memory leaks.

### Attendance and scanner

- Attendance register supports manual check-in, bulk check-in, undo, search,
  live counts, and reports.
- Administrators can add a walk-in attendee who did not use the participant app.
  Existing accounts are matched by email; new records use
  `registrationSource: admin`. The attendee can be checked in immediately or
  added to the register for a later manual check-in.
- The scanner uses the rear camera where available and decodes with `jsqr`.
- An optional event context warns when a scanned ticket belongs to a different
  event but does not block a valid check-in.
- The same QR is not resubmitted within four seconds.
- Success and failure produce distinct tones and optional sound feedback.

### Participants

- Paginated participant list with status and search filters.
- Participant detail shows profile, registration, attendance, certificate, and
  feedback context.
- Status changes and deletion are audited by the backend.

### Certificates

- Paginated certificate list with event, status, and search filters.
- Bulk generation per event and template selection.
- Download uses an authenticated Axios blob request, not a public file link.
- Revoke and regenerate actions are available with reasons where required.
- Template management supports creating, editing, previewing, and deleting
  templates. Certificate generation is synchronous in the current API; moving
  it to the existing Bull queue is a planned hardening step.

### Feedback

- Filter by event, rating, flag state, response state, and search text.
- View analytics, respond to individual feedback, flag inappropriate content,
  and delete records.
- Export is requested from the backend as JSON and converted to CSV in the
  browser.

### Notifications

- Send a broadcast, event notification, reminder, or test message.
- Trigger cleanup of old notification records.
- In-app notifications work without email/SMS credentials; external channels
  report provider failures.

### Administrators

- List administrators, roles, permissions, departments, status, and last login.
- Super administrators can create, edit, deactivate, and delete accounts.
- A super administrator cannot be impersonated through the UI; self and peer
  status changes still require backend authorization hardening.

### Settings

Tabs:

1. **Profile** — full name, phone, department, profile image URL.
2. **Security** - password change, mandatory 2FA enrollment for super
   administrators, recovery-code regeneration, account status, last login,
   failed attempts, password-changed timestamp.
3. **Audit Log** — filter by action/resource and paginate administrator actions.
4. **System** — live health response, API base URL, environment, and operational
   notes.
5. **Data Export** — users, events, certificates, and feedback as JSON or CSV.

Password changes send `currentPassword`, `newPassword`, and
`newPasswordConfirm` to `POST /auth/change-password`. Administrator profile
updates use `PUT /admin/:id` and support `fullname`, `phone`, `department`, and
`profileImage`.

## 6. API contract

The client unwraps the standard envelope:

```json
{ "success": true, "message": "…", "data": { } }
```

Methods return plain data to views. Error messages prefer `message`, then
`error.message`, then validation errors, then a network/timeout fallback.

### Endpoints used

| Area | Endpoint |
| --- | --- |
| Admin login | `POST /auth/admin/login` |
| Current admin | `GET /auth/me` |
| Refresh | `POST /auth/refresh` |
| Logout | `POST /auth/logout` |
| Change password | `POST /auth/change-password` |
| Dashboard / analytics | `GET /admin/dashboard`, `GET /admin/analytics` |
| Audit / health | `GET /admin/audit`, `GET /admin/health` |
| Users | `GET /admin/users`, `GET /admin/users/:id`, `PUT /admin/users/:id/status`, `DELETE /admin/users/:id` |
| Administrators | `GET/POST /admin`, `GET/PUT/DELETE /admin/:id` |
| Export | `GET /admin/export/:type` |
| Events | `GET/POST /events`, `GET/PUT/DELETE /events/:id`, publish/cancel/statistics/attendees/QR, banner/gallery uploads |
| Attendance | `POST /attendance/scan`, add attendee, manual/bulk/undo check-in, report/search/live |
| Certificates | `GET /certificates`, statistics, templates, generate, bulk-generate, download, revoke, regenerate |
| Feedback | `GET /feedback`, analytics, respond, flag, delete, export |
| Notifications | statistics, broadcast, event, reminder, test, cleanup |

### Response shapes relied on by this client

| Call | Expected shape |
| --- | --- |
| `GET /certificates` | `{ certificates, pagination }`; filters: `eventId`, `status`, `search`, `page`, `limit` |
| `GET /certificates/templates` | `{ templates }` |
| `GET /feedback/analytics/:eventId` | `{ analytics }` or the analytics object directly |
| `GET /admin/health` | `{ status, timestamp, database, services }` |
| `GET /admin/audit` | `{ logs, total, page, totalPages }` |
| `GET /admin/export/:type` | `{ type, count, data }` — always JSON, regardless of requested format |
| `POST /attendance/scan` | `{ user, event, checkInTime, alreadyCheckedIn, message }` |

Admin exports are normalised in the browser: JSON is downloaded directly, CSV
is generated from the returned rows. Large exports should eventually be
streamed by the backend.

## 7. Scanner offline queue

The scanner keeps working when the network drops:

- Queue key: `admin_scan_queue` in `localStorage`.
- Recent-scan history key: `admin_recent_scans` (last 20 entries).
- A network failure queues the QR payload with a timestamp.
- Queued scans are retried automatically when the browser comes online, and can
  be submitted manually.
- Malformed or invalid tickets that receive an HTTP response are rejected and
  removed from the queue, not retried forever.
- Already-checked-in scans are reported as warnings.
- Queued entries are device-local; clearing browser storage or using another
  device loses them.

Camera access requires HTTPS or `localhost`. The manual paste box is the
fallback when camera permission is denied or unavailable.

## 8. Design system

- Inter typography.
- Primary `#0F2A44`, accent `#C9A44C` (primary CTAs only).
- 1px card borders and restrained elevations.
- Light and dark themes; theme selection persists.
- Responsive navigation drawer with rail mode on desktop and temporary drawer
  on mobile.
- Shared components: page header, empty state, stat cards, tables, status
  chips, snackbar.

## 9. Build and verification

```bash
cd meetCITAD/frontend-admin
npm run build
```

The current production build succeeds with `686 modules transformed`.

Manual verification checklist:

- [ ] Administrator login, logout, refresh, and redirect preservation.
- [ ] Navigation hides inaccessible items and `/forbidden` handles direct URLs.
- [ ] Dashboard and analytics load with real data.
- [ ] Event create/edit validation and banner/gallery upload.
- [ ] Manual check-in, scanner check-in, duplicate detection, invalid ticket
      rejection, and offline queue retry.
- [ ] Participant status change and deletion.
- [ ] Certificate list filters, bulk generation, download, revoke, regenerate.
- [ ] Template create/edit/delete.
- [ ] Feedback filters, response, flag, delete, analytics, export.
- [ ] Broadcast and event notifications.
- [ ] Administrator create/edit/deactivate.
- [ ] Profile update, password change, audit filters, health, JSON/CSV export.

## 10. Known limitations and next steps

- Access and refresh tokens live in `localStorage`.
- Certificate generation runs inline instead of through the queue.
- Health and metrics are not yet production-grade monitoring.
- No automated test suite exists for the portal.
- Queued scans are kept on the device after sign-out; a shared-device policy
  for discarding them is still needed.

Server-side permission checks now cover administrator, certificate, feedback,
notification, queue, attendance, and event-mutation routes. Password changes
revoke existing access and refresh tokens. Certificate PDFs are delivered only
through the authenticated download endpoint.

These items are tracked in `docs/SECURITY.md` and
`docs/NON_FUNCTIONAL_REQUIREMENTS.md`.

---

**Last Updated:** 20 October 2026
