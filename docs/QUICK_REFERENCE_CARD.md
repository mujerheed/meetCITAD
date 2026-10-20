# meetCITAD Design Quick Reference Card

**For Developers: Print This & Keep at Your Desk** 📌

---

## ⚡ Golden Rules (NEVER VIOLATE)

```
1. CITAD > meetCITAD (Always)
2. Maximum 1px shadows
3. No gradients, no glassmorphism
4. No flashy animations (0.2s max)
5. Gold (#C9A44C) ONLY for CTAs
6. Inter font only
7. Line icons only (no filled)
8. Real photos only (no illustrations)
```

---

## 🎨 Color Palette (Copy-Paste Ready)

### Light Mode
```css
primary:    #0F2A44  /* Deep Blue - headers, headings */
secondary:  #374151  /* Dark Gray - supporting */
accent:     #C9A44C  /* Gold - CTAs ONLY */
background: #FFFFFF  /* White */
text:       #1F2937  /* Near-black */
```

### Dark Mode
```css
primary:    #0F2A44  /* Same */
accent:     #C9A44C  /* Same */
background: #1A1D23  /* Very dark */
surface:    #2A2E35  /* Cards */
text:       #F9FAFB  /* Off-white */
```

---

## 📏 Typography Scale

```css
Hero:    2.5rem (40px) - weight 700
H2:      2rem (32px)   - weight 600
H3:      1.5rem (24px) - weight 600
H4:      1.25rem (20px)- weight 600
Body:    1rem (16px)   - weight 400
Caption: 0.875rem (14px)- weight 400
```

---

## 🖼️ Logo Usage

```vue
<!-- Header (theme-aware) -->
<v-img 
  :src="theme.global.name.value === 'dark' 
    ? require('@/assets/images/logo-white.png') 
    : require('@/assets/images/logo.png')" 
  max-height="40"
  contain
/>

<!-- Footer Left (meetCITAD - 32px) -->
<v-img src="@/assets/images/logo-symbol.png" max-height="32" />

<!-- Footer Right (CITAD - 48px) -->
<v-img src="@/assets/images/citad-logo.png" max-height="48" />
```

---

## 🔘 Button Variants

```vue
<!-- Primary CTA (Gold) -->
<v-btn color="accent" size="x-large" elevation="0">

<!-- Secondary (Outlined) -->
<v-btn variant="outlined" color="primary">

<!-- Text Link -->
<v-btn variant="text" color="primary" append-icon="mdi-arrow-right">
```

---

## 📦 Card Styling

```css
/* Maximum 1px shadow (STRICT) */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
border: 1px solid rgba(0, 0, 0, 0.08);
border-radius: 4px;

/* Dark mode */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
border: 1px solid rgba(255, 255, 255, 0.08);
```

---

## 🚫 Prohibited List

```
❌ Filled icons (use mdi-*-outline)
❌ Gradients (use flat colors)
❌ Animations > 0.2s
❌ Shadows > 1px vertical
❌ Colors not in palette
❌ Serifs or decorative fonts
❌ meetCITAD logo > CITAD logo
❌ Gold backgrounds (buttons only)
```

---

## ✅ Spacing Scale (8px base)

```
xs:   4px   (tight spacing)
sm:   8px   (element padding)
md:   16px  (standard spacing)
lg:   24px  (section padding)
xl:   32px  (large sections)
2xl:  48px  (major sections)
3xl:  64px  (hero padding)
```

---

## 📱 Breakpoints

```javascript
xs: 0-599px     // Mobile portrait
sm: 600-959px   // Mobile landscape
md: 960-1279px  // Tablet
lg: 1280-1919px // Desktop
xl: 1920px+     // Large desktop
```

---

## 🎯 Icon Sizes

```
16px - Inline text
24px - Standard
32px - Stats/emphasis
64px - Empty states
```

---

## 🌙 Theme Toggle

```javascript
// Toggle function
const toggleTheme = () => {
  theme.global.name.value = 
    theme.global.name.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.global.name.value)
}

// Load saved
const savedTheme = localStorage.getItem('theme')
if (savedTheme) theme.global.name.value = savedTheme
```

---

## 📐 Container Max-Width

```css
max-width: 1200px;  /* Always */
```

---

## 🔗 Quick Links

```
Design System:    docs/DESIGN_SYSTEM.md
Implementation:   docs/LANDING_PAGE_IMPLEMENTATION.md
Visual Reference: docs/VISUAL_REFERENCE_GUIDE.md
Summary:          docs/FRONTEND_COMPLETE_SUMMARY.md
```

---

## 🚀 Dev Commands

```bash
pnpm dev            # Start dev server (port 5173)
pnpm build          # Build for production
./generate-icons.sh # Generate PWA icons
```

---

## ✨ Component Checklist

Before committing any component, verify:

- [ ] Uses colors from palette only
- [ ] Maximum 1px shadow
- [ ] Inter font applied
- [ ] No transitions > 0.2s
- [ ] Works in dark mode
- [ ] Responsive (mobile tested)
- [ ] WCAG AA contrast ratios
- [ ] Icons are outlined (not filled)
- [ ] Keyboard accessible
- [ ] Brand hierarchy respected

---

## 🏆 Brand Hierarchy (Memorize)

```
     CITAD
       ↓
  (Organization)
       ↓
   meetCITAD
       ↓
    (System)

Footer: CITAD (48px) > meetCITAD (32px)
```

---

## 💡 When In Doubt...

1. Check `docs/DESIGN_SYSTEM.md`
2. Look at existing `Home.vue`
3. Test in dark mode
4. Verify logo sizes
5. Ask before adding new colors

---

**Print Date:** December 17, 2025  
**Version:** 2.0  
**Status:** Production Ready ✅

---

**Keep this card visible while coding!**  
**Consistency is key to institutional design.**
