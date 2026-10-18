---
name: Contacts App Offline
description: Private, offline contacts manager that follows native iOS conventions and lets dense personal data lead.
colors:
  accent: "#0066D6"
  accent-dark: "#0A84FF"
  destructive: "#FF3B30"
  destructive-dark: "#FF453A"
  success: "#34C759"
  success-dark: "#30D158"
  birthday-amber: "#F5A623"
  bg: "#F2F2F7"
  bg-dark: "#000000"
  surface: "#FFFFFF"
  surface-dark: "#1C1C1E"
  surface-elevated-dark: "#2C2C2E"
  text: "#090909"
  text-dark: "#F5F5F5"
  text-secondary: "#6C6C70"
  text-secondary-dark: "#98989D"
  text-tertiary: "#C7C7CC"
  text-tertiary-dark: "#636366"
  separator: "#C6C6C8"
  separator-dark: "#38383A"
  input-border: "#E5E5EA"
  card-birthday: "#FFF8EE"
  card-birthday-dark: "#291D00"
typography:
  title:
    fontFamily: "System"
    fontSize: "17px"
    fontWeight: 600
  card-title:
    fontFamily: "System"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "0"
  body:
    fontFamily: "System"
    fontSize: "17px"
    fontWeight: 400
  label:
    fontFamily: "System"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.2px"
  caption:
    fontFamily: "System"
    fontSize: "11px"
    fontWeight: 400
rounded:
  sm: "10px"
  md: "12px"
  lg: "14px"
  pill: "14px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  button-save:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "13px"
  button-cancel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "13px"
  button-add:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
    height: "48px"
---

# Design System: Contacts App Offline

## Overview

**Creative North Star: "The Quiet Ledger"**

A private ledger that records everything about a person and says nothing about itself. The interface borrows the system's own vocabulary (iOS grouped backgrounds, system blue, system font) so the user recognizes patterns instead of learning a brand. Data is the protagonist; chrome exists only to separate and label it.

Density is handled with stacked white cards on a grey ground, short labels and hairline separators, not with modals or steps. Warmth appears in exactly one place, the amber birthday treatment, which makes it a signal rather than decoration.

**Key Characteristics:**
- Native-feeling: iOS palette, system font, hairline separators.
- Flat at rest: depth comes from tonal layering (white on grey), with only a faint shadow in light mode.
- One accent (system blue) for every interactive affordance.
- Light and dark themes with parallel tokens; dark is a licensed feature.
- Touch targets of at least 48px on every actionable element.

## Colors

Restrained palette: iOS neutrals plus one blue accent; semantic red and green only for state.

### Primary
- **System Blue** (#0066D6 light, #0A84FF dark): every tappable element, tab icons and labels, "add" affordances, and the primary save button. Tinted at 10% (light) or 16% (dark) for the add-button background.

### Secondary
- **Birthday Amber** (#F5A623): birthday dots and the birthday card border. Its card ground is a pale cream (#FFF8EE) in light and a deep brown (#291D00) in dark.

### Neutral
- **Grouped Grey** (#F2F2F7 light, #000000 dark): screen and modal ground.
- **Card White** (#FFFFFF light, #1C1C1E dark): cards, inputs, tab bar. Elevated dark surface is #2C2C2E.
- **Ink** (#090909 light, #F5F5F5 dark): primary text.
- **Secondary Grey** (#6C6C70 light, #98989D dark): field labels, empty-state text, captions in both themes.
- **Tertiary Grey** (#C7C7CC light, #636366 dark): disabled controls, placeholders.
- **Hairline** (#C6C6C8 light, #38383A dark): separators and the tab bar top border.
- **Destructive Red** (#FF3B30 light, #FF453A dark) and **Success Green** (#34C759 light, #30D158 dark): state only.

### Named Rules
**The One Voice Rule.** System blue is the only accent. Red and green mark state, amber marks birthdays; none of them decorate.

**The Native Palette Rule.** New colors come from the iOS system palette. A custom brand hue would break the "part of the OS" promise.

## Typography

**Display Font:** System (San Francisco / Roboto / platform default)
**Body Font:** System
**Label/Mono Font:** none

**Character:** The platform's own font at modest weights. No custom family is loaded, so the app inherits the user's accessibility and language settings.

### Hierarchy
- **Title** (600, 17px): modal titles, desktop card titles.
- **Card title** (600, 15px mobile / 16px tablet / 17px desktop, letter-spacing 0): section heading inside each detail card.
- **Body** (400, 17px): input text and list content.
- **Label** (600, 13px, 0.2px tracking): form field labels in Secondary Grey. Sentence case.
- **Caption** (400, 11px): tab bar labels.

### Named Rules
**The System Font Rule.** Do not add a custom typeface. Hierarchy comes from weight (400 vs 600) and size steps.

## Layout

Single-column stack on mobile. At 640px and above cards wrap into rows (12px gap); at 1024px and above the gap grows to 16px, the bottom tab bar is hidden on web, and modals center with a max width of 540px (tablet) or 600px (desktop). Card padding steps 16, 18, 20px by breakpoint. Cards are separated by 12px vertical margin. Content is dense by default: fields sit inside a card instead of opening a new screen.

## Elevation & Depth

Tonal layering first: white cards on the grouped grey ground. Light mode adds a barely visible shadow (offset 0/1, radius 4, opacity 0.06; elevation 1 on Android). Dark mode drops shadows entirely (opacity 0) and relies on the surface step from #000000 to #1C1C1E to #2C2C2E. Modals dim the ground with a 40% (light) or 65% (dark) black overlay.

### Named Rules
**The Flat-By-Default Rule.** No shadow is stronger than 0.10 opacity. Depth is a surface step, not a drop shadow.

## Shapes

Soft but restrained: 12px for cards, 10px for inputs and buttons, 14px for pill-like add buttons and centered modals, a 12px top-corner sheet on mobile, and fully round 26px icon discs for inline add rows. No borders on cards or inputs; inputs are filled, not outlined.

## Components

### Buttons
- **Shape:** 10px radius, full-width pair in modals (gap 10px).
- **Primary (save):** system blue fill, white 16px/600 label, 13px vertical padding. Disabled state swaps the fill to Tertiary Grey.
- **Secondary (cancel):** surface fill, ink label.
- **Add button:** 14px radius, accent text on 10% accent tint, 48px minimum height.
- **Remove:** 48x48 hit area, destructive red glyph, no background.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Card White / #1C1C1E.
- **Shadow Strategy:** see Elevation; faint in light, none in dark.
- **Internal Padding:** 16px mobile, 18px tablet, 20px desktop.
- **Header:** title left, add action right, 12px below.

### Inputs / Fields
- **Style:** filled surface, no border, 10px radius, 12x14px padding, 17px text, 48px minimum height.
- **Label:** 13px/600 Secondary Grey above the field, 16px above and 6px below.
- **Required marker:** destructive red.

### Navigation
- **Bottom tab bar:** surface background, hairline top border, three tabs (contacts, calendar, menu), 24px outline Ionicons plus 11px label, all in accent blue. Hidden on desktop web.

### Birthday Card (signature)
Cream (#FFF8EE) ground with a soft amber border (38% opacity) in light, deep brown (#291D00) with a 22% amber border in dark. The only warm surface in the app.

## Do's and Don'ts

### Do:
- **Do** use system blue for every interactive element and nothing else.
- **Do** keep every touch target at 48px minimum.
- **Do** build new surfaces from the existing card (12px, surface fill, 16px padding) and the filled input.
- **Do** provide light and dark values for every new color token.
- **Do** keep copy short and literal: "Add phone", "Save", not slogans.

### Don't:
- **Don't** use CRM patterns: metric panels, endless tables, corporate blue headers.
- **Don't** add social cues: avatars with badges, engagement counts, audience logic.
- **Don't** use colored left or right stripe borders as alert accents.
- **Don't** add custom fonts, gradients, or glass effects; the app should disappear.
- **Don't** nest cards inside cards or repeat identical icon-heading-text card grids.
