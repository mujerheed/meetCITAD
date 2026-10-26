# meetCITAD Weekly: Weekly Program Schedule

> **Status:** Implemented (MVP) in the backend, admin portal, and participant portal.
> **Branch:** `feature/meetcitad-weekly`
> **Last updated:** 2026-10-23

The Weekly Program Schedule gives CITAD administrators one place to plan, publish, and share the organisation's weekly activities. It coexists with the existing event system and does not replace registration, QR attendance, certificates, feedback, authentication, or notification services.

Security and non-functional targets in `docs/SECURITY.md` remain baseline proposals. Any target that introduces an operational or procurement commitment still requires CITAD approval.

---

## 1. Scope

### Implemented in the MVP

- Admin weekly programs with draft, published, and archived states.
- Standalone weekly activities and optional links to existing events.
- Activity visibility: `public`, `authenticated`, and `staff`.
- Admin preview, publish, unpublish, and archive.
- Weekly summary in WhatsApp and email variants.
- Summary copy, TXT download, print / Save as PDF, and server-rendered HTML download.
- Whole-week and single-activity ICS calendar downloads.
- Explicit, confirmed weekly notification dispatch. Publishing never notifies users automatically.
- Participant weekly schedule, activity detail page, personal tasks, and calendar downloads.
- Cached public schedule for offline/PWA use.
- Banner upload with Sharp processing and JPEG/PNG/WebP validation.
- Server-side permissions, validation, and rate limits.

### Deferred

- Server-side PDF or image generation.
- Advanced recurrence rules.
- Standalone activities becoming events through an automated promotion flow.
- Admin calendar-grid and print-view variants.
- Offline task editing.
- Public weekly RSS or webhook feeds.
- Automated email/SMS delivery in local development (providers are not configured).

---

## 2. Architecture

### Collections

- `WeeklyProgram`: one published or draft schedule per week.
- `WeeklyActivity`: an activity in a week. It is either standalone or linked to an `Event`.
- `PersonalWeeklyTask`: a private checklist item owned by one participant.

### Relationship to events

- `WeeklyActivity.eventId` is optional.
- Linking an event does not copy registration, attendance, QR, certificate, or feedback data. The event remains canonical for those capabilities.
- Standalone activities are schedule-only. They do not create registration, attendance, certificates, or feedback.
- Weekly responses expose a small event summary for linked events (`id`, title, schedule, venue, registration state, capacity) but never expose private event data.

### Participant visibility

| Visibility | Public/anonymous | Signed-in participant | Admin |
|---|---:|---:|---:|
| `public` | yes | yes | yes |
| `authenticated` | no | yes | yes |
| `staff` | no | no | admin preview only |
| draft activity | no | no | admin preview only |

Excluded activities are reported as aggregate counts and reasons, without titles. This prevents public responses from leaking the existence of staff-only or signed-in-only activities by name.

---

## 3. Week handling

- Week starts Monday 00:00 in `Africa/Lagos`.
- `weekStart` is stored as the UTC instant for Monday 00:00 WAT.
- `weekEnd` is the following Monday 00:00 WAT.
- Activities are included when they overlap the week:
  `startDateTime < weekEnd AND endDateTime >= weekStart`.
- Multi-day and cross-midnight activities are included once.
- Times are stored as UTC instants and formatted in `Africa/Lagos` for the UI, summaries, and calendar files.
- A request may pass any date in a week as `weekStart=YYYY-MM-DD`; the server normalises it to that week's Monday.

---

## 4. Data model

### `WeeklyProgram`

```text
weekStart                 Date, required, unique
weekEnd                   Date, required
title                     String
status                    draft | published | archived
publicContactEmail        String, default info@citad.org
version                   Number, default 1
publishedVersion          Number
publishedAt               Date
publishedBy               ObjectId -> Admin
unpublishedAt             Date
unpublishedBy             ObjectId -> Admin
archivedAt                Date
archivedBy                ObjectId -> Admin
notification              { version, batchId, sentAt, sentBy,
                            recipientCount, channels }
createdBy                 ObjectId -> Admin
updatedBy                 ObjectId -> Admin
timestamps                true
```

Indexes: unique `{ weekStart: 1 }`, `{ status: 1, weekStart: -1 }`.

### `WeeklyActivity`

```text
weeklyProgramId           ObjectId -> WeeklyProgram, required
source                    standalone | event
eventId                   ObjectId -> Event, optional
title                     String
slug                      String, sparse unique
description               String, plain text
activityType              event | meeting | training | field_activity |
                          campaign | survey | research | assignment | other
project                   String
department                String
referenceCode             String
startDateTime             Date
endDateTime               Date
timezone                  String, default Africa/Lagos
allDay                    Boolean
venue                     { name, address, city, state, region, country }
mode                      physical | virtual | hybrid
meetingUrl                String, restricted
contact                   { name, officialEmail, phone, department,
                            publicEmail, publicPhone, showPublicContact }
internalNotes             String, staff-only
visibility                public | authenticated | staff
status                    draft | published | archived
bannerImage               String
thumbnail                 String
publishedAt               Date
publishedBy               ObjectId -> Admin
createdBy                 ObjectId -> Admin
updatedBy                 ObjectId -> Admin
timestamps                true
```

Indexes include activity schedule lookup, program lookup, unique sparse slug, and a unique partial `{ weeklyProgramId, eventId }` index for linked events.

Validation rules include:

- End must be later than start for standalone activities.
- Standalone activities require title, start, end, and venue.
- Linked activities require `eventId`.
- `meetingUrl` must be HTTP/HTTPS.
- Archived programs and archived activities cannot be edited.
- Banner uploads are JPEG/PNG/WebP only, limited to 5 MB, and processed through Sharp.

### `PersonalWeeklyTask`

```text
userId                    ObjectId -> User, required
weeklyActivityId          ObjectId -> WeeklyActivity, optional
title                     String, max 200
note                      String, max 500
weekStart                 Date
dueDate                   Date
completed                 Boolean, default false
completedAt               Date
source                    activity | custom
timestamps                true
```

Personal tasks are always scoped to `req.user._id`. Admins cannot read another user's tasks. Completing a task never changes event registration, attendance, or certificates.

---

## 5. API

All JSON responses use the existing `{ success, message?, data }` envelope.

### Admin

Every route in this group requires an authenticated admin. Read access is available to all administrator roles; mutations require the stated permission.

```text
GET    /api/v1/admin/weekly-programs?weekStart=YYYY-MM-DD
POST   /api/v1/admin/weekly-programs
GET    /api/v1/admin/weekly-programs/:id
PATCH  /api/v1/admin/weekly-programs/:id
DELETE /api/v1/admin/weekly-programs/:id              (archive)

GET    /api/v1/admin/weekly-programs/:id/preview
GET    /api/v1/admin/weekly-programs/:id/summary?format=whatsapp|email
GET    /api/v1/admin/weekly-programs/:id/export?format=txt|html
GET    /api/v1/admin/weekly-programs/:id/calendar.ics
POST   /api/v1/admin/weekly-programs/:id/publish
POST   /api/v1/admin/weekly-programs/:id/unpublish
POST   /api/v1/admin/weekly-programs/:id/notify

GET    /api/v1/admin/weekly-programs/:id/activities
POST   /api/v1/admin/weekly-programs/:id/activities
POST   /api/v1/admin/weekly-programs/:id/activities/from-event
GET    /api/v1/admin/weekly-programs/:id/activities/:activityId
PATCH  /api/v1/admin/weekly-programs/:id/activities/:activityId
DELETE /api/v1/admin/weekly-programs/:id/activities/:activityId   (archive)
POST   /api/v1/admin/weekly-programs/:id/activities/:activityId/banner
```

Notifications require both `publish_weekly_programs` and `send_notifications`. The request must include an explicit recipient scope, one or more channels, and `confirm: true`. Publishing the same unchanged version twice does not send a second notification.

### Public and authenticated participants

```text
GET    /api/v1/weekly?weekStart=YYYY-MM-DD
GET    /api/v1/weekly/current
GET    /api/v1/weekly/activities/:activityId
GET    /api/v1/weekly/activities/:activityId/calendar.ics
GET    /api/v1/weekly/calendar.ics?weekStart=YYYY-MM-DD

GET    /api/v1/weekly/tasks?weekStart=YYYY-MM-DD     (authenticated)
POST   /api/v1/weekly/tasks                          (authenticated)
PATCH  /api/v1/weekly/tasks/:taskId                  (authenticated)
DELETE /api/v1/weekly/tasks/:taskId                  (authenticated)
```

Public week and activity endpoints use `optionalAuth` so the same route serves anonymous visitors and signed-in participants. Staff-only activity detail returns `404` to anonymous callers rather than revealing that it exists.

---

## 6. Permissions

Two explicit permissions were added:

- `manage_weekly_programs`: create/edit weekly programs and activities.
- `publish_weekly_programs`: publish/unpublish, archive programs, and trigger weekly notifications.

| Role | Read | Manage | Publish | Notify |
|---|---:|---:|---:|---:|
| `super_admin` | yes | yes | yes | yes |
| `event_manager` | yes | yes | yes | yes |
| `staff` | yes | yes | no | no |
| `auditor` | yes | no | no | no |

Notification additionally requires the existing `send_notifications` permission. Super administrators bypass permission checks.

Existing administrators can be backfilled with:

```bash
cd backend
node src/utils/backfillWeeklyPermissions.js
```

The script is idempotent and only adds the two weekly permissions to the intended roles.

---

## 7. Summary and exports

The summary heading follows the required format:

```text
EVENTS AND PROGRAMS FOR THE WEEK 19-10-2026 TO 25-10-2026.
```

Summary rules:

- Include only published activities with `public` visibility.
- Exclude signed-in-only, staff-only, draft, and archived activities.
- Report exclusions only as aggregate counts, without titles.
- Order chronologically and include multi-day activities once.
- Use `Africa/Lagos` formatting.
- Include only fields that exist.
- Use the activity's public contact email, falling back to the week's public contact email.
- Never include internal notes, official/private contact details, or private meeting links.
- Support `whatsapp` and `email` variants.

The admin summary dialog loads the generated text into an editable textarea. Editing does not change the database. Copy, TXT download, and print use the edited text; the HTML export regenerates canonical text on the server.

Browser print is the supported Save as PDF path. Server-side PDF and image generation are deferred.

ICS exports include public schedule fields only. Personal tasks are never included.

---

## 8. Admin experience

Admin navigation includes **Weekly Programs** at `/weekly`.

The implemented screen provides:

- Current-week default and previous/next/this-week controls.
- Date picker for any date in a week.
- Counts for activities, published, drafts, and multi-day items.
- Day-grouped schedule list with status and visibility chips.
- Create week, link event, add activity, edit, archive, publish, and unpublish actions.
- Preview of the participant-visible schedule.
- Summary dialog with copy, TXT, HTML, and print actions.
- Notification dialog with explicit recipient scope, channel selection, and confirmation.
- Whole-week ICS download.
- Empty, loading, error, archived, and permission-limited states.
- Banner upload feedback that distinguishes a saved activity from a failed banner upload.

Admin weekly actions are written to the existing admin action log where the controller supports it.

---

## 9. Participant experience

Participant navigation includes **Weekly** at `/weekly`.

The implemented schedule provides:

- Current week by default, previous/next controls, date picker, and This week shortcut.
- Day-grouped activities with time, type, venue, project, and optional banner thumbnail.
- Multi-day indicator.
- Signed-in-only activities for authenticated participants.
- Staff-only activities never appear in participant responses.
- Activity detail at `/weekly/activities/:id` with description, time, venue, contact, and linked-event information.
- Add whole week or single activity to calendar.
- Google Calendar and Outlook links on activity detail.
- Private personal task checklist for authenticated users.
- Add an activity to tasks, create a custom task, mark complete, and delete.
- Anonymous users see a sign-in prompt that preserves the current route and returns after authentication.

The week page caches participant-visible schedule data in the existing offline cache. Personal tasks are never cached. The cache is cleared on sign-out. When offline, the page displays a warning and uses the last saved schedule.

---

## 10. Security and privacy

- All admin routes require an admin token and role check.
- Write, publish, archive, and notify actions require explicit permissions.
- Publishing permission is enforced on the dedicated publish action and on any
  activity create or status change that would publish or unpublish content.
  Staff cannot bypass it by setting `status` in an activity payload.
- Draft and staff-only records are excluded in server queries, not only in the UI.
- Internal notes, official/private contact fields, and meeting URLs are removed from public responses.
- A linked activity whose event was deleted, cancelled, or unpublished is
  hidden, including from its public detail and calendar routes.
- Public summaries, HTML/TXT exports, and ICS files use the same week-overlap
  boundary and visibility filtering as the public schedule.
- Archived weeks reject metadata, publish, unpublish, activity, and banner
  changes. Archived activities reject edits, banner changes, and re-archiving.
- Personal tasks are owner-scoped for read, update, and delete.
- A task keeps the user's own note and title, but its linked activity summary is
  withheld once that activity becomes restricted, unpublished, or archived.
- Notification dispatch is explicit and atomically claimed once per published
  version, so simultaneous confirmations cannot send duplicate batches.
- Banner uploads are type-checked, size-limited, and re-encoded with Sharp.
- Weekly responses send `Cache-Control: no-store` and
  `Vary: Authorization, Cookie`; only the participant app's explicit
  localStorage fallback keeps a schedule copy.
- Rate limits cover weekly task writes, exports, uploads, and admin operations.
- Existing JWT token-version protections remain unchanged.

---

## 11. Tests and verification

Weekly backend tests are under `backend/tests/weekly/`. They use the Node test runner, Supertest, and a local test database, and they drop that database after the run.

Run them from `backend`:

```powershell
$env:NODE_ENV='test'
node --test --test-concurrency=1 tests/weekly/*.test.js
```

The default test database is `mongodb://localhost:27017/meetcitad_weekly_test`. Override it with `MONGODB_TEST_URI` if needed.

Coverage includes:

- Monday week boundaries, `Africa/Lagos`, overlap, and multi-day handling.
- Model validation and archived-record protection.
- Admin lifecycle: create, populate, publish, unpublish, archive.
- Visibility and title-leak prevention.
- Summary and TXT content filtering.
- Whole-week and single-activity ICS.
- Personal task privacy and completion.
- Staff manage-but-not-publish and auditor read-only rules.
- Explicit confirmed notifications, concurrent duplicate-notification
  prevention, and release of a failed notification claim.
- Anonymous staff-only detail rejection and deleted-event detail rejection.
- Staff publication-permission bypass attempts through activity create, update,
  and from-event routes.
- Archived week and archived activity immutability, including banner uploads.
- Summary/export week-overlap consistency and the exact printable HTML heading.
- Task activity summaries being withheld when the activity becomes restricted
  or its week is archived.
- `no-store` and `Vary` headers on weekly and task responses.

Manual/browser verification covered:

- Admin weekly dashboard, summary dialog, and linked-event display.
- Participant schedule for anonymous and signed-in users.
- Participant activity detail, task creation, and calendar controls.
- Mobile layout and dark mode.
- No browser console errors in the tested flows.

These test files are development artifacts and are not intended to be committed.

---

## 12. Setup and compatibility

### Compatibility

- Existing `Event`, `User`, certificate, attendance, and feedback flows are unchanged.
- Weekly activities only reference events; event data remains canonical.
- New collections do not change existing queries.
- No new runtime dependency was added.
- Existing JWTs without a `ver` claim are rejected after the v2 hardening; users and admins must sign in again after deployment.

### Migration

1. Create the three new collections and indexes.
2. Run `node src/utils/backfillWeeklyPermissions.js` once against the target database.
3. Create indexes explicitly in production or run the project's index sync process; do not rely on development `autoIndex`.
4. No data migration is required for events or users.

### Environment

No new required environment variable is needed. The week public contact defaults to `info@citad.org`. Optional override:

```text
WEEKLY_PUBLIC_CONTACT_EMAIL=info@citad.org
```

### Local URLs

- Participant: `http://127.0.0.1:5173`
- Admin: `http://localhost:5174`
- Backend: `http://127.0.0.1:4000`

---

## 13. Known MVP limits

- No server-side PDF or image summary export; browser print handles Save as PDF.
- No recurrence engine. Each activity is scheduled individually.
- No admin calendar-grid view or advanced filters yet.
- No offline task editing. Personal tasks require a connection.
- No automated promotion of standalone activities into events.
- Email/SMS providers may be disabled locally; in-app notifications still use the existing notification system.
- Weekly summary and ICS share only public activities by design.
- Existing test files must remain untracked until the project adopts a committed test suite.

---

## 14. Resolved decisions

1. Staff can create and edit weekly activities but cannot publish.
2. Standalone activities remain schedule-only; no registration or attendance is created for them.
3. Browser print plus TXT/HTML is sufficient for the first release; PDF/image export is deferred.
4. The weekly public contact defaults to `info@citad.org` and can be overridden per week or by environment.
5. Weekly notifications are explicit. Publishing alone never notifies users.
6. Public summaries omit signed-in-only and staff-only activities, reporting only aggregate counts.
7. Public schedule data may be cached; personal tasks and staff-only data must not enter shared or public caches.

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-10-23 | Phase 1 inspection, architecture, and proposed design recorded. |
| 2026-10-23 | Backend models, validation, permissions, APIs, summaries, ICS, notifications, and tests implemented. |
| 2026-10-23 | Admin weekly dashboard, activity form, preview, summary, and notification flows implemented. |
| 2026-10-23 | Participant weekly schedule, activity detail, personal tasks, calendar actions, offline cache, and dark-mode fixes implemented. |
| 2026-10-23 | Documentation updated from proposal to implemented MVP. |
| 2026-10-26 | Hardened publication permissions, archived-record immutability, summary overlap, task activity visibility, cache headers, and atomic notification dispatch; added regression coverage. |
