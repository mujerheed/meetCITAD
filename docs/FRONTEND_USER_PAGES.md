# User Frontend — Authenticated Pages (Implementation Notes)

**Scope:** `meetCITAD/frontend-user` only. No files in the v1.0 folders
(`meetCITAD_Frontend_User`, `meetCITAD_Frontend_Admin`, `meetCITAD_Backend`) were
modified.

**Status:** Implemented and production build verified (`npm run build`).

---

## 1. Pages Built

| Route | View | Description |
|-------|------|-------------|
| `/events` | `views/events/EventsList.vue` | Public event catalogue with search, filters, and pagination |
| `/events/:id` | `views/events/EventDetails.vue` | Event details, registration, calendar menu, feedback entry point |
| `/events/:id/feedback` | `views/events/EventFeedback.vue` | Attendance-gated feedback form with ratings, NPS, recommendation, and comments |
| `/my-events` | `views/user/MyEvents.vue` | Registered / Attended tabs, status chips, cancel registration, QR entry point, offline cache |
| `/my-events/:id/qr` | `views/user/EventQR.vue` | Signed personal ticket QR, save PNG, print, 24-hour offline cache |
| `/profile` | `views/user/Profile.vue` | Profile details, picture upload, password change, notification preferences |
| `/certificates` | `views/user/Certificates.vue` | Certificate gallery, in-app preview, PDF download |
| `/notifications` | `views/user/Notifications.vue` | All/unread filters, mark read, mark all, delete, load more |
| `/verify-email` | `views/auth/VerifyEmail.vue` | OTP verification after signup, resend with cooldown |
| `/verify/:hash?` | `views/certificates/CertificateVerify.vue` | Public certificate verification by code or full verification link |
| `/dashboard` | `views/Dashboard.vue` | Existing page; now uses real statistics instead of placeholder counters |

All pages follow the documented design system: Inter typography, `#0F2A44`
primary, `#C9A44C` accent for primary CTAs only, 1px card borders, 0.2s
transitions, and full light/dark support.

---

## 2. Participant Feature Details

### 2.1 Event feedback (`/events/:id/feedback`)

- The route requires authentication. The page loads the event and the
  participant's registration status through `GET /events/:id` and
  `GET /users/events/:id/status`.
- Feedback is gated on attendance. The form is only rendered when
  `attended` or `registration.attended` is true; otherwise the page explains
  that feedback opens after check-in.
- Required fields are an overall rating and the recommendation answer.
  Optional fields cover content, speakers, venue, organisation, logistics, an
  NPS score (0–10), and three comment areas of up to 1,000 characters each.
- Submission posts to `POST /feedback` with `eventId`, `ratings`,
  `npsScore`, `booleanQuestions.wouldRecommend`, and `comments`.
- Successful submission shows a confirmation card with links to My Events and
  Browse Events. Errors preserve the entered values so the participant can
  retry.
- The backend enforces attendance and one feedback record per participant per
  event; the page treats a rejected duplicate as a normal error.

### 2.2 Calendar integration

`src/utils/calendar.js` provides all calendar actions without a backend
dependency:

| Action | Behaviour |
|--------|-----------|
| Download `.ics` | Builds a standards-compliant iCalendar file with UTC start/end, escaped text, folded lines, event URL, location fallback, and a 24-hour reminder alarm |
| Google Calendar | Opens a prefilled Google Calendar template URL |
| Outlook Calendar | Opens a prefilled Outlook web compose URL |
| Default duration | Uses the event end time when valid; otherwise adds two hours to the start |

The menu is available on the event detail page. The generated event URL uses
the browser origin plus `/events/:id`, so links work in both development and
production. If the event has no valid start date, the `.ics` action is disabled
and the UI reports that a calendar file could not be created.

### 2.3 Certificate verification (`/verify/:hash?`)

- Public route; no authentication required. It can be opened from a certificate
  QR code, a full verification link, or the footer link.
- Calls `GET /certificates/verify/:hash` and displays the certificate number,
  recipient, event title, event date, issue date, and status when valid.
- Invalid, revoked, or unknown codes show a "Certificate Not Verified" state
  with a contact address, without exposing internal error details.
- The lookup field accepts either a raw 64-character verification code or a
  full URL containing `/verify/<code>`; the page extracts and encodes the code
  before navigating.
- Verification is read-only and does not require or expose a certificate PDF.

### 2.4 PWA, offline behavior, and caching

The participant app is installable and degrades gracefully when the network
drops.

| Layer | Behaviour |
|-------|-----------|
| Manifest | `public/manifest.json` defines the app name, theme, display mode, and icons |
| Service worker | `public/sw.js`, registered only in production builds from `main.js` |
| Navigations | Network first; falls back to the cached `index.html` app shell |
| Static assets | Cache first with background refresh for scripts, styles, images, and fonts |
| API requests | Never cached; live data is always requested from the network |
| Offline banner | `App.vue` listens for `online`/`offline` events and shows a global warning |
| My Events | Successful results are cached under `meetCITAD:myEvents`; when the request fails, the last saved list is shown with an offline notice |
| Personal ticket | Successful ticket data is cached per event for 24 hours; if the network fails, the saved QR and event summary are shown with an offline warning |
| Cache safety | Cache writes are failure-tolerant, corrupt entries are ignored, and cached values are namespaced and timestamped |

Offline behavior is intentionally read-only. Registration, cancellation,
feedback submission, and live updates require connectivity. Participants are
told to save or print the QR before the event if they expect poor coverage.

### 2.5 Theme and accessibility

- Light/dark theme is persisted in `localStorage` under `theme`.
- Interactive icon buttons carry accessible labels where the icon alone is not
  self-describing.
- Dynamic feedback, ticket, and verification states use text and icons in
  addition to colour.
- The PWA requires HTTPS (or `localhost`) for service-worker and camera
  features in modern browsers.

---

## 3. Shared Foundations

### `src/api/index.js`
- Base URL `/api/v1` (matches the v2 route mount), proxy target now `:4000`.
- Unwraps the `{ success, data }` envelope so stores receive plain objects.
- Central `getErrorMessage()` for consistent, human-readable errors.
- 401 handling clears the local session and redirects with a `redirect` query.
- Modules: `auth`, `user`, `events`, `certificates`, `feedback`, `notifications`.

### `src/utils/normalizers.js`
One canonical shape for events/users/certificates/notifications, so views do not
depend on whether the API returns `startDateTime` vs `startDate`, `venue.name` vs
`location`, `profileImage` vs `profilePicture`, or `registeredUsers` vs `attendees`.

### `src/utils/formatters.js`
Date/time/relative-time/truncation/file-size helpers. Handles both ISO timestamps
and separate `"09:30"` time fields.

### Stores
- `stores/auth.js` — session persistence (`token` + `user`), OTP flow, profile,
  password, picture upload, preferences.
- `stores/event.js` — list/detail/my-events, register/unregister, QR.
- `stores/notification.js` — list, pagination, unread badge, optimistic mark-read.
- `stores/certificate.js` — gallery, preview, blob download.

---

## 4. Cross-Cutting Fixes

- **Signup → OTP:** the backend requires email verification before login, so
  signup now routes to `/verify-email` and sends `fullname` + `passwordConfirm`.
- **Signup password rules** aligned with backend strength rules (min 8 chars,
  upper, lower, number, special character).
- **Login** surfaces a "Verify your email" shortcut when the account is
  unverified.
- **Reset password** supports both `/reset-password/:token` and
  `?token=...` links.
- **Event registration state** on `/events/:id` now comes from
  `GET /users/events/:id/status`, falling back to attendee matching.
- **Removed `v-html`** from event descriptions (plain text with `white-space:
  pre-line`) to avoid XSS from admin-entered content.
- **Bell + unread badge** added to the header for notifications.
- **Vite proxy** reads `VITE_API_PROXY_TARGET` (default `http://localhost:4000`).
- **`.env.example`** added for the frontend.

---

## 5. Backend Contract Fixes Applied

The v2 backend was aligned to the documented schema. No v1.0 file was changed.

1. **JWT configuration** — auth middleware now uses the configured
   secret/expiry names (`secret`, `refreshSecret`, `accessExpiresIn`,
   `refreshExpiresIn`); access tokens generated by the auth controller now
   verify correctly on protected routes.
2. **Auth flow** — signup/login/OTP/reset now use the User model fields
   (`fullname`, `emailVerified`, `verificationToken`, `verificationExpires`,
   `resetToken`, `resetTokenExpiration`, `lastLogin`). OTP codes are hashed.
   Email delivery failures no longer block signup in development; the code is
   logged when no mail provider is configured.
3. **Registration** — `Event.registeredUsers` is the canonical store, mirrored
   into `User.registeredEvents`. Ticket QR signatures are stored, not image
   blobs. Stats are recalculated on register/unregister/check-in.
4. **Attendance** — QR/manual/bulk/undo check-in now use
   `Event.attendedUsers` and update the user mirror, attendance counts and
   reports.
5. **Personal ticket QR** — added `GET /events/:id/ticket` so users display a
   signed personal ticket instead of the organizer's event QR.
6. **Events** — replaced the missing `mongoose-paginate-v2` calls with native
   pagination, canonical `startDateTime`/`endDateTime`/`venue` fields, sorted
   and filtered listings, fixed banner/gallery uploads, statistics and
   attendee listings.
7. **Certificates** — generation now works end-to-end: identifiers are created
   before QR rendering, a default template is created when none exists, the
   PDF stream is fixed, files are stored in the configured directory, and the
   controller uses `userId`/`eventId`/`fileUrl` correctly.
8. **Notifications** — controller and service use `Notification.userId` and the
   flat `User.preferences` flags. Broadcast/event/reminder payloads now match
   `sendBulkNotifications(users, data)`.
9. **Feedback** — canonical `eventId`, `ratings.overall`,
   `booleanQuestions.wouldRecommend` and `comments` shape; attendance is
   checked against `Event.attendedUsers`; event average rating is recalculated.
10. **Admin** — canonical `fullname`, event/user queries, dashboard counts,
    analytics aggregation and export populate paths.
11. **Route ordering** — static paths (`/preferences`, `/statistics`,
    `/verify/:hash`, `/dashboard`, `/users`, `/export/:type`, …) are declared
    before `/:id` so they are no longer captured by ObjectId routes.
12. **Queues/workers** — processors resolve users/events by id, scheduled jobs
    use `startDateTime`/`eventId`, and queue modules load lazily so importing
    the API does not require Redis.
13. **Logging** — safe circular-reference serialization prevents a logging
    failure from turning a handled error into a 500.
14. **Virtuals** — partial `select()` results no longer crash `toJSON`
    (`Admin.recentActions`, `User.attendanceRate`, event/feedback/notification
    virtuals are defensive).

### End-to-end verification

A real API test was run against MongoDB covering 30 checks (signup → OTP →
login → profile → admin login → event create/list/details → register → my
events → status → personal ticket QR → check-in → statistics → certificate
generate/list/download → notifications → feedback → analytics → dashboard →
attendees → duplicate guard). **30/30 passed.**

---

## 6. Verification

```bash
cd meetCITAD/frontend-user
npm run build     # ✅ 670 modules transformed, build successful
npm run dev       # http://localhost:5173 (proxies /api → :4000)

cd meetCITAD/backend
npm run dev       # http://localhost:4000/api/v1 (MongoDB required; Redis optional in development)
```

### Feature checks

- [ ] Feedback route blocks participants who have not checked in.
- [ ] Feedback form submits ratings, NPS, recommendation, and comments.
- [ ] `.ics` download opens in a calendar app with the correct UTC times.
- [ ] Google and Outlook calendar links open with prefilled details.
- [ ] `/verify/<code>` verifies a valid certificate and rejects a revoked code.
- [ ] Verification field accepts a raw code and a full verification URL.
- [ ] Production build registers `/sw.js`; development does not.
- [ ] Online → offline → online transitions show and hide the global banner.
- [ ] My Events falls back to the cached list when the API is unreachable.
- [ ] A saved ticket QR is restored for up to 24 hours while offline.

The participant cache stores event and ticket data in `localStorage`. Signing out
now clears every `meetcitad:` cache entry, so a shared device does not keep the
previous participant's offline events or ticket QR. The service-worker app-shell
cache remains for performance. See `docs/SECURITY.md` for the related risk.

`npm install --ignore-scripts` may be needed on Windows for the backend if the
checked-in `node_modules` contains Linux pnpm symlinks; `canvas` is not used by
the API and does not need a native build.

---

**Last Updated:** 20 October 2026
