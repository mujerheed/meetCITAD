# meetCITAD v2 — Non-Functional Requirements

| Field | Value |
| --- | --- |
| Document | Non-functional requirements and quality attributes |
| Version | 1.0 |
| Status | Proposed baseline — targets require CITAD approval |
| System | meetCITAD v2.0 |
| Owner | meetCITAD Engineering |
| Last updated | 20 October 2026 |
| Review cycle | Before each production release and at least quarterly |

The performance, capacity, availability, and recovery figures in this document
are **proposed engineering targets**. They must be confirmed against CITAD's
expected event sizes, hosting budget, and service-level expectations before
they become contractual.

Security requirements are defined separately in [SECURITY.md](./SECURITY.md)
and are not repeated here.

---

## 1. Purpose and scope

This document defines how well meetCITAD v2 must perform, scale, remain
available, protect data integrity, support users, and be operated. It covers:

- the Express/MongoDB backend;
- the public participant frontend and PWA;
- the administration portal;
- Redis/Bull background processing;
- local or cloud file storage;
- email and SMS integrations;
- deployment, monitoring, backup, and recovery.

---

## 2. Quality attribute priorities

| Priority | Attribute | Rationale |
| --- | --- | --- |
| 1 | Integrity | Attendance and certificates must be trustworthy |
| 2 | Security | The system handles personal data and privileged administration |
| 3 | Usability on event day | Staff and participants depend on fast check-in |
| 4 | Availability | Registration and attendance are time-sensitive |
| 5 | Performance | Long waits cause queues and duplicate actions |
| 6 | Maintainability | The system must be supportable by a small team |
| 7 | Scalability | Growth should not require a rewrite |

---

## 3. Operating assumptions

These assumptions drive the proposed targets. They are not current measured
limits.

| Assumption | Proposed planning value |
| --- | --- |
| Registered participants | 10,000 |
| Active events per year | 500 |
| Concurrent participants | 500 |
| Concurrent administrators/scanners | 25 |
| Peak check-ins per event | 1,000 |
| Peak scan rate | 60 scans per minute |
| Certificates per year | 20,000 |
| Feedback records per year | 10,000 |
| Historical records retained online | 5 years |
| Typical event | 50–300 participants |
| Largest event | 2,000 participants |
| Primary timezone | Africa/Lagos (WAT, UTC+1) |
| Primary language | English |

If CITAD expects materially larger events, the availability and load targets
must be revised before launch.

---

## 4. Performance requirements

### 4.1 API targets

Measured at the API boundary, excluding third-party email/SMS delivery and
long-running certificate generation, under the normal load defined above.

| ID | Requirement | Target | Verification |
| --- | --- | --- | --- |
| NFR-P01 | Authentication response | p95 ≤ 600 ms, p99 ≤ 1.2 s | Load test |
| NFR-P02 | Read endpoints (event list/detail, profile) | p95 ≤ 400 ms | Load test |
| NFR-P03 | Write endpoints (registration, feedback, check-in) | p95 ≤ 800 ms | Load test |
| NFR-P04 | QR scan validation and check-in | p95 ≤ 700 ms | Integration/load test |
| NFR-P05 | Admin dashboard | p95 ≤ 1.5 s | Seed 10k users, 500 events |
| NFR-P06 | Paginated lists | p95 ≤ 600 ms for 20 records | Load test |
| NFR-P07 | File download initiation | p95 ≤ 1 s for files up to 5 MB | Load test |
| NFR-P08 | Error rate | < 1% for normal operations, excluding 4xx validation errors | Load test |
| NFR-P09 | Certificate generation request acknowledgement | ≤ 1 s when queued | Integration test |
| NFR-P10 | Notification send acknowledgement | ≤ 1 s when queued | Integration test |

Rules:

- No request may hold a database connection while waiting on Mailjet, Twilio,
  or PDF rendering.
- All expensive work must run through Bull queues.
- Any endpoint that can exceed 2 seconds must provide a job status or progress
  response.

### 4.2 Frontend targets

Measured on a mid-range Android device over a throttled 4G connection, with a
warm cache excluded from the first run.

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-P11 | Largest Contentful Paint (LCP) | ≤ 2.5 s |
| NFR-P12 | Interaction to Next Paint (INP) | ≤ 200 ms |
| NFR-P13 | Cumulative Layout Shift (CLS) | ≤ 0.1 |
| NFR-P14 | Initial route JavaScript (gzip) | ≤ 300 kB |
| NFR-P15 | Time to interactive participant home | ≤ 3.5 s |
| NFR-P16 | Scanner camera start | ≤ 2 s after permission grant |
| NFR-P17 | Scanner decode loop | 5–10 frames per second without UI freeze |
| NFR-P18 | Offline ticket and My Events load | ≤ 1 s from local cache |

The current admin build has a 746 kB minified / 243 kB gzip shared entry. This
is within the initial-route target but leaves little headroom. Route-level
code splitting must be preserved and bundle growth monitored.

### 4.3 Database performance

- All common list queries must use indexed fields.
- No unbounded collection scans on request paths.
- Pagination is mandatory for user, event, feedback, certificate, notification,
  and audit lists.
- Maximum page size is 100 records.
- Search operations must have a defined limit and must not allow arbitrary
  regular expressions from untrusted input without escaping.
- Aggregations used for dashboards must be bounded by date range or event.

---

## 5. Scalability and capacity

| ID | Requirement |
| --- | --- |
| NFR-S01 | The API must remain stateless so multiple instances can run behind a load balancer. |
| NFR-S02 | Uploaded files, certificates, and templates must use shared object storage when more than one API instance is deployed. |
| NFR-S03 | Redis must be shared by all API and worker instances in production. |
| NFR-S04 | Background workers must be able to run in a separate process from the API. |
| NFR-S05 | Queue jobs must be idempotent and safe to retry. |
| NFR-S06 | Database indexes must support the documented list and detail queries at the planning volume. |
| NFR-S07 | Exports must stream or page large datasets; they must not load the full collection into API memory. |
| NFR-S08 | The system must support at least two API instances without duplicate attendance or certificate records. |
| NFR-S09 | The design must support 500 concurrent participants and 60 scans/minute without error-rate degradation. |
| NFR-S10 | A single large event must not block registration or check-in for other events. |

Scaling path:

1. Single API process with Redis and MongoDB for initial deployment.
2. Separate worker process for email, SMS, notifications, and certificates.
3. Two or more API instances behind a reverse proxy.
4. MongoDB replica set with backups and monitoring.
5. Shared object storage and CDN for static images and certificate delivery if
   download volume requires it.

---

## 6. Availability and reliability

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-A01 | Monthly API availability during service hours | ≥ 99.5% |
| NFR-A02 | Planned maintenance window | Announced at least 48 hours in advance |
| NFR-A03 | Recovery point objective (RPO) | ≤ 24 hours |
| NFR-A04 | Recovery time objective (RTO) | ≤ 4 hours |
| NFR-A05 | Maximum unplanned single-event outage | ≤ 30 minutes |
| NFR-A06 | Graceful shutdown | In-flight requests finish or time out; queues close cleanly |
| NFR-A07 | Queue retry | Failed email/SMS jobs retry with exponential backoff |
| NFR-A08 | Duplicate check-in | Idempotent; repeated scans return “already checked in” |
| NFR-A09 | Duplicate registration | Prevented by a unique event/user constraint |
| NFR-A10 | Certificate generation duplicate | Idempotent per user and event |

Degradation requirements:

- If Redis is unavailable in development, the API may start with in-memory rate
  limiting and queues disabled.
- In production, Redis unavailability must fail readiness checks and raise an
  alert.
- If Mailjet or Twilio is unavailable, in-app notifications must still be
  delivered and the failure must be visible in the admin interface or queue
  status.
- If certificate generation fails, the request must not leave a partially
  written certificate record marked as active.
- If the database is unavailable, the API must return a consistent error
  response and recover without restarting.

---

## 7. Data integrity

| ID | Requirement |
| --- | --- |
| NFR-D01 | A participant cannot be checked in to an event without a valid registration. |
| NFR-D02 | Attendance records must record check-in time, method, and the administrator who performed the check-in when applicable. |
| NFR-D03 | Certificate issuance must require verified attendance. |
| NFR-D04 | A revoked certificate must fail verification immediately. |
| NFR-D05 | Certificate numbers and verification hashes must be unique. |
| NFR-D06 | Feedback must be limited to one submission per participant per event. |
| NFR-D07 | Event capacity and waitlist rules must be enforced under concurrency. |
| NFR-D08 | Attendance and registration counters must reconcile with their source collections. |
| NFR-D09 | All timestamps must be stored in UTC and displayed in Africa/Lagos time. |
| NFR-D10 | Bulk operations must report per-record success and failure counts. |

Verification:

- Daily reconciliation job for event counters.
- Integration tests for simultaneous registration and check-in.
- Pre-release audit query comparing `Event.registeredUsers` and
  `User.registeredEvents`.
- Pre-release audit query comparing `Event.attendedUsers` and
  `User.registeredEvents[].attended`.

---

## 8. Security and privacy requirements

The full control set is in [SECURITY.md](./SECURITY.md). Non-negotiable NFRs:

| ID | Requirement |
| --- | --- |
| NFR-SEC01 | All production traffic must use HTTPS; camera access requires a secure origin. |
| NFR-SEC02 | Administrative permissions must be enforced by the API, not only the frontend. |
| NFR-SEC03 | Personal data must not be exposed through public static directories. |
| NFR-SEC04 | Authentication, scanning, uploads, and exports must be rate limited. |
| NFR-SEC05 | Secrets must never be committed or stored in frontend bundles. |
| NFR-SEC06 | Production logs must not contain passwords, tokens, OTPs, or full QR payloads. |
| NFR-SEC07 | Backups must be encrypted and restore-tested. |
| NFR-SEC08 | Data retention and deletion must follow the approved schedule. |

---

## 9. Usability and accessibility

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-U01 | Participant flows usable on a 360 px-wide phone | No horizontal scrolling |
| NFR-U02 | Primary actions reachable within one navigation step | Event registration, ticket, check-in status |
| NFR-U03 | Form errors identify the field and the correction | Inline validation |
| NFR-U04 | Keyboard navigation for all admin screens | Fully operable without a mouse |
| NFR-U05 | Focus visibility | Visible focus indicator on all controls |
| NFR-U06 | Color contrast | WCAG 2.1 AA: 4.5:1 normal text, 3:1 large text |
| NFR-U07 | Status communication | Never rely on color alone; include text or icons |
| NFR-U08 | Screen readers | Labels, headings, table headers, dialogs, and live messages announced |
| NFR-U09 | Reduced motion | Respect `prefers-reduced-motion` |
| NFR-U10 | Error recovery | User can retry failed loads without losing entered data |
| NFR-U11 | Offline clarity | Offline state is visible; queued scans and cached data are explained |
| NFR-U12 | Time and date clarity | Explicit timezone and 12/24-hour format consistently displayed |

Accessibility must be checked with:

- automated axe or Lighthouse checks;
- keyboard-only walkthroughs;
- one screen-reader smoke test on the participant registration and admin
  scanner flows;
- manual contrast review of both light and dark themes.

---

## 10. Compatibility

| ID | Requirement |
| --- | --- |
| NFR-C01 | Support the latest two stable versions of Chrome, Edge, Firefox, and Safari. |
| NFR-C02 | Support Android 10+ and iOS 15+ for the participant PWA. |
| NFR-C03 | The scanner must work on Chrome Android and Safari iOS over HTTPS. |
| NFR-C04 | The application must remain usable without camera permission by allowing manual QR paste or manual check-in. |
| NFR-C05 | The PWA must install on supported browsers and provide an offline fallback. |
| NFR-C06 | The admin portal must support 1366×768 and larger desktop screens. |
| NFR-C07 | Email templates must render in common email clients and include a text fallback. |
| NFR-C08 | CSV exports must open correctly in Excel, LibreOffice, and Google Sheets. |

---

## 11. Observability and operability

| ID | Requirement |
| --- | --- |
| NFR-O01 | Every request must have a correlation ID included in logs and error reports. |
| NFR-O02 | Logs must be structured and centralized in production. |
| NFR-O03 | Health endpoints must report MongoDB, Redis, storage, and queue status truthfully. |
| NFR-O04 | Metrics must cover request rate, latency, error rate, queue depth, job failures, login failures, and certificate failures. |
| NFR-O05 | Alerts must fire for elevated 5xx rates, queue backlog, Redis loss, and failed backups. |
| NFR-O06 | Certificate, email, SMS, and notification jobs must have visible retry and failure states. |
| NFR-O07 | Administrators must be able to see system health and queue status without server access. |
| NFR-O08 | Logs must be retained for 90 days and protected from unauthorized modification. |
| NFR-O09 | Deployment must support zero-downtime rolling restarts once multiple instances are used. |
| NFR-O10 | Configuration must be environment-driven with no code changes between environments. |

Current gaps:

- Sentry configuration exists but is not integrated.
- Health data is mostly static.
- No metrics or alerting are configured.
- No correlation ID is attached to requests.
- Queue processors run inside the API process today, so worker failure affects
  the API and scaling is coupled.

---

## 12. Maintainability and testability

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-M01 | Backend automated test coverage | ≥ 70% statements for auth, events, attendance, certificates, and admin |
| NFR-M02 | Frontend automated test coverage | ≥ 40% for stores and critical flows |
| NFR-M03 | Critical-path end-to-end tests | Login, registration, ticket, scan, certificate, feedback, admin permissions |
| NFR-M04 | Linting | Zero errors in CI |
| NFR-M05 | Formatting | Prettier clean in CI |
| NFR-M06 | API contract | OpenAPI/Swagger matches implemented routes and response envelopes |
| NFR-M07 | Setup time for a new developer | Under one hour with documented prerequisites |
| NFR-M08 | Documentation | Setup, API, security, NFR, deployment, and user/admin guides current |
| NFR-M09 | Error messages | Actionable for users; diagnostic detail only in server logs |
| NFR-M10 | Test isolation | Tests use a dedicated test database and never touch development data |

Current baseline: no automated backend test suite and no configured CI. This is
a release blocker for maintainability.

---

## 13. Portability and deployment

| ID | Requirement |
| --- | --- |
| NFR-DEP01 | The backend and both frontends must build and run with documented Node.js and package-manager versions. |
| NFR-DEP02 | Docker Compose must start the API, MongoDB, Redis, and a reverse proxy for local or staging use. |
| NFR-DEP03 | Production configuration must use environment variables and a managed secret store. |
| NFR-DEP04 | The deployment must run a separate worker process when queues are enabled. |
| NFR-DEP05 | Upload and certificate directories must be writable and backed up, or replaced with object storage. |
| NFR-DEP06 | The reverse proxy must set forwarded headers, TLS, request size limits, and timeouts. |
| NFR-DEP07 | The API must not be exposed directly to the internet without TLS and a proxy or gateway. |
| NFR-DEP08 | A documented rollback path must exist for backend and frontend releases. |

---

## 14. Backup, retention, and disaster recovery

| ID | Requirement |
| --- | --- |
| NFR-B01 | MongoDB is backed up daily with 30-day retention. |
| NFR-B02 | Uploads, templates, and certificates are backed up on the same schedule. |
| NFR-B03 | Backups are encrypted and stored separately from the production host. |
| NFR-B04 | A restore test is performed at least quarterly and documented. |
| NFR-B05 | RPO ≤ 24 hours and RTO ≤ 4 hours are verified during restore tests. |
| NFR-B06 | Data retention follows the schedule in [SECURITY.md](./SECURITY.md). |
| NFR-B07 | Deletion/anonymization jobs are idempotent and auditable. |
| NFR-B08 | Queue jobs containing personal data are removed after completion and retained for no more than 30 days on failure. |

---

## 15. Localization, time, and content

| ID | Requirement |
| --- | --- |
| NFR-L01 | UI content is English by default; date and number formatting are centralized. |
| NFR-L02 | All event times are stored in UTC and displayed in Africa/Lagos unless the event specifies a timezone. |
| NFR-L03 | Emails and SMS use approved CITAD wording and include an opt-out for non-essential messages. |
| NFR-L04 | Certificate names and event titles support diacritics and common Nigerian naming characters. |
| NFR-L05 | Text must not be hard-coded into PDF generation where it is intended to be configurable. |
| NFR-L06 | Empty, loading, error, and offline states are defined for every data-driven screen. |

---

## 16. Verification plan

| Area | Method | When |
| --- | --- | --- |
| API latency and error rate | k6 or Artillery load test with seeded data | Phase 3 and before release |
| Frontend performance | Lighthouse and WebPageTest | Before release |
| Accessibility | axe, keyboard walkthrough, screen reader smoke test | Before release |
| Security authorization | Integration tests for every role and object owner | Phase 3 |
| QR end-to-end | Generate ticket, scan, verify attendance and counters | Phase 3 |
| Certificate lifecycle | Generate, download, verify, revoke, regenerate | Phase 3 |
| Queue reliability | Stop Redis/provider, confirm retry and recovery | Phase 3 |
| Backup and restore | Restore into staging and reconcile counts | Phase 5 |
| Browser compatibility | Manual matrix on supported browsers and devices | Phase 5 |
| Deployment | Production-like Docker Compose smoke test | Phase 5 |

---

## 17. Release acceptance criteria

The release is acceptable only when:

- [ ] Proposed capacity and performance targets are confirmed by CITAD.
- [ ] API p95 targets are met under the defined load.
- [ ] Frontend performance budgets are met on a throttled mobile profile.
- [ ] Critical accessibility checks pass.
- [ ] Backend test coverage and critical-path E2E tests pass.
- [ ] Authorization and ownership tests pass for every role.
- [ ] Rate limiting, queue retries, and graceful degradation are verified.
- [ ] Health checks report real dependency status.
- [ ] Backup and restore have been tested within the last quarter.
- [ ] Security release gate in [SECURITY.md](./SECURITY.md) is satisfied.
- [ ] Production monitoring and alerting are active.
- [ ] Operational runbook and incident contacts are published.
