---
name: Tactical Medical Interface
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#747781'
  outline-variant: '#c4c6d1'
  surface-tint: '#3e5e95'
  primary: '#00193c'
  on-primary: '#ffffff'
  primary-container: '#002d62'
  on-primary-container: '#7796d1'
  inverse-primary: '#abc7ff'
  secondary: '#006970'
  on-secondary: '#ffffff'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#001a36'
  on-tertiary: '#ffffff'
  tertiary-container: '#002f59'
  on-tertiary-container: '#5398eb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#abc7ff'
  on-primary-fixed: '#001b3f'
  on-primary-fixed-variant: '#24467c'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a4c9ff'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#004883'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style

This design system establishes a high-performance, mission-critical aesthetic tailored for the intersection of advanced healthcare and military discipline. The brand personality is **authoritative, innovative, and hyper-reliable**, reflecting the prestige of IIT Jodhpur and the operational excellence of the Indian Army.

The visual style is **Tactical Minimalism with Glassmorphism accents**. It prioritizes extreme legibility and rapid information processing. We utilize a clean, expansive white canvas to signify medical sterility, contrasted by deep navy structural elements that evoke security. Futuristic "HUD" (Heads-Up Display) elements—such as subtle grid lines, scanning animations, and holographic glowing indicators—are used sparingly to highlight critical biometric data without overwhelming the user.

## Colors

The palette is engineered for professional clarity and high-tech resonance.

*   **Primary (Deep Navy):** Used for structural navigation, headers, and "Security-First" elements. It provides the grounding authority required for military applications.
*   **Secondary (Glowing Cyan):** Reserved for "Active" states, holographic data visualizations, and futuristic accents. It should feel luminescent against the white background.
*   **Tertiary (Soft Blue):** Used for gradients and background washes to reduce eye strain during long-duration consultations.
*   **Medical White:** The foundation of the UI, ensuring a clinical and organized feel.
*   **Tactical Red/Amber:** Dedicated strictly to critical alerts and emergency medical triage statuses.

## Typography

The typography system balances geometric modernism with technical precision.

1.  **Headlines (Sora):** A geometric sans-serif that feels futuristic and bold. Used for page titles and high-level dashboard metrics.
2.  **Body (Inter):** The workhorse for medical reports, chat interfaces, and patient history. It is chosen for its exceptional legibility and neutral, professional tone.
3.  **Labels & Data (JetBrains Mono):** Monospaced type is used for all "technical" data points—biometrics, coordinates, timestamps, and ID numbers—to evoke a sophisticated, military-tech HUD feel.

All labels should use uppercase styling with increased letter spacing to enhance the "Tactical" aesthetic.

## Layout & Spacing

The design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

*   **Rhythm:** A 4px baseline grid ensures tight, mathematical alignment.
*   **Density:** Use "High Density" for data dashboards (16px padding) and "Comfortable" for patient consultation screens (32px+ padding).
*   **Safe Zones:** Large margins on the outer edges (64px) focus the user's attention on the central clinical data, creating a sense of calm and precision.
*   **Reflow:** On mobile, sidebars collapse into a bottom-docked "Command Bar" for easy thumb access during field operations.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

*   **Level 0 (Base):** Solid Medical White.
*   **Level 1 (Cards):** Semi-transparent white with a 20px backdrop blur and a 1px soft blue border. This creates a "floating glass" effect.
*   **Level 2 (Active/Floating):** Subtle, ultra-diffused Navy shadows (#002D62 at 8% opacity) to lift critical diagnostic tools above the base layer.
*   **Holographic Overlays:** Elements like heart rate monitors or real-time scanners use a "Secondary" color glow (Cyan) to appear as if projected slightly above the screen surface.

## Shapes

The shape language is **"Precision Rounded."**

We use a standard 8px (0.5rem) radius for primary containers and buttons. This strikes a balance between the "friendly" nature of healthcare and the "structured" nature of military software. 

*   **Buttons:** Fully pill-shaped (rounded-xl) for secondary actions to contrast against the more structured primary data cards.
*   **Data Indicators:** Use sharp 2px corners for "System Status" indicators to maintain a technical, engineered appearance.

## Components

### Buttons
*   **Primary:** Deep Navy background with white text. High contrast for critical actions (e.g., "Initiate Call").
*   **Tactical:** Ghost buttons with Cyan borders and a subtle glow on hover.
*   **Emergency:** Solid Red with a pulsing outer glow for "SOS" or "Critical Alert" triggers.

### Cards (Clinical Glass)
Patient records and diagnostic data are housed in cards featuring a `backdrop-filter: blur(12px)` and a subtle `linear-gradient` border. Headers within cards should use the `label-caps` typography style.

### Inputs
Fields use a "Minimal HUD" style: a bottom-border only that glows Cyan when focused. Labels remain visible above the field in monospaced font.

### Medical HUD Elements
*   **Biometric Sparklines:** Thin Cyan lines with no fill, indicating trends (Heart Rate, SpO2).
*   **Status Badges:** Small, high-contrast pills (e.g., "SECURE", "ENCRYPTED") using Deep Navy backgrounds and monospaced text.

### Selection Controls
Checkboxes and radio buttons use the "Glowing Cyan" for the checked state, designed to look like "On/Off" switches on a control panel.