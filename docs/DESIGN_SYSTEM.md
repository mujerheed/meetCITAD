# meetCITAD Design System Documentation

**Version:** 2.0  
**Last Updated:** December 17, 2025  
**Organization:** Centre for Information Technology and Development (CITAD), Kano

> **Current factual content:** Refer to
> [CITAD_ALIGNMENT.md](./CITAD_ALIGNMENT.md) for the 26 October 2026 official-source
> corrections and event-attendance scope. Historical impact examples in this
> design document are not verified institutional figures and must not be used
> as public statistics. Security/NFR targets remain subject to CITAD approval.

---

## 1. Design Philosophy

### Core Principles (Non-Negotiable)

✅ **Institutional, Calm, and Authoritative**  
This is NOT a startup, NOT a marketing website, NOT a consumer app.  
It is a serious civic technology system for events, certifications, and engagement.

✅ **Clean Spacing and Strong Hierarchy**  
Every element has breathing room. Clear visual hierarchy guides the user.

✅ **No Playful Illustrations**  
Only real photographs of civic/educational events.

✅ **No Gradients or Glassmorphism**  
Flat, solid colors only. Institutional trust over trends.

✅ **No Flashy Animations**  
Subtle transitions only (0.2s max). System feels calm and predictable.

✅ **Usability and Trust Over Creativity**  
Function > form. Accessibility and clarity are paramount.

### Visual Reference Models
- University portals (e.g., student information systems)
- Government platforms (e.g., civic services)
- NGO websites (e.g., UN agencies, international development orgs)

---

## 2. Brand Hierarchy (CRITICAL)

### Organizational Structure

```
CITAD (Primary Organization)
  └── meetCITAD (Supporting System/Tool)
```

### Rules (Do Not Violate)

1. **CITAD is the organization** — Always primary in footer and certificates
2. **meetCITAD is the system** — Modest presence in header and app shell
3. **meetCITAD must NEVER overpower CITAD branding**
4. **Certificates and official documents MUST feature CITAD prominently**
5. **Footer:** meetCITAD left (supporting), CITAD right (primary with full name)

---

## 3. Logo Assets

### Logo Variants (Use Exactly)

| File | Usage | Context |
|------|-------|---------|
| `logo.svg/png` | Full-color meetCITAD logo | Header (light mode), Footer (light mode) |
| `logo-white.svg/png` | White meetCITAD logo | Header (dark mode), Footer (dark mode) |
| `logo-black.svg/png` | Monochrome logo | Documents, PDF exports, print materials |
| `logo-symbol.svg/png` | Symbol only (no text) | Favicon, PWA icon, small spaces |
| `citad-logo.png` | Official CITAD logo | Footer (primary), Certificates, About page |

### Logo Guidelines (Strict)

✅ **Must be flat** — No shadows, no 3D effects  
✅ **Transparent backgrounds only**  
✅ **Never stretched or skewed** — Maintain aspect ratio  
✅ **Never recolored** — Use provided variants  
✅ **Minimum size: 24px height** — Maintain legibility  
✅ **Adequate spacing** — Logos must breathe (8-16px padding minimum)

### Current Implementation

**Header (App.vue):**
```vue
<v-img 
  :src="theme.global.name.value === 'dark' 
    ? require('@/assets/images/logo-white.png') 
    : require('@/assets/images/logo.png')" 
  max-height="40" 
  max-width="160" 
  contain
  class="mr-3"
></v-img>
```

**Footer (App.vue):**
```vue
<!-- Left: meetCITAD (supporting) -->
<v-img 
  :src="require('@/assets/images/logo-symbol.png')" 
  max-height="32" 
  max-width="32" 
  contain
></v-img>

<!-- Right: CITAD (primary) -->
<v-img 
  :src="require('@/assets/images/citad-logo.png')" 
  max-height="48" 
  max-width="120" 
  contain
></v-img>
```

### Official Certificate

Generated certificates follow CITAD’s printed certificate rather than a generic
event template:

- A4 landscape with a blue double frame, stepped corner brackets, and a light
  CITAD watermark.
- CITAD wordmark on the left, the institutional address in the centre, and the
  CPN accreditation mark on the right.
- Recipient name in the bundled Great Vibes script on a ruled line.
- Event statement on a pale-blue highlight, followed by the event date range.
- Two default signature areas (`Training Facilitator, CITAD` and
  `Executive Director, CITAD`) with room for names or uploaded signatures.
- A verification QR code and certificate number in the lower corners.

Certificate-only assets live in `backend/assets/`:

| Asset | Purpose |
|-------|---------|
| `certificates/citad-logo.png` | Transparent CITAD wordmark for the PDF header |
| `certificates/cpn-logo.png` | CPN accreditation mark |
| `fonts/GreatVibes-Regular.ttf` | Recipient-name script (OFL licence included) |

The layout is implemented in
`backend/src/services/certificateLayout.service.js`. Template title, wording,
border colour, background colour, font sizes, and signatures are still read
from the selected certificate template. Existing issued PDFs are not changed;
regenerate a certificate to apply the institutional layout.

Administrators can also upload an already-designed certificate image in the
template editor. The image is stored under `uploads/certificate-templates/` and
used as the full-page background; the recipient name, event statement,
certificate number, verification link, and QR code are overlaid. Name and
statement positions are adjustable in millimetres, so the overlaid details can
line up with blank fields in the uploaded design. Signature lines are not added
on top of an uploaded design because the design is expected to contain its own
authorised signature areas. PNG, JPG, and WebP images up to 10 MB are accepted.

---

## 4. Color System

### Light Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#0F2A44` | Deep Institutional Blue — Headers, text headings, primary elements |
| **Secondary** | `#374151` | Dark Gray — Body text, secondary elements |
| **Accent** | `#C9A44C` | Muted Gold — Primary CTA buttons, links (restrained use) |
| **Background** | `#FFFFFF` | Pure White — Page background |
| **Surface** | `#FFFFFF` | White — Card backgrounds |
| **Text Primary** | `#1F2937` | Near-black — Main body text |
| **Text Secondary** | `#6B7280` | Medium gray — Labels, captions |
| **Border** | `rgba(0, 0, 0, 0.08)` | Light border — Dividers, card edges |
| **Error** | `#DC2626` | Red — Error states |
| **Success** | `#059669` | Green — Success states |
| **Warning** | `#D97706` | Orange — Warning states |

### Dark Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#0F2A44` | Deep Institutional Blue — Maintained from light mode |
| **Secondary** | `#374151` | Dark Gray — Maintained |
| **Accent** | `#C9A44C` | Muted Gold — CTA buttons (unchanged) |
| **Background** | `#1A1D23` | Very Dark Neutral — Page background |
| **Surface** | `#2A2E35` | Slightly Lighter — Card backgrounds (elevated from page) |
| **Text Primary** | `#F9FAFB` | Off-white — Main text |
| **Text Secondary** | `#9CA3AF` | Light gray — Labels, captions |
| **Border** | `rgba(255, 255, 255, 0.08)` | Subtle white border |

### Color Usage Rules

✅ **Gold Accent (C9A44C) is ONLY for:**
- Primary CTA buttons ("View Upcoming Events", "Register", "Sign In")
- Small emphasis icons (sparingly)
- Active link indicators (subtle)

❌ **Gold is NEVER used for:**
- Backgrounds
- Large text blocks
- Decorative elements

✅ **Primary Blue (#0F2A44) dominates:**
- Headers and navigation bars
- All major headings (h1-h6)
- Primary brand elements

✅ **No unauthorized colors:**
- No bright colors
- No pastels
- No neon or vibrant hues

---

## 5. Typography

### Font Family

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Alternatives (if Inter unavailable):**
- Source Sans Pro
- IBM Plex Sans
- System sans-serif stack

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| **H1 (Hero)** | 2.5rem (40px) | 700 | 1.3 | -0.02em |
| **H2 (Section)** | 2rem (32px) | 600 | 1.4 | -0.01em |
| **H3 (Subsection)** | 1.5rem (24px) | 600 | 1.4 | -0.01em |
| **H4 (Card Title)** | 1.25rem (20px) | 600 | 1.4 | 0 |
| **Body Large** | 1.125rem (18px) | 400 | 1.7 | 0 |
| **Body** | 1rem (16px) | 400 | 1.6 | 0 |
| **Caption** | 0.875rem (14px) | 400 | 1.5 | 0 |
| **Small** | 0.75rem (12px) | 400 | 1.4 | 0 |

### Typography Rules

✅ **Sans-serif ONLY** — No serifs, no decorative fonts  
✅ **No italics for headings** — Use weight differentiation instead  
✅ **Clear hierarchy** — Size and weight must guide the eye  
✅ **High contrast** — Text must be readable in all contexts  
✅ **No all-caps except for:** Small labels (e.g., "EVENT", "CERTIFICATE")

---

## 6. Layout & Spacing

### Container

```css
max-width: 1200px;
padding: 0 16px; /* Mobile */
padding: 0 24px; /* Tablet */
padding: 0 32px; /* Desktop */
```

### Spacing Scale (8px base unit)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon spacing, tight groups |
| `sm` | 8px | Element padding, small margins |
| `md` | 16px | Standard spacing between elements |
| `lg` | 24px | Section padding, card padding |
| `xl` | 32px | Large section padding |
| `2xl` | 48px | Major section spacing |
| `3xl` | 64px | Hero section padding |

### Grid System

- **Desktop:** 12-column grid
- **Tablet:** 8-column grid
- **Mobile:** 4-column grid

**Breakpoints:**
```javascript
xs: 0-599px    // Mobile portrait
sm: 600-959px  // Mobile landscape / Small tablet
md: 960-1279px // Tablet / Small desktop
lg: 1280-1919px // Desktop
xl: 1920px+    // Large desktop
```

---

## 7. Components

### 7.1 Header (Fixed Navigation)

**Structure:**
```
[Logo] [Spacer] [Navigation Links] [Theme Toggle] [Sign In Button]
```

**Specifications:**
- Height: `64px`
- Background: Deep Blue (`#0F2A44`)
- Logo: 40px height, 160px max-width
- Navigation links: White text, subtle underline on active (not boxy)
- Sign In button: Gold accent background

**Navigation Links:**
- Home
- Events
- My Events (authenticated only)
- Certificates (authenticated only)
- About CITAD

**Dark Mode:**
- Background: `#1A1D23`
- White logo variant

### 7.2 Hero Section

**Layout:**
```
[Background Photo (blurred + dark overlay)]
  [Text Column (7/12)]
    [Headline]
    [Subtext]
    [Primary CTA Button]
```

**Specifications:**
- Min-height: `500px`
- Background: Real photo of civic/educational event
- Overlay: `rgba(15, 42, 68, 0.85)` over photo
- Headline: 2.5rem, weight 700, white
- Subtext: 1.125rem, weight 400, white opacity 0.9
- CTA: Gold accent, x-large size, "View Upcoming Events"

**No:**
- Marketing slogans
- Decorative graphics
- Call-out boxes

### 7.3 Impact Statistics

**Layout:**
```
[4-column grid on desktop, 2-column on mobile]
  [Icon (subtle)]
  [Number (large, bold)]
  [Label (small)]
```

**Data Points:**
- 305 — Events Organized
- 12,400+ — Participants Engaged
- 9,800 — Certificates Issued
- 24 — Ongoing Programs

**Styling:**
- Icon: 32px, medium-emphasis (opacity 0.6)
- Number: H2 size, Deep Blue, weight 700
- Label: Caption size, medium-emphasis

**Purpose:** Credibility and factual trust-building

### 7.4 Event Cards

**Specifications:**
- Border: `1px solid rgba(0, 0, 0, 0.08)`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.05)` (maximum 1px)
- Border-radius: `4px` (Vuetify default)
- Hover: Border color changes to `rgba(15, 42, 68, 0.2)`

**Card Structure:**
```
[Event Image (200px height, cover)]
[Card Title (H6)]
[Card Subtitle]
  [Calendar Icon] Date | Time
  [Map Icon] Venue
[Card Text (truncated description)]
[Register Button (gold, full-width)]
```

**No:**
- Drop shadows over 1px
- Zoom effects
- Flip animations

### 7.5 Buttons

**Primary CTA (Gold):**
```vue
<v-btn 
  color="accent" 
  size="x-large" 
  elevation="0"
  class="px-8"
>
  View Upcoming Events
</v-btn>
```

**Secondary CTA (Outlined):**
```vue
<v-btn 
  variant="outlined" 
  color="primary"
  size="large"
>
  View All Events
</v-btn>
```

**Text Button:**
```vue
<v-btn 
  variant="text" 
  color="primary"
  append-icon="mdi-arrow-right"
>
  Learn more about CITAD
</v-btn>
```

**Rules:**
- No text-transform: uppercase
- Font-weight: 500
- Letter-spacing: normal (0)
- Transition: 0.2s ease (background-color only)

### 7.6 Footer

**Three-Column Layout:**

**Left (Supporting Brand):**
- meetCITAD symbol logo (32px)
- "Event Management System" caption

**Center (Links):**
- About CITAD
- Events
- Privacy Policy

**Right (Primary Brand):**
- CITAD full logo (48px height, 120px width)
- "Centre for Information Technology and Development"
- Copyright notice

**Styling:**
- Background: Surface color (auto theme-aware)
- Top border: 1px solid border-color
- Padding: 32px vertical

---

## 8. Icons & Imagery

### Icons

**Source:** Material Design Icons (MDI)  
**Style:** Line icons ONLY (outlined, not filled)  
**Stroke:** Consistent width across all icons  
**Size:** 24px standard, 32px for emphasis, 16px for inline

**Approved Icons:**
- `mdi-calendar-check` — Events
- `mdi-account-group` — Participants
- `mdi-certificate` — Certificates
- `mdi-school` — Programs
- `mdi-map-marker` — Location
- `mdi-clock-outline` — Time
- `mdi-weather-sunny` / `mdi-weather-night` — Theme toggle

**Never Use:**
- Filled/solid icons (except for specific brand logos)
- Cartoon icons
- 3D icons
- Emoji replacements

### Photography

**Approved Image Types:**
- Real photographs of CITAD events
- Training sessions and workshops
- Civic engagement activities
- Educational programs
- Community gatherings

**Image Treatment:**
- Real photos only (no stock illustrations)
- Slight blur for hero backgrounds
- Dark overlay: `rgba(15, 42, 68, 0.85)` for text legibility
- Consistent aspect ratios (16:9 for event cards, flexible for hero)

**Sources:**
- CITAD's own event photography (preferred)
- Institutional stock photos (e.g., Unsplash "conference", "workshop", "training")

**Never Use:**
- Playful illustrations
- Abstract graphics
- Marketing-style imagery
- Consumer product photography

---

## 9. Dark Mode Specifications

### Implementation

```javascript
// Theme toggle with localStorage persistence
const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.global.name.value)
}

// Load saved preference
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  theme.global.name.value = savedTheme
}
```

### Visual Differences

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page background | `#FFFFFF` | `#1A1D23` |
| Card surface | `#FFFFFF` | `#2A2E35` |
| Header background | `#0F2A44` | `#1A1D23` |
| Logo | `logo.png` | `logo-white.png` |
| Text primary | `#1F2937` | `#F9FAFB` |
| Hero overlay | `rgba(15, 42, 68, 0.85)` | `rgba(26, 29, 35, 0.9)` |

### Dark Mode Must Feel:
✅ **Intentional** — Not just inverted colors  
✅ **Calm** — Low contrast, no harsh whites  
✅ **Elevated** — Cards slightly lighter than background  
✅ **Consistent** — Gold accent unchanged, hierarchy maintained

---

## 10. PWA (Progressive Web App) Considerations

### Installable Web App

**manifest.json (required):**
```json
{
  "name": "meetCITAD - Event Management System",
  "short_name": "meetCITAD",
  "description": "CITAD's event management, registration, and certification system",
  "theme_color": "#0F2A44",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### App Icon

**Source:** Use `logo-symbol.png` (symbol only, no text)  
**Sizes Required:**
- 192x192 (minimum)
- 512x512 (recommended)
- 180x180 (iOS)
- 32x32 (favicon)

**Icon Design:**
- Flat, no shadows
- Transparent or solid background
- Minimum safe area: 80% of canvas
- No text (symbol only)

### Mobile Header Spacing

- Safe area insets respected
- Fixed header: 64px (consistent across devices)
- Touch targets: Minimum 44x44px (iOS guidelines)
- No app-store UI assumptions (this is web-first)

### Responsive Behavior

**Desktop (1280px+):**
- Full navigation visible
- 3-column event grid
- Hero section with 2-column layout

**Tablet (960-1279px):**
- Condensed navigation
- 2-column event grid
- Hero section stacked

**Mobile (<960px):**
- Hamburger menu (if needed)
- 1-column event grid
- Hero section fully stacked
- Increased touch targets

---

## 11. Animation & Transitions

### Global Animation Policy

**Disabled:** All flashy animations  
**Allowed:** Subtle state changes only

```css
* {
  animation-duration: 0s !important;
  transition-duration: 0.2s !important;
}
```

### Approved Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Button hover | `background-color` | 0.2s | ease |
| Card hover | `border-color` | 0.2s | ease |
| Navigation link | `opacity` | 0.2s | ease |
| Theme toggle | `color` | 0.2s | ease |

### Prohibited Animations

❌ **Never use:**
- Slide-in effects
- Fade-in delays
- Bouncing elements
- Rotating loaders (use progress spinners only)
- Parallax scrolling
- Zoom/scale effects
- 3D transforms

**Reason:** Institutional systems must feel calm, predictable, and fast.

---

## 12. Accessibility Standards

### WCAG 2.1 Level AA Compliance (Minimum)

**Color Contrast:**
- Text on background: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Keyboard Navigation:**
- All interactive elements must be keyboard-accessible
- Visible focus indicators (subtle outline)
- Logical tab order

**Screen Readers:**
- Semantic HTML5 elements
- ARIA labels where needed
- Alt text for all images

**Current Implementation:**
```vue
<!-- Example: Proper semantic structure -->
<v-btn 
  aria-label="View upcoming events" 
  role="button"
>
  View Upcoming Events
</v-btn>
```

---

## 13. Landing Page Structure (Complete)

### Full Layout (Top to Bottom)

1. **Header (Fixed)**
   - Logo (left)
   - Navigation (center)
   - Theme toggle + Sign In (right)

2. **Hero Section**
   - Headline: "Empowering communities..."
   - Subtext: Registration explanation
   - Primary CTA: "View Upcoming Events"

3. **Impact Statistics**
   - 4 metrics in horizontal row
   - Icons + Numbers + Labels

4. **Section Divider** (thin, opacity 0.1)

5. **Upcoming Events**
   - Title + "View All Events" link
   - 3 event cards in grid
   - Empty state if no events

6. **Section Divider**

7. **Secondary CTA**
   - Outlined "View All Events" button

8. **Section Divider**

9. **About CITAD Preview**
   - Light gray background (#FAFBFC)
   - Centered text (max-width 8 columns)
   - Mission description
   - "Learn more" link

10. **Footer**
    - meetCITAD logo (left)
    - Links (center)
    - CITAD logo + copyright (right)

### No Extra Sections

❌ **Do NOT add:**
- Testimonials section
- Partner logos carousel
- Newsletter signup
- Social media feeds
- Blog previews
- Pricing tables
- Feature comparison

**Keep it institutional, focused, and mission-driven.**

---

## 14. Design System Implementation

### Frontend Stack

**Framework:** Vue 3 (Composition API)  
**UI Library:** Vuetify 3  
**Build Tool:** Vite  
**State Management:** Pinia  
**Routing:** Vue Router 4

### Theme Configuration (Vuetify)

Located in: `frontend-user/src/plugins/vuetify.js`

```javascript
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#0F2A44',
          secondary: '#374151',
          accent: '#C9A44C',
          background: '#FFFFFF',
          surface: '#FFFFFF',
        },
      },
      dark: {
        colors: {
          primary: '#0F2A44',
          secondary: '#374151',
          accent: '#C9A44C',
          background: '#1A1D23',
          surface: '#2A2E35',
        },
      },
    },
  },
})
```

### Global Styles

Located in: `frontend-user/src/assets/main.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Institutional card shadows - maximum 1px */
.v-card {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
}

/* No flashy animations */
* {
  animation-duration: 0s !important;
  transition-duration: 0.2s !important;
}
```

---

## 15. Future Pages (Design Continuity)

### Events List Page
- Same header/footer
- Filtering sidebar (search, category, status)
- Event cards in grid (same as landing page)
- Pagination (simple numbered)

### Event Details Page
- Hero section with event banner
- Two-column layout: Info (left), Registration (right)
- Agenda section
- Venue details with map
- QR code display after registration

### My Events Page
- Tabs: Registered / Attended
- Event cards with status chips
- QR codes for upcoming events
- Empty states for each tab

### Profile Page
- Form layout (not fancy)
- Profile picture upload (circular, 120px)
- Edit fields: Name, Email, Phone, Organisation
- Password change section
- Save button (gold accent)

### Certificates Gallery
- Grid of certificate thumbnails
- Download button per certificate
- Print preview
- Empty state: "No certificates yet"

### Notifications Center
- List layout
- Unread indicator (subtle blue dot)
- Timestamp (relative, e.g., "2 hours ago")
- Mark as read functionality

**All pages must maintain:**
- Same header and footer
- Same color palette
- Same typography
- Same component styling
- Same institutional feel

---

## 16. Brand Guidelines Compliance Checklist

### Before Launch (Critical)

- [ ] CITAD logo is more prominent than meetCITAD in footer
- [ ] All logos are flat (no shadows, no 3D)
- [ ] No gradients anywhere in the UI
- [ ] No flashy animations (max 0.2s transitions)
- [ ] Card shadows are 1px maximum
- [ ] Gold accent is used sparingly (only CTAs and small emphasis)
- [ ] Primary blue (#0F2A44) dominates headings and navigation
- [ ] Inter font is loaded and applied globally
- [ ] Dark mode uses white logo variant in header
- [ ] Hero section uses real photograph (not illustration)
- [ ] Icons are line-based (not filled)
- [ ] All interactive elements are keyboard-accessible
- [ ] Section dividers are subtle (opacity 0.1)
- [ ] Typography hierarchy is consistent across pages
- [ ] Mobile spacing is adequate (minimum touch targets 44x44px)

### Ongoing Maintenance

- [ ] Review all new pages for design system compliance
- [ ] Test dark mode on every new component
- [ ] Verify logo usage in new contexts
- [ ] Ensure new colors are not introduced without approval
- [ ] Document any design system updates in this file

---

## 17. Contact & Governance

**Design System Owner:** Frontend Architecture Team  
**Brand Approvals:** CITAD Communications Team  
**Technical Questions:** Project Lead / Senior Developer

**Update Process:**
1. Propose changes via pull request
2. Include rationale and visual examples
3. Require approval from design system owner
4. Update this documentation immediately

**Violations:**
Any deviation from this design system without approval may be rejected during code review.

---

## 18. Quick Reference

### Color Hex Codes (Copy-Paste)

```
Primary (Deep Blue): #0F2A44
Secondary (Dark Gray): #374151
Accent (Muted Gold): #C9A44C
Light Background: #FFFFFF
Dark Background: #1A1D23
Dark Surface: #2A2E35
```

### Common Vuetify Classes

```vue
<!-- Primary CTA -->
<v-btn color="accent" size="x-large" elevation="0">

<!-- Section Spacing -->
<v-container class="py-16">

<!-- Card with proper shadow -->
<v-card elevation="1">

<!-- Text emphasis -->
<span class="text-medium-emphasis">
```

### Logo Import Examples

```vue
<!-- Header logo with theme switching -->
<v-img 
  :src="theme.global.name.value === 'dark' 
    ? require('@/assets/images/logo-white.png') 
    : require('@/assets/images/logo.png')" 
  max-height="40"
  contain
></v-img>

<!-- Footer CITAD logo -->
<v-img 
  :src="require('@/assets/images/citad-logo.png')" 
  max-height="48"
  contain
></v-img>
```

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | Dec 17, 2025 | Complete design system documentation, brand hierarchy, PWA specs | Frontend Team |
| 1.0 | Nov 2025 | Initial brand guidelines | CITAD Team |

---

**END OF DESIGN SYSTEM DOCUMENTATION**

This document is the single source of truth for all design decisions in meetCITAD.  
All developers, designers, and stakeholders must refer to this document when building or reviewing UI components.
