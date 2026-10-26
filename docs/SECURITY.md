# meetCITAD v2 — Security Architecture and Controls

| Field | Value |
| --- | --- |
| Document | Security architecture, controls, and risk register |
| Version | 1.0 |
| Status | Baseline — approved for planning and remediation |
| System | meetCITAD v2.0 |
| Scope | Backend API, user frontend, admin frontend, MongoDB, Redis/Bull, file storage, email/SMS providers |
| Owner | meetCITAD Engineering |
| Last updated | 20 October 2026 |
| Review cycle | Before every production release, and at least quarterly |

This document describes the security model that meetCITAD v2 is expected to
meet, the controls already implemented, and the gaps that must be closed before
production. It is an engineering baseline, not a legal opinion. Privacy
obligations remain subject to CITAD policy and applicable Nigerian law.

---

## 1. Scope and assumptions

### In scope

- `backend/` — Express API, MongoDB models, JWT authentication, QR attendance,
  certificates, feedback, notifications, admin operations, queues, and uploads.
- `frontend-user/` — public participant application, PWA, ticket wallet,
  certificate verification, and offline behavior.
- `frontend-admin/` — administration portal, scanner, analytics, exports, and
  administrator management.
- MongoDB, Redis/Bull, local/S3/Cloudinary storage, Mailjet, and Twilio.
- Deployment configuration, secrets, logs, backups, and operational processes.

### Out of scope

- CITAD office networks, staff laptops, and personal devices.
- The internal security of Mailjet, Twilio, cloud storage, and hosting
  providers.
- v1.0 applications in the parent workspace. They are not part of v2 and must
  not be modified.

### Security objectives

1. **Confidentiality** — participant and administrator data is visible only to
   authorized actors.
2. **Integrity** — attendance, certificates, feedback, and audit records cannot
   be altered without authorization.
3. **Availability** — core registration, attendance, and certificate workflows
   remain usable during expected load and dependency failures.
4. **Accountability** — privileged actions are attributable to a named
   administrator.
5. **Privacy** — personal data is minimized, protected, and retained only as
   long as necessary.

---

## 2. System context and trust boundaries

```text
Participant browser ──HTTPS──┐
                             ├──> Express API ──> MongoDB
Administrator browser ──HTTPS┘         │
                                       ├──> Redis / Bull queues
                                       ├──> Local or cloud file storage
                                       ├──> Mailjet (email)
                                       └──> Twilio (SMS)
```

Trust boundaries:

| Boundary | Risk |
| --- | --- |
| Browser → API | Token theft, CSRF where cookies are used, injection, replay, abuse |
| API → MongoDB | Injection, excessive data exposure, missing ownership checks |
| API → Redis/Bull | Queue poisoning, unauthenticated Redis, job replay |
| API → file storage | Unauthorized file access, path traversal, malicious uploads |
| API → Mailjet/Twilio | Secret leakage, spam, provider compromise |
| Browser local storage / service worker | XSS token theft, cached personal data on shared devices |

The API is the primary policy enforcement point. Frontend route guards are
usability controls only and must never be treated as authorization.

---

## 3. Data classification

| Class | Examples | Handling requirement |
| --- | --- | --- |
| Restricted | Password hashes, JWT secrets, TOTP secrets, reset/verification tokens, QR signing key, provider credentials | Never exposed in API responses or logs; encrypted at rest where supported; rotate on exposure |
| Confidential | Name, email, phone, organisation, profile image, attendance records, certificates, feedback comments, audit logs | Authorized access only; encrypt in transit; avoid unnecessary copies |
| Internal | Aggregate analytics, queue status, system health, event operations data | Authenticated staff only |
| Public | Published event title, description, venue, public certificate verification result | May be public, but no unnecessary personal data |

QR ticket contents include participant name and email today. Treat every
ticket QR as **confidential** and avoid displaying it publicly.

---

## 4. Actors and authorization model

| Actor | Description |
| --- | --- |
| Anonymous | Can view published events and verify a certificate hash |
| Participant | Authenticated user; can register, view own tickets, certificates, and feedback |
| Staff | Administrator with limited reporting and certificate permissions |
| Event manager | Administrator who can create/edit/delete events, certificates, and notifications |
| Auditor | Read-only access to reports and analytics |
| Super administrator | Full administrative access; bypasses permission checks |

### Target administrative permission map

| Capability | Required permission |
| --- | --- |
| Dashboard and event overview | `view_analytics` or `view_reports` |
| Create/edit/delete events | `create_event`, `edit_event`, `delete_event` |
| Attendance and scanner | `view_reports` or a dedicated attendance permission |
| Participant management | `manage_users` |
| Certificate generation and templates | `generate_certificates` |
| Feedback and reports | `view_reports` |
| Notifications | `send_notifications` |
| Administrator management | `manage_admins` |
| System health, settings, queues, audit | `manage_settings` or `view_reports` |
| Data exports | `export_data` |

### Current implementation (hardened)

- `protect` authenticates a JWT, loads the current account, checks status,
  password-change time, and token version.
- `restrictTo('admin')` establishes the administrator boundary.
- `checkPermission()` is applied to administrator, certificate, feedback,
  notification, queue, attendance, and event-mutation route groups.
- Attendance scanning and manual check-in are administrator-only and require
  `view_reports`.
- Walk-in attendee creation is limited to `super_admin`, `event_manager`, and
  `staff` roles. Read-only auditors are rejected even though they can view
  attendance reports.
- Frontend navigation still hides inaccessible items for usability, but it is no
  longer the only enforcement layer.

Privilege fixes applied:

- Only a super administrator can change another administrator's role,
  permissions, or status.
- Administrators cannot change their own role, permissions, or status.
- Administrator password changes and logout invalidate outstanding tokens.
- Certificate PDFs are no longer mounted as public static files.
- A participant can no longer call the attendance scan endpoint.

Remaining follow-up: automated negative authorization tests for every route
group (SEC-12).

---

## 5. Authentication and session controls

### Implemented

- Passwords hashed with bcrypt; default cost factor 10.
- Access and refresh tokens signed with separate JWT secrets.
- Access token lifetime defaults to 15 minutes; refresh token to 7 days.
- JWT role claim plus account lookup on every protected request.
- Deactivated accounts are rejected.
- Participant password changes invalidate older access tokens through
  `passwordChangedAt`.
- User password history retains the last five hashes.
- Account lockout after five failed attempts for two hours.
- Administrator login restricted to `@citad.org` and `@citad.edu.ng`.
- Mandatory TOTP enrollment and login verification for `super_admin` accounts,
  with single-use recovery codes and authenticated recovery-code regeneration.
- Optional TOTP two-factor authentication for other administrator accounts when
  configured manually.
- Email verification OTP and password reset tokens are stored as SHA-256 hashes
  with expiry (10 minutes and 1 hour respectively).
- Password reset responses do not reveal whether an email exists.
- Admin login and privileged actions are recorded in the administrator audit
  log.

### Required controls and current status

| Control | Status | Action |
| --- | --- | --- |
| Server-side permissions | Implemented | Applied to administrator, certificate, feedback, notification, queue, attendance, and event-mutation routes; add negative tests |
| Password change invalidates admin sessions | Implemented | `changedPasswordAfter` and token versioning reject old tokens |
| Refresh-token revocation | Implemented | Token version checked on refresh; logout and password change increment it |
| Logout invalidates tokens | Implemented | Logout increments the account token version |
| TOTP enforcement | Implemented | Super administrators enroll before their first session; TOTP and single-use recovery codes are verified at login |
| Token storage | Gap | Avoid long-lived tokens in `localStorage`; prefer `HttpOnly`, `Secure`, `SameSite` cookies or in-memory access tokens with a protected refresh cookie |
| CSRF protection | Not required today | Required if authentication moves to cookies |
| Secret strength validation | Partial | Production requires a strong `QR_SIGNATURE_KEY` and `COOKIE_SECRET`; certificate signing key validation is still pending |
| Production bcrypt cost | Warning | Raise from 10 to at least 12 after measuring login latency |

The QR service no longer uses a public default. Development derives a local key
from the JWT secret; production refuses to start without a strong
`QR_SIGNATURE_KEY`.

Super administrators who have not enrolled receive a short-lived, purpose-scoped
enrollment token after a valid password. The token cannot access API routes and
is only accepted by the TOTP setup endpoints. Enrollment returns ten single-use
recovery codes, stored as hashes; regenerating them requires the current password
and a valid TOTP code.

---

## 6. Authorization and object-level access

Implemented ownership checks:

- Participants can only read and update their own feedback.
- Participants can only view or download their own certificates.
- Administrator certificate, feedback, and attendance endpoints require an
  administrator token.
- Certificate verification is intentionally public through an unguessable
  verification hash.

Required controls now applied:

1. Permission middleware is applied to administrative endpoints.
2. Non-super administrators cannot change another administrator's status,
   role, or permissions.
3. Administrators cannot change their own role, permissions, or status.
4. QR scanning, manual check-in, and walk-in attendee creation are restricted
   to administrators; walk-in creation additionally rejects the read-only
   auditor role.
5. Object ownership checks remain on participant feedback and certificate
   routes.
6. Administrator list/detail and export queries exclude password hashes, TOTP
   secrets, reset tokens, and certificate filesystem paths.

Remaining follow-up:

- Add automated tests for each authorization boundary.
- Reject unknown fields on sensitive update endpoints.
- Consider opaque public identifiers where object IDs are not necessary.

---

## 7. Abuse prevention and denial of service

### Implemented

- Body size limit of 2 MB for JSON and URL-encoded bodies; uploads have their own limits.
- MongoDB operator sanitization.
- HTTP parameter pollution protection.
- CORS allowlist from `CORS_ORIGIN`.
- Helmet security headers.
- Account lockout for repeated login failures.
- Global API rate limiting plus dedicated limiters for login, registration,
  OTP/password reset, token refresh, scanning, certificate downloads,
  feedback, uploads, exports, and administrative actions.
- Redis-backed rate limiting when Redis is available, with in-memory fallback
  in development.

### Applied controls

- `authLimiter` and `strictAuthLimiter` are mounted on authentication routes.
- `scanLimiter` is mounted on attendance scanning.
- `downloadLimiter` and `uploadLimiter` protect file operations.
- `adminLimiter` and `exportLimiter` protect administrative and export routes.
- `apiLimiter` is mounted on `/api`.
- Pagination limits are capped at 100 for administrator users, certificates,
  feedback, and audit logs.
- Sort fields are allowlisted on those list endpoints.

Remaining actions:

- Add reverse-proxy or gateway limits as a second layer.
- Move certificate generation to the existing Bull queue instead of performing
  long-running PDF work inline.
- Verify Redis-backed counters in production; development may use per-process
  memory when Redis is absent.

---

## 8. Input, output, and application security

### Implemented

- Express-validator rules for signup, login, admin login, password change,
  event creation/update, QR scans, feedback, and certificate verification.
- Mongoose schema validation and unique indexes.
- Vue template escaping reduces reflected XSS.
- File upload MIME allowlists and size limits.
- Images re-encoded through Sharp with randomized filenames.
- Error messages hide stack traces in production.
- NoSQL injection sanitization and HTTP parameter pollution protection.

### Hardening status

- Administrator users, certificate, feedback, and audit list endpoints cap
  pagination and allowlist sort fields.
- Certificate responses no longer include absolute filesystem paths.
- Remaining: validate and bound every query parameter across all list
  endpoints, reject unknown fields on sensitive profile/administrator updates,
  add a strict production CSP with the frontend origins, serve uploads with safe
  content disposition, and replace participant name/email in QR payloads with an
  opaque ticket identifier.

---

## 9. File and certificate security

### Implemented

- Local storage, S3, and Cloudinary storage options.
- Random filenames and image re-encoding.
- Certificates downloaded through an authenticated API route that checks
  ownership and revocation status.
- Certificate verification through a high-entropy hash.

### Risks

| Risk | Severity | Status |
| --- | --- | --- |
| Public certificate directory | Critical | Resolved: static mount removed; downloads require authentication and ownership |
| Filesystem path disclosure | High | Resolved: only filenames are stored; serializer strips `fileUrl`; exports exclude it |
| Certificate PDF access by staff | Medium | Resolved: admin certificate read/download requires `generate_certificates`; participants still require ownership |
| Upload content scanning | Low | Open: images are re-encoded, but no malware scanner exists for PDF template uploads |

Remaining actions:

1. Add malware scanning or a quarantine step for uploaded template PDFs.
2. Add an audit entry for every certificate download, revoke, and regeneration.
3. Move certificate generation to a worker queue with retry and idempotency.

---

## 10. Secrets and configuration

### Implemented

- `.env` files and build output are excluded by `.gitignore`.
- Secrets are read from environment variables.
- Development can run without Mailjet or Twilio; those channels are disabled.
- Redis is optional in development and required in production.

### Required controls

- Production startup now rejects a missing, short, or example-value
  `QR_SIGNATURE_KEY` and a missing `COOKIE_SECRET`.
- Still required: validate `CERTIFICATE_SIGNATURE_KEY`, use a managed secret
  store in production, rotate JWT/QR/cookie/provider secrets on a documented
  schedule, and keep development, staging, and production credentials separate.
- Set `NODE_ENV=production`, `CORS_ORIGIN`, and `BACKEND_URL` explicitly.
- Set `TRUST_PROXY=true` only when deployed behind exactly one trusted reverse
  proxy so client IPs, rate limits, and audit records are accurate.
- Never log tokens, passwords, OTPs, or full request authorization headers.
  Development OTP logging must remain disabled in production.

---

## 11. Data protection, privacy, and retention

### Principles

- Collect only data needed for registration, attendance, certification,
  feedback, and communication.
- Explain the purpose and retention period in a participant privacy notice.
- Obtain consent where required for optional communications.
- Allow participants to access, correct, export, and delete their data, subject
  to legal and institutional retention requirements.
- Treat attendance and certificate records as institutional records, not
  disposable marketing data.

### Proposed retention baseline

These periods are proposed for approval by CITAD; they are not yet automated.

| Data | Proposed retention |
| --- | --- |
| Active participant profile | While the account is active |
| Deleted participant profile | Anonymize within 30 days; retain aggregate statistics |
| Event and attendance records | 5 years after the event |
| Certificates and verification records | 7 years after issue |
| Feedback | 2 years, unless needed for an active investigation |
| Administrator audit logs | 2 years |
| Application logs | 90 days |
| Backups | 30 days rolling; encrypted |
| Queue job payloads | Remove on completion; keep failed jobs for 30 days |

### Privacy requirements

- Publish a privacy notice covering purpose, legal basis, retention, and
  contact details.
- Provide a data-subject request process with identity verification.
- Encrypt backups and restrict restore access.
- Do not include unnecessary personal data in analytics exports.
- Define a breach-response process with notification within the period required
  by applicable law and CITAD policy.
- Review third-party processors (Mailjet, Twilio, cloud storage, hosting) for
  data-processing terms and location.

---

## 12. Logging, monitoring, and audit

### Implemented

- Winston application logs.
- Morgan HTTP request logs.
- Administrator audit entries stored in the administrator document, capped at
  1,000 entries per administrator.
- Login history for administrators.
- Configurable Sentry DSN placeholder.

### Gaps

- Sentry is not integrated.
- No request/correlation ID is attached to logs.
- No metrics or alerting are configured in the repository.
- Administrator audit entries are per-admin and capped; they are not a
  tamper-evident central audit store.
- Health endpoints are partly static; database and dependency health are not
  actually checked.
- Failed administrator login attempts are not consistently written to the audit
  trail.

### Required controls

- Emit structured JSON logs with timestamp, severity, request ID, actor ID,
  route, status, latency, and client IP.
- Never log secrets, tokens, passwords, or full QR payloads.
- Record security events: login success/failure, lockout, permission denial,
  password change, role change, export, certificate revoke, queue action, and
  data deletion.
- Centralize audit events with append-only retention.
- Add health checks for MongoDB, Redis, storage write access, and provider
  configuration.
- Integrate error monitoring and alert on elevated 5xx, login failures, queue
  failures, and certificate-generation failures.

---

## 13. Backup, recovery, and availability

- MongoDB requires daily encrypted backups with point-in-time recovery where
  available.
- Uploaded images, certificate PDFs, and templates require the same backup
  schedule as the database.
- Restore procedures must be tested at least quarterly.
- Proposed targets: RPO 24 hours, RTO 4 hours.
- Redis queue data may be reconstructed from the database for email and
  notifications, but certificate jobs must be retryable and idempotent.
- A production deployment must run Redis; the API's development fallback is not
  a production availability strategy.
- Run the API with at least two instances behind a load balancer when uptime
  requirements exceed a single process.
- Use shared object storage for uploads when running multiple API instances.

---

## 14. Secure development and verification

Required engineering controls:

- Code review for all changes, especially auth, permissions, uploads, and
  certificate generation.
- Automated tests for authorization boundaries and object ownership.
- Dependency vulnerability scanning in CI.
- Secret scanning in CI.
- Linting and formatting in CI.
- No production data in development or test environments.
- A release checklist signed off by engineering and the data owner.
- A documented vulnerability disclosure and response process.

Minimum security test cases before release:

1. A staff/admin without a permission receives `403` from each protected route.
2. A participant cannot read another participant's feedback, certificate, or
   registration record.
3. A participant cannot invoke attendance scanning or manual check-in.
4. A suspended administrator cannot authenticate or refresh a token.
5. An access token issued before a password change is rejected.
6. A tampered QR code, expired QR code, and QR for another event are rejected.
7. A revoked certificate cannot be downloaded or verified as valid.
8. Rate limits trigger after the configured number of attempts.
9. Uploads with a forged MIME type, oversized body, or unexpected field are
   rejected.
10. Certificate PDFs are not reachable without authorization.

### Manual verification record

A local API smoke pass was run on 20 October 2026 against the development
database. All checks passed (`37/37`):

- mandatory super-administrator 2FA enrollment, setup-token scope enforcement,
  TOTP login, single-use recovery codes, recovery-code regeneration, and
  rejection of the TOTP secret from profile responses;
- super-admin access to administrator, user, and certificate lists;
- auditor access to analytics and denial of user, audit, admin-management, and
  certificate routes;
- participant denial of administrator routes and attendance scanning;
- certificate ownership enforcement and removal of the public certificate path;
- rejection of self role changes;
- access and refresh token invalidation after logout and password change;
- rate limiting after repeated failed administrator logins;
- absence of `fileUrl` in certificate responses.

Additional walk-in checks were run on 20 October 2026: authenticated creation
and idempotent repeat-add passed, while anonymous requests returned `401` and
read-only auditor requests returned `403`.

This is a manual verification, not a substitute for the automated regression
suite required by SEC-12.

---

## 15. Incident response

| Phase | Actions |
| --- | --- |
| Detect | Monitor alerts, user reports, provider notices, and audit anomalies |
| Triage | Classify severity, identify affected accounts and data, preserve logs |
| Contain | Revoke tokens/secrets, suspend accounts, disable affected endpoints or queues |
| Eradicate | Patch the root cause, rotate credentials, remove malicious files |
| Recover | Restore services, verify integrity, monitor for recurrence |
| Notify | Inform CITAD management, data protection contact, and regulators where required |
| Review | Post-incident report, timeline, root cause, and preventive actions |

Severity guidance:

- **Critical** — confirmed exposure of credentials or certificate PDFs, admin
  takeover, or destructive data loss.
- **High** — privilege escalation, unauthorized attendance or certificate
  issuance, or widespread personal-data exposure.
- **Medium** — limited data exposure, abuse requiring authenticated access, or
  prolonged degradation.
- **Low** — minor misconfiguration with no confirmed data impact.

Incident contact roles must be filled in by CITAD before launch: Security Lead,
Data Protection Officer, IT Operations, and Communications.

---

## 16. Security risk register and remediation plan

| ID | Severity | Risk | Remediation | Status |
| --- | --- | --- | --- | --- |
| SEC-01 | Critical | Certificate PDFs served from a public static directory | Removed public mount; every download is authenticated | Code complete; public URL verified 404 |
| SEC-02 | Critical | Administrative permissions not enforced by the API | Applied `checkPermission` across administrative route groups | Code complete; manual smoke passed; automated tests pending |
| SEC-03 | High | Rate limiters were not mounted | Wired auth, scan, upload, export, admin, and global API limiters | Code complete; manual smoke passed; verify Redis counters in production |
| SEC-04 | High | Any authenticated user could submit attendance scans | Scanning, manual check-in, and walk-in creation restricted to administrators; walk-in creation rejects the auditor role | Code complete; verified in manual smoke |
| SEC-05 | High | Admin password change did not revoke existing tokens | Added `changedPasswordAfter`, token versions, and refresh checks | Code complete; verified in manual smoke |
| SEC-06 | High | Access and refresh tokens stored in `localStorage` | Move to hardened cookies or memory plus protected refresh cookie | Open |
| SEC-07 | High | QR signing key fell back to a known default | Development derives a local key; production fails without a strong secret | Code complete |
| SEC-08 | High | Absolute certificate filesystem paths returned to clients | Store filenames only; strip `fileUrl`; exclude it from exports | Code complete; verified in manual smoke |
| SEC-09 | Medium | Refresh tokens were replayable and logout did not revoke them | Token versioning on logout, password change, role, and status changes | Code complete; verified in manual smoke |
| SEC-10 | Medium | Non-super admins could suspend other admins | Super-admin-only peer changes; self role/status changes rejected | Code complete; self-role test passed |
| SEC-11 | Medium | 2FA was optional for privileged accounts | Mandatory TOTP enrollment for super administrators, recovery codes, and authenticated regeneration | Code complete; 2FA smoke checks passed |
| SEC-12 | Medium | No automated security regression tests | Add tests for authorization, QR, uploads, and certificates | In progress; manual smoke passed |
| SEC-13 | Medium | No production error monitoring or alerting | Integrate Sentry/metrics and alerts | Open |
| SEC-14 | Medium | Missing `trust proxy` configuration | `TRUST_PROXY` setting and app wiring added | Code complete |
| SEC-15 | Low | 10 MB JSON body limit was larger than needed | Reduced JSON/urlencoded limit to 2 MB | Code complete |

---

## 17. Production security release gate

The application must not be declared production-ready until:

- [ ] SEC-01 through SEC-08 are closed and covered by tests.
- [ ] All administrative routes enforce permissions server-side.
- [ ] Authentication rate limits are active and verified.
- [ ] QR and certificate secrets are mandatory, strong, and rotated from
      development values.
- [ ] Public certificate access is removed.
- [ ] Backups, restore, logging, and alerting are operational.
- [ ] Privacy notice, retention schedule, and incident contacts are approved.
- [ ] Both frontend production builds and the backend test suite pass.
