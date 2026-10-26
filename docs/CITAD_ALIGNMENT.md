# CITAD Alignment, Implemented Changes, and Event-Attendance Roadmap

| Field | Value |
|---|---|
| System | meetCITAD v2 |
| Updated | 26 October 2026 |
| Current work | Factual corrections and documentation implemented; commit approved on 26 October 2026 |
| Future work | Proposals only; each phase requires CITAD approval |

## 1. Product boundary

**meetCITAD solves CITAD's event-attendance problem.** It supports event discovery,
registration, QR tickets and check-in, attendance records, certificates, feedback,
and event-related communication. The weekly schedule helps participants find
activities and links to the existing event workflow when attendance is needed.

It complements [CITAD's official website](https://citad.org.ng/); it does not
replace it. No change has been made to that website. Institutional news,
publications, careers, governance, reporting platforms, academy services, and
social networks remain there or on their respective official services. A brief
About page and contact links provide context for participants, not a second
institutional content-management system.

This pass adds no runtime dependency, changes no event or participant schema,
and does not modify the v1.0 applications in the parent workspace.

## 2. Official-source audit

On 26 October 2026, all **117 URLs** in CITAD's
[page sitemap](https://citad.org.ng/page-sitemap.xml) returned successful HTTP
responses. Substantive pages, navigation, thematic pages, and the latest weekly
post were compared with meetCITAD's public copy and event models. A successful
response is not a guarantee that a page's claims are correct or current.

### Sources used for the corrections

| Information | Official source |
|---|---|
| History, vision, mission, brief institutional description | [About Us](https://citad.org.ng/about-us/) and [homepage](https://citad.org.ng/) |
| Head office, contact details, hours, contact-office listing | [Contact](https://citad.org.ng/contact/) |
| Published thematic names and descriptions | [Thematic Areas](https://citad.org.ng/thematic-areas/) and homepage |
| Thematic context | [DIRAI](https://citad.org.ng/thematic-dirai/), [DISAE](https://citad.org.ng/thematic-disae/), [TAPEB](https://citad.org.ng/thematic-tapeb/), [TICAP](https://citad.org.ng/thematic-ticap/) |
| Social destinations | Official navigation, homepage, and About Us links |
| Weekly-post comparison, not an import source | [26 October–1 November 2026](https://citad.org.ng/events-for-the-week-26th-october-to-1st-november-2026/) |

Only relevant factual text and destination URLs were used. The audit found
placeholder/duplicate pages, unresolved shortcodes, unrelated spam links, and
weekly date/time anomalies. Their markup, scripts, links, and records were not
imported. No automated website synchronisation was added.

## 3. Corrections implemented now

| Area | Previous mismatch | Implemented treatment |
|---|---|---|
| Vision | “A knowledge-based democratic society free of hunger.” | “A knowledge-based democratic and self-reliant society.” |
| Mission | Shortened wording that omitted capacity development, advocacy, research, and partnership | Uses the current official mission, with punctuation normalised |
| Head office | No. 4 Yola Street, Nasarawa GRA, Kano | Uses the Contact page's Plot 4 Samaila Adamu Gano Street address |
| Website | Displayed `.org.ng` but some destinations used `.org` | Canonical destination is `https://citad.org.ng/`; official email remains `info@citad.org` |
| Phone and hours | Missing from the participant About/footer contact details | Adds the official phone, callable link, and weekday hours with timezone |
| Offices | Dutse/Azare and an unsupported outreach summary | Shows only the locations listed on the Contact page, links to the source, and distinguishes offices from event venues |
| Thematic context | Generic focus cards and an unqualified “six thematic units” claim | Shows the published DIRAI, DISAE, TAPEB, and TICAP labels/descriptions without asserting an internal unit total |
| Social links | Singular `ictadvocate` X destination; incomplete official link-outs | Corrects X to `ICTAdvocates`; retains Facebook and adds official YouTube, Mastodon, and website destinations |
| Landing figures | Hard-coded 305 events, 12,400+ participants, 9,800 certificates, and 24 programmes, without a source | Removes the figures; uses Discover → Register → Check in → Certificates instead |
| Product positioning | Could read as an institutional website | Explicitly describes an event-attendance platform that complements the official website |
| Generated certificate header | Older office address reproduced from the sample | Uses the current Contact page address, preserving the institutional layout |

### Current public details

- **Head office:** Plot 4 Samaila Adamu Gano Street, Gandu Layout, adjacent NSITF
  building, Social Insurance Road, Trade Fair Complex, Zaria Road, Kano State,
  Nigeria.
- **Email:** `info@citad.org`.
- **Phone:** `+2347074111137`.
- **Hours:** Monday–Friday, 9:00 am–5:00 pm, `Africa/Lagos`.
- **Mission:** To empower citizens for a just and knowledge-based society that is
  anchored on sustainable and balanced development using ICT, capacity
  development, advocacy, research and partnership.
- **Contact-page offices:** Kano, Abuja, Bauchi, Jigawa (Dutse), Jama’are, and Itas.
  This is a source-attributed contact listing, not an exhaustive footprint claim.

### Files and compatibility

- `frontend-user/src/utils/citad.js` centralises the small set of public CITAD
  details used by the participant pages. It is not a new institutional CMS.
- `frontend-user/src/views/About.vue` uses the corrected copy, published thematic
  labels, source links, offices, and contact details.
- `frontend-user/src/App.vue` uses the corrected footer and social destinations;
  the longer address wraps on small screens.
- `frontend-user/src/views/Home.vue` replaces unsupported statistics with the
  attendance-workflow strip and uses shared institutional details.
- `frontend-user/src/views/certificates/CertificateVerify.vue` uses the shared
  official contact email.
- `backend/src/services/certificateLayout.service.js` corrects the generated
  certificate header. Already-issued PDFs are unchanged until explicitly
  regenerated. Uploaded designs retain the content embedded in their image;
  CITAD must approve and update those designs separately.
- `frontend-admin/src/views/certificates/TemplatesList.vue` aligns the browser
  validator with the supported PNG/JPG/WebP types. Clearing an unsaved image
  selection preserves the previously saved design; removing a saved design
  remains an explicit action. Preview metadata uses the current theme surface
  so its text stays readable in dark mode.
- This document is linked from the main README and documentation index. The
  older landing/design documents are identified as historical where relevant.

The participant carousel, event cards, sign-in prompt, account CTA, responsive
navigation/footer, and dark mode remain. No official news/careers/publication
routes or institutional counters were added.

## 4. Ambiguities requiring CITAD confirmation

| Topic | Official-source caveat | Decision for meetCITAD |
|---|---|---|
| Internal thematic-unit count | About Us still says “six different thematic units”, while current thematic navigation presents four labels | Do not assert a unit total; ask CITAD to confirm its current taxonomy before modelling it on events |
| Full office/outreach coverage | About Us additionally mentions Kaduna/Gombe and contains an incomplete outreach sentence; Contact lists a different set | Use the attributed Contact listing; do not infer closed offices or a complete geographic footprint |
| Institutional impact | Official homepage youth/publication/partner/target counters measure different things from events, attendance, and certificates | Do not substitute those figures; public meetCITAD metrics require approved definitions and verifiable platform data |
| Certificate authority | The sample contains institutional/accreditation marks and authorized signature areas | Design reference is not authority to copy signatures or issue accredited qualifications; CITAD must approve template wording and marks |
| Application support | No dedicated meetCITAD support mailbox has been confirmed | Link the official general contact; CITAD must name an operational owner before launch |

## 5. Existing v2 work retained

These are implemented capabilities, not new features introduced by this factual
alignment pass. Local implementation does not mean production acceptance.

- **One attendance source of truth:** weekly records optionally reference
  `WeeklyActivity.eventId`; existing event registration, attendance, QR,
  certificate, and feedback systems are reused. Standalone activities are
  schedule-only. Completing a personal task never records attendance.
- **Weekly planning:** `WeeklyProgram`, `WeeklyActivity`, and
  `PersonalWeeklyTask`; Monday 00:00 `Africa/Lagos` boundaries; overlapping and
  multi-day activities; draft/published/archived lifecycle; private tasks and
  calendar exports. Archiving does not archive or delete a linked event.
- **Visibility and sharing:** public, authenticated, and staff visibility;
  restricted titles never appear in public exports, only aggregate exclusions.
  Publishing never notifies everyone. Notification dispatch requires explicit
  recipient selection, channel choice, permissions, and confirmation.
- **Required weekly heading:**

  ```text
  EVENTS AND PROGRAMS FOR THE WEEK [START DATE] TO [END DATE].
  ```

  WhatsApp/email variants, copy, TXT download, and browser print remain. The
  official website's different heading and internal-meeting content do not
  override these rules. See [WEEKLY_PROGRAMS.md](./WEEKLY_PROGRAMS.md).
- **Event-day controls:** walk-in email is required; creation is restricted to
  `super_admin`, `event_manager`, and `staff`, not auditors. Staff may manage
  weekly programmes but cannot publish; auditors are read-only. The admin
  top-right retains only the theme toggle.
- **Hardening:** token versions, server-side permissions, signed QR validation,
  rate limits, bounded bodies/pagination, restricted certificate downloads,
  path-disclosure prevention, mandatory super-admin TOTP and recovery codes.
  Remaining risks and release gates stay in [SECURITY.md](./SECURITY.md).
- **Certificates:** institutional A4 landscape layout follows the real CITAD
  sample without copying signatures. Certificate-template listing safely handles
  an unpopulated `dynamicFields` projection. Pre-designed certificate image
  upload, preview, replacement, removal, and millimetre overlay controls are
  implemented.

### Using an approved pre-designed certificate

1. Open **Admin → Certificates → Templates**, then create or edit a template.
2. Choose an authorized PNG, JPG, or WebP design, up to **10 MB**. Use the correct
   paper aspect ratio; a full-page background is cropped to cover, not stretched.
   A4 landscape is recommended. PDF design upload is not part of this flow.
3. Leave recipient/event fields blank in the image. Include only CITAD-approved
   fixed wording and authorized signature areas. meetCITAD does not manufacture
   or copy signatures from the sample.
4. Adjust recipient-name position (default **92 mm** from the top), statement
   position (**122 mm**), and QR size (**16 mm**). Check that long text does not
   overlap fixed artwork, signatures, or the verification footer.
5. Save, then select that template during certificate generation. Confirm a
   generated PDF before issuing a batch. The image preview is not a full PDF
   proof. Replacing/removing a design affects future generation, not existing
   issued PDFs unless explicitly regenerated.

**Clear selection** discards only an unsaved image choice. **Remove design**
removes the saved background immediately; cancelling the editor does not undo
that explicit removal.

Background API: authenticated administrators with `generate_certificates` use
`POST` or `DELETE /api/v1/certificates/templates/:id/background`; upload field
`templateFile`. Processed backgrounds are served from
`/uploads/certificate-templates/`. They must contain no participant-specific
personal data. Actual certificate PDFs remain behind authenticated downloads.

## 6. Future event-focused implementation

**Nothing in this roadmap is being enabled automatically.** Approve field
definitions, privacy rules, ownership, hosting costs, and acceptance criteria
before implementation. Phases describe dependency order, not promised dates.

| Phase | Proposed work | Integration and acceptance |
|---|---|---|
| 0 — Accept the attendance MVP | Complete the approved admin/participant walkthrough, close security gaps, verify live delivery and operational readiness | Register → QR ticket → authorized check-in → certificate download/verification → feedback; test duplicate/retry and negative authorization cases; meet approved security/NFR release gates |
| 1 — Better event information | CITAD-approved thematic/project tags, event mode (`physical`, `virtual`, `hybrid`), accessibility information, event-specific contact, optional organizing partners | Extend `Event` and its validation/forms/detail views; keep existing events compatible; linked weekly items resolve canonical event fields rather than duplicate them; never expose private meeting URLs in public exports |
| 2 — Repeat programmes and follow-up | Series/edition metadata, deliberate creation of separate event instances, participant post-event resources, attendance-based certificate rules and follow-up | Every occurrence retains its own registrations, QR, attendance, and certificate eligibility; resources have explicit visibility; do not infer attendance from opening a link or completing a task |
| 3 — Optional official-site integration | Approved link-outs or an event/weekly-only WordPress feed/export | Start with previewable, manually approved public-only export; use stable event IDs, validation, an allowlist, sanitised text, audit and failure reporting; preserve the required weekly heading and explicit notification confirmation |
| Later, only if useful | Verified aggregate platform metrics and narrowly scoped reporting improvements | Define counting periods, unique participants vs registrations vs attendance, certificate status, permissions, and freshness; exclude private identifiers and never present these as CITAD's entire institutional impact |

### Privacy and safeguarding prerequisites

- Approve a participant privacy notice, data-owner/support contact, retention
  rules, and a process for access/correction/deletion requests.
- Distinguish required registration/check-in messages from optional promotional
  communication. Publishing an event or weekly schedule is not consent to a
  broadcast.
- Public accessibility/venue information may be event metadata. Individual
  accommodation requests are potentially sensitive: collect only when needed,
  limit staff access, avoid public exports/caches, and agree retention first.
- Set explicit consent and safeguarding rules for minors, photos, recordings,
  and feedback. Do not create an incident-reporting platform inside meetCITAD.
- Gate virtual joining information separately from public mode labels and
  venue summaries. Reuse event authorization; do not create a second attendance
  mechanism for virtual/hybrid activities.

### Technical guardrails

- Preserve Vue/Pinia/Vuetify and Express/Mongoose conventions. Prefer small,
  optional schema additions and shared resolvers over another event subsystem.
- Existing `WeeklyActivity` already has project, department, mode, and restricted
  meeting metadata. Its support does not mean equivalent canonical `Event`
  fields have already been implemented.
- CITAD's website remains the institutional source; meetCITAD's `Event` remains
  the operational source for registration, attendance, QR, certificates, and
  feedback. Document ownership and conflict resolution before any integration.
- Do not scrape whole website pages into the portal, import internal meetings
  blindly, copy third-party scripts, or publish private staff contacts.
- New features require server-side permission, ownership, visibility, and
  migration tests. A future WordPress integration also needs idempotency,
  unpublish/archive propagation, and an explicit approval path.

## 7. Validation and release status

### Current checks (26 October 2026)

| Check | Result |
|---|---|
| Participant production build | Passed |
| Admin production build | Passed |
| Weekly backend regressions | 41/41 passed |
| Certificate renderer/projection regressions | 12/12 passed; current address fits the header and both renderers produce one-page PDFs |
| Certificate-background API lifecycle | Passed in the earlier local API check; test template/file cleaned up |
| Corrected public-page browser checks | Passed for Home/About at 1440, 820, and 360 px in light/dark themes against the live public API; no horizontal overflow |
| Carousel fallback and populated state | Passed on dark mobile with zero and three browser-only event fixtures; no development events created |
| Uploaded-template controls | Passed with mock admin API responses: PNG/JPG/WebP, create/edit/preview/replace/remove, invalid/oversized rejection, overlay persistence, and non-destructive clearing; light desktop and dark mobile |
| Certificate PDF proof | Institutional and uploaded-background one-page synthetic PDFs visually checked as images; current address fits and blank signature areas are preserved; no real certificate was issued |

Both builds retain the existing warning for shared JavaScript chunks larger than
500 kB. This is not a failed build or proof of compliance with performance targets.

Browser admin fixtures exercise the UI and request wiring, not production
authorization or a real participant certificate lifecycle. They do not change
development event/template records. The full approved live walkthrough remains
a separate acceptance step.

Run the verified checks from their respective directories:

```powershell
# backend/ — uses a dedicated weekly test database, not development records
$env:NODE_ENV='test'
node --test --test-concurrency=1 tests/certificates/*.test.js tests/weekly/*.test.js

# frontend-user/ and frontend-admin/, separately
npm.cmd run build
```

The regression files are local development artifacts, not an approved committed
test suite or a complete coverage report. SEC-12 remains open for a comprehensive
authorization/QR/upload/certificate regression suite. CI is not configured and
generated Swagger is missing/empty. Do not represent this pass as closing those
release gates.

### Walkthrough and deployment prerequisites

- Local services: participant `http://localhost:5173`, admin
  `http://localhost:5174`, backend `http://localhost:4000`.
- A complete live walkthrough needs an approved admin-created event and
  confirmed manual admin access. Use the current event records; browser fixtures
  are not real registrations or attendance. Do not reset passwords or create
  development events without approval.
- Mailjet/Twilio are unconfigured locally, so actual email/SMS delivery remains
  unverified. Redis is unavailable locally; rate limits use memory and queues
  are disabled. This is a development fallback, not a production strategy.
- Before deployment, run the idempotent
  `backend/src/utils/backfillWeeklyPermissions.js` against the approved target
  database and create the required indexes. Users/admins with older JWTs lacking
  `ver` must sign in again.
- Approve certificate wording, institutional/accreditation marks, signature
  authority, and any uploaded design before issuing real certificates.
- [SECURITY.md](./SECURITY.md) and
  [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md) remain
  baselines. Proposed capacity, performance, availability, recovery, retention,
  and procurement targets require CITAD approval and measured verification.

### Change-control boundary

The user approved committing this update on 26 October 2026. This does not
authorize a push, production release, or future roadmap implementation. Preserve
the user's exclusions:
`backend/tests/`, `backend/API_TEST_RESULTS.md`, `backend/test-api.sh`,
`backend/test-import.js`, and `img/` must not be included in a commit. Browser
screenshots, synthetic certificate proofs, and cached website evidence remain
outside the repository in the approved OpenCode temporary directory.

## 8. Approval checklist

- [ ] CITAD confirms the authoritative thematic taxonomy and office footprint.
- [ ] CITAD accepts the corrected participant-facing details and certificate header.
- [ ] An approved event is used for the complete manual attendance walkthrough.
- [ ] Certificate wording, marks, signatures, and uploaded backgrounds are authorized.
- [ ] Privacy, safeguarding, support, and retention owners/rules are approved.
- [ ] Live providers, Redis/queues, backups, monitoring, and release gates are verified.
- [ ] A future phase is separately approved with its acceptance criteria.
- [x] The user expressly approved this update's commit; the exclusions above remain in force.
