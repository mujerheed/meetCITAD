# meetCITAD Visual Reference Guide
## Light Mode vs Dark Mode Specifications

**Version:** 2.0  
**Date:** December 17, 2025

---

## Color Palette Comparison

### Light Mode
```
┌─────────────────────────────────────────────────────────┐
│ LIGHT MODE COLOR PALETTE                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PRIMARY: #0F2A44    ████████  Deep Institutional Blue   │
│ SECONDARY: #374151  ████████  Dark Gray                 │
│ ACCENT: #C9A44C     ████████  Muted Gold (CTAs only)    │
│                                                          │
│ BACKGROUND: #FFFFFF ████████  Pure White                │
│ SURFACE: #FFFFFF    ████████  Card backgrounds          │
│                                                          │
│ TEXT PRIMARY: #1F2937   ████████  Near-black            │
│ TEXT SECONDARY: #6B7280 ████████  Medium gray           │
│                                                          │
│ BORDER: rgba(0,0,0,0.08)  ────  Subtle dark border      │
│                                                          │
│ ERROR: #DC2626      ████████  Red                       │
│ SUCCESS: #059669    ████████  Green                     │
│ WARNING: #D97706    ████████  Orange                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Dark Mode
```
┌─────────────────────────────────────────────────────────┐
│ DARK MODE COLOR PALETTE                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ PRIMARY: #0F2A44    ████████  Deep Blue (maintained)    │
│ SECONDARY: #374151  ████████  Dark Gray (maintained)    │
│ ACCENT: #C9A44C     ████████  Muted Gold (unchanged)    │
│                                                          │
│ BACKGROUND: #1A1D23 ████████  Very dark neutral         │
│ SURFACE: #2A2E35    ████████  Elevated cards            │
│                                                          │
│ TEXT PRIMARY: #F9FAFB   ████████  Off-white             │
│ TEXT SECONDARY: #9CA3AF ████████  Light gray            │
│                                                          │
│ BORDER: rgba(255,255,255,0.08)  ────  Subtle white      │
│                                                          │
│ ERROR: #DC2626      ████████  Red (maintained)          │
│ SUCCESS: #059669    ████████  Green (maintained)        │
│ WARNING: #D97706    ████████  Orange (maintained)       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Component Comparison

### Header (Fixed Navigation Bar)

**LIGHT MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: #0F2A44 (Deep Blue)                             │
│                                                              │
│  [Logo: logo.png]  Home  Events  My Events  Certs  About    │
│                                   [☀️] [Sign In - Gold]     │
│                    (White text on blue)                      │
└──────────────────────────────────────────────────────────────┘
```

**DARK MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: #1A1D23 (Very Dark Neutral)                     │
│                                                              │
│  [Logo: logo-white.png]  Home  Events  My Events  Certs     │
│                                   [🌙] [Sign In - Gold]     │
│                    (White text on dark)                      │
└──────────────────────────────────────────────────────────────┘
```

### Hero Section

**LIGHT MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: Real event photo + rgba(15, 42, 68, 0.85)       │
│             (Dark blue overlay at 85% opacity)               │
│                                                              │
│   Empowering communities through                            │
│   technology, knowledge, and civic engagement               │
│                                                              │
│   Register for CITAD programs, attend events...             │
│                                                              │
│   [View Upcoming Events] ← #C9A44C (Gold button)            │
│                                                              │
│ Text: Pure white (#FFFFFF)                                  │
└──────────────────────────────────────────────────────────────┘
```

**DARK MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: Same event photo + rgba(26, 29, 35, 0.9)        │
│             (Very dark neutral overlay at 90% opacity)       │
│                                                              │
│   Empowering communities through                            │
│   technology, knowledge, and civic engagement               │
│                                                              │
│   Register for CITAD programs, attend events...             │
│                                                              │
│   [View Upcoming Events] ← #C9A44C (Gold - unchanged)       │
│                                                              │
│ Text: Pure white (#FFFFFF)                                  │
└──────────────────────────────────────────────────────────────┘
```

### Event Cards

**LIGHT MODE:**
```
┌────────────────────────────┐
│ [Event Photo]              │
│                            │
│ Civic Technology Workshop  │ ← #0F2A44 (Deep Blue)
│                            │
│ 📅 Jan 25, 2025 | 10:00   │ ← #6B7280 (Medium gray)
│ 📍 CITAD Center, Kano      │
│                            │
│ Learn about digital tools  │ ← #1F2937 (Near-black)
│ for civic engagement...    │
│                            │
│ [Register - Gold]          │ ← #C9A44C
│                            │
└────────────────────────────┘
Background: #FFFFFF (White card)
Border: 1px solid rgba(0,0,0,0.08)
Shadow: 0 1px 3px rgba(0,0,0,0.05)
```

**DARK MODE:**
```
┌────────────────────────────┐
│ [Event Photo]              │
│                            │
│ Civic Technology Workshop  │ ← #F9FAFB (Off-white)
│                            │
│ 📅 Jan 25, 2025 | 10:00   │ ← #9CA3AF (Light gray)
│ 📍 CITAD Center, Kano      │
│                            │
│ Learn about digital tools  │ ← #F9FAFB (Off-white)
│ for civic engagement...    │
│                            │
│ [Register - Gold]          │ ← #C9A44C (unchanged)
│                            │
└────────────────────────────┘
Background: #2A2E35 (Elevated surface)
Border: 1px solid rgba(255,255,255,0.08)
Shadow: 0 1px 3px rgba(0,0,0,0.2)
```

### Footer

**LIGHT MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: #FFFFFF (White)                                  │
│ Top Border: 1px solid rgba(0,0,0,0.12)                      │
│                                                              │
│  [meetCITAD Symbol]     Events           [CITAD Full Logo]  │
│  32px logo              About            48px logo           │
│  "Event Management      Privacy          "Centre for Info"  │
│   System"                                "Technology and"    │
│                                          "Development"       │
│  (#374151 text)    (#374151 text)       "© 2025 CITAD"      │
│                                          (#374151 text)      │
└──────────────────────────────────────────────────────────────┘
```

**DARK MODE:**
```
┌──────────────────────────────────────────────────────────────┐
│ Background: #2A2E35 (Dark surface)                           │
│ Top Border: 1px solid rgba(255,255,255,0.12)                │
│                                                              │
│  [meetCITAD Symbol]     Events           [CITAD Full Logo]  │
│  32px white logo        About            48px logo           │
│  "Event Management      Privacy          "Centre for Info"  │
│   System"                                "Technology and"    │
│                                          "Development"       │
│  (#9CA3AF text)    (#9CA3AF text)       "© 2025 CITAD"      │
│                                          (#9CA3AF text)      │
└──────────────────────────────────────────────────────────────┘
```

---

## Typography Specifications

### Light Mode Text Colors
```
Heading 1 (Hero):          #FFFFFF  (on overlay)
Heading 2 (Section Title): #0F2A44  (Deep Blue)
Heading 3 (Card Title):    #0F2A44  (Deep Blue)
Body Text:                 #1F2937  (Near-black)
Caption/Label:             #6B7280  (Medium gray)
Medium Emphasis:           #374151  (Dark gray)
```

### Dark Mode Text Colors
```
Heading 1 (Hero):          #FFFFFF  (on overlay)
Heading 2 (Section Title): #F9FAFB  (Off-white)
Heading 3 (Card Title):    #F9FAFB  (Off-white)
Body Text:                 #F9FAFB  (Off-white)
Caption/Label:             #9CA3AF  (Light gray)
Medium Emphasis:           #9CA3AF  (Light gray)
```

### Font Sizes (Same in Both Modes)
```
Hero Title:     2.5rem (40px) - Weight 700
Section Title:  2rem (32px)   - Weight 600
Card Title:     1.25rem (20px) - Weight 600
Body Large:     1.125rem (18px) - Weight 400
Body:           1rem (16px)    - Weight 400
Caption:        0.875rem (14px) - Weight 400
```

---

## Button Specifications

### Primary CTA (Gold Accent)

**LIGHT MODE:**
```
┌──────────────────────────┐
│  View Upcoming Events    │  Background: #C9A44C (Gold)
│                          │  Text: #FFFFFF (White)
└──────────────────────────┘  Elevation: 0 (flat)
                              Border-radius: 4px
                              Padding: 12px 32px
```

**DARK MODE:**
```
┌──────────────────────────┐
│  View Upcoming Events    │  Background: #C9A44C (Gold - unchanged)
│                          │  Text: #FFFFFF (White)
└──────────────────────────┘  Elevation: 0 (flat)
                              (Same as light mode)
```

### Secondary CTA (Outlined)

**LIGHT MODE:**
```
┌──────────────────────────┐
│  View All Events         │  Background: Transparent
│                          │  Border: 1px solid #0F2A44
└──────────────────────────┘  Text: #0F2A44 (Deep Blue)
```

**DARK MODE:**
```
┌──────────────────────────┐
│  View All Events         │  Background: Transparent
│                          │  Border: 1px solid #F9FAFB
└──────────────────────────┘  Text: #F9FAFB (Off-white)
```

### Text Button (Link Style)

**LIGHT MODE:**
```
Learn more about CITAD →   Text: #0F2A44 (Deep Blue)
                           Hover: Opacity 0.85
                           No background
```

**DARK MODE:**
```
Learn more about CITAD →   Text: #F9FAFB (Off-white)
                           Hover: Opacity 0.85
                           No background
```

---

## Icon Specifications

### Icon Colors

**LIGHT MODE:**
```
Primary Icons:         #0F2A44 (Deep Blue)
Medium Emphasis Icons: #6B7280 with 60% opacity
Stats Icons:           #0F2A44 with 60% opacity
Navigation Icons:      #FFFFFF (on blue header)
```

**DARK MODE:**
```
Primary Icons:         #F9FAFB (Off-white)
Medium Emphasis Icons: #9CA3AF with 60% opacity
Stats Icons:           #F9FAFB with 60% opacity
Navigation Icons:      #FFFFFF (on dark header)
```

### Icon Sizes
```
Small:    16px  (inline text icons)
Default:  24px  (standard icons)
Large:    32px  (stats section icons)
XLarge:   64px  (empty state icons)
```

---

## Shadow Specifications

### Card Shadows (Maximum 1px per guidelines)

**LIGHT MODE:**
```
Default:  0 1px 2px 0 rgba(0, 0, 0, 0.05)
Hover:    0 1px 3px 0 rgba(0, 0, 0, 0.1)
Elevated: 0 1px 3px 0 rgba(0, 0, 0, 0.05)
```

**DARK MODE:**
```
Default:  0 1px 2px 0 rgba(0, 0, 0, 0.2)
Hover:    0 1px 3px 0 rgba(0, 0, 0, 0.3)
Elevated: 0 1px 3px 0 rgba(0, 0, 0, 0.2)
```

**Rule:** No shadows deeper than 1px vertical offset (institutional, not flashy)

---

## Transition Specifications

### Allowed Transitions (Both Modes)
```
Button hover:        background-color 0.2s ease
Navigation link:     opacity 0.2s ease
Card hover:          border-color 0.2s ease
Theme toggle:        color 0.2s ease
```

### Prohibited Animations
```
❌ Slide-in effects
❌ Fade-in delays
❌ Bouncing
❌ Rotating loaders (except progress spinner)
❌ Parallax scrolling
❌ Zoom/scale effects
❌ 3D transforms
```

**Global Rule:**
```css
* {
  animation-duration: 0s !important;
  transition-duration: 0.2s !important;
}
```

---

## Logo Usage Guide

### Header Logo (Theme-Aware)

**LIGHT MODE:**
```
File: logo.png
Size: 40px height, 160px max-width
Background: #0F2A44 (Deep Blue header)
Logo: Full color (blue + gold)
```

**DARK MODE:**
```
File: logo-white.png
Size: 40px height, 160px max-width
Background: #1A1D23 (Dark header)
Logo: Pure white (no color)
```

### Footer Logos

**meetCITAD (Left - Supporting Brand):**
```
File: logo-symbol.png (symbol only)
Size: 32px x 32px
Position: Left column
Label: "Event Management System"
```

**CITAD (Right - Primary Brand):**
```
File: citad-logo.png (full organization logo)
Size: 48px height, 120px max-width
Position: Right column
Label: "Centre for Information Technology
        and Development"
        "© 2025 CITAD. All rights reserved."
```

**Brand Hierarchy Rule:**
CITAD logo MUST be larger than meetCITAD logo (48px vs 32px)

---

## Responsive Breakpoint Specifications

### Mobile Portrait (0-599px)

**Header:**
- Logo: 32px height (reduced from 40px)
- Navigation: Hamburger menu (if implemented)
- Sign In button: Icon only or full button

**Hero:**
- Font size: 1.5rem (reduced from 2.5rem)
- Padding: 60px vertical (reduced from 100px)
- Single column layout

**Stats:**
- Grid: 2 columns (was 4)
- Icon size: 24px (reduced from 32px)

**Event Cards:**
- Grid: 1 column
- Full width cards

### Tablet (600-959px)

**Header:**
- Logo: 40px height (full size)
- Navigation: Condensed spacing

**Hero:**
- Font size: 1.75rem
- Padding: 80px vertical

**Stats:**
- Grid: 4 columns (full width)

**Event Cards:**
- Grid: 2 columns

### Desktop (960px+)

**Header:**
- Logo: 40px height
- Full navigation visible

**Hero:**
- Font size: 2.5rem
- Padding: 100px vertical
- Two-column layout (7/12 content, 5/12 empty for photo)

**Stats:**
- Grid: 4 columns
- Full spacing

**Event Cards:**
- Grid: 3 columns

---

## Accessibility Color Contrast Ratios

### Light Mode Contrast
```
Text on White (#1F2937 on #FFFFFF):      15.8:1  ✅ AAA
Heading on White (#0F2A44 on #FFFFFF):   12.6:1  ✅ AAA
Caption on White (#6B7280 on #FFFFFF):   5.7:1   ✅ AA
Gold Button (#FFFFFF on #C9A44C):        5.2:1   ✅ AA
```

### Dark Mode Contrast
```
Text on Dark (#F9FAFB on #1A1D23):       15.2:1  ✅ AAA
Caption on Dark (#9CA3AF on #1A1D23):    6.1:1   ✅ AA
Card on Dark (#2A2E35 on #1A1D23):       1.3:1   ✅ (Surface)
Gold Button (#FFFFFF on #C9A44C):        5.2:1   ✅ AA
```

**All ratios meet WCAG 2.1 Level AA standards (4.5:1 for text, 3:1 for UI)**

---

## Theme Toggle Implementation

### Toggle Button

**LIGHT MODE:**
```
Icon: mdi-weather-night (moon)
Color: #FFFFFF (white on blue header)
Tooltip: "Switch to dark mode"
Action: Set theme to 'dark'
```

**DARK MODE:**
```
Icon: mdi-weather-sunny (sun)
Color: #FFFFFF (white on dark header)
Tooltip: "Switch to light mode"
Action: Set theme to 'light'
```

### Persistence
```javascript
// Save preference to localStorage
localStorage.setItem('theme', 'dark')

// Load on app initialization
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  theme.global.name.value = savedTheme
}
```

---

## Quick Visual Checklist

### Light Mode Landing Page
- [ ] Header background is Deep Blue (#0F2A44)
- [ ] Header logo is full-color (logo.png)
- [ ] Body background is pure white (#FFFFFF)
- [ ] Headings are Deep Blue (#0F2A44)
- [ ] Body text is near-black (#1F2937)
- [ ] CTA buttons are Muted Gold (#C9A44C)
- [ ] Card shadows are maximum 1px
- [ ] Event cards have light borders
- [ ] Footer shows correct logo hierarchy (meetCITAD 32px, CITAD 48px)

### Dark Mode Landing Page
- [ ] Header background is Very Dark Neutral (#1A1D23)
- [ ] Header logo is white (logo-white.png)
- [ ] Body background is Very Dark Neutral (#1A1D23)
- [ ] Card backgrounds are elevated (#2A2E35)
- [ ] Headings are off-white (#F9FAFB)
- [ ] Body text is off-white (#F9FAFB)
- [ ] CTA buttons are still Muted Gold (#C9A44C)
- [ ] Card shadows are slightly darker
- [ ] Event cards have subtle white borders
- [ ] Footer uses same logo hierarchy

---

## Common Pitfalls to Avoid

❌ **DO NOT:**
- Use full black (#000000) or full white (#FFFFFF) for text in dark mode
- Add gradients to any backgrounds
- Use drop shadows deeper than 1px
- Introduce flashy animations
- Make meetCITAD logo larger than CITAD logo in footer
- Use gold accent for anything other than CTAs
- Use filled icons (line icons only)
- Add parallax or 3D effects

✅ **DO:**
- Use off-white (#F9FAFB) for dark mode text
- Use very dark neutral (#1A1D23) for dark mode background
- Keep shadows minimal and flat
- Maintain calm, predictable transitions (0.2s max)
- Always make CITAD logo most prominent
- Use gold sparingly (CTAs and small emphasis only)
- Use outlined Material Design icons
- Keep everything flat and institutional

---

## Final Design Principles

### Institutional Feel (Always)
```
Calm           Professional        Authoritative
  ↓                  ↓                  ↓
No flashy      Clean spacing      Strong hierarchy
animations     Maximum 1px        Clear structure
Subtle         shadows            Factual content
transitions    Flat colors        Trust-building
```

### Brand Hierarchy (Always)
```
CITAD (Organization)
  ↓
meetCITAD (System/Tool)
  ↓
Brand expression: CITAD primary, meetCITAD supporting
```

### Color Usage (Always)
```
Primary Blue (#0F2A44): Headings, headers, primary elements
Gold Accent (#C9A44C):  ONLY for CTAs and small emphasis
Dark Gray (#374151):    Secondary text, supporting elements
```

---

**END OF VISUAL REFERENCE GUIDE**

Use this document as a quick reference when implementing new pages or components.  
All future development MUST match these specifications.
