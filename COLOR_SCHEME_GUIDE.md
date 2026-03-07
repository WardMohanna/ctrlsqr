# Color Scheme Documentation

## Overview

The application now supports multiple color schemes that can be easily switched. Currently, two schemes are available:

1. **Original Scheme** - Blue-based professional theme
2. **RealTime Colors Scheme** - Yellow & Dark theme

## Current Active Scheme

**Active:** Gold & Royal Blue Scheme (added per user request)

## How to Switch Themes

### Method: Edit `src/lib/colorSchemes.ts`

1. Open the file: `src/lib/colorSchemes.ts`
2. Find the line: `export const ACTIVE_SCHEME = REALTIME_SCHEME;`
3. To switch to the original theme, change it to: `export const ACTIVE_SCHEME = ORIGINAL_SCHEME;`
4. The application will automatically reload and apply the new theme

### Current Theme Colors (Gold & Royal Blue)

- **Primary Color**: #ffdb53 (Gold)
- **Primary Hover**: #f2c61c (Darker gold, used on hover)
- **Success Color**: #52c41a (Green)
- **Warning Color**: #faad14 (Amber)
- **Error Color**: #ff4d4f (Red)
- **Info Color**: #132c4b (Royal Blue)
- **Text Color**: #2e2c2c (Dark gray)
- **Background Color**: #ffffff (White page background)
- **Header Background**: #132c4b (Royal blue for header/cards)
- **Accent Color**: #132c4b (Royal blue)

### Previous Schemes

#### RealTime Colors (legacy)

- **Primary Color**: #fbd72c (Yellow)
- **Success Color**: #a64403 (Brown/Orange)
- **Warning Color**: #fbeba3 (Light Yellow)
- **Error Color**: #a64403 (Brown/Orange)
- **Text Color**: #343434 (Dark Gray)
- **Background Color**: #ffffff (White)
- **Header Background**: #343434 (Dark Gray)
- **Accent Color**: #a64403 (Brown/Orange)

#### Original Theme Colors

- **Primary Color**: #1677ff (Blue)
- **Success Color**: #52c41a (Green)
- **Warning Color**: #faad14 (Orange)
- **Error Color**: #ff4d4f (Red)
- **Text Color**: #000000 (Black)
- **Background Color**: #ffffff (White)
- **Header Background**: #001529 (Dark Blue)
- **Accent Color**: #1677ff (Blue)

### Original Theme Colors

- **Primary Color**: #1677ff (Blue)
- **Success Color**: #52c41a (Green)
- **Warning Color**: #faad14 (Orange)
- **Error Color**: #ff4d4f (Red)
- **Text Color**: #000000 (Black)
- **Background Color**: #ffffff (White)
- **Header Background**: #001529 (Dark Blue)
- **Accent Color**: #1677ff (Blue)

## Adding a New Color Scheme

> The stylesheet `src/app/globals.css` contains a few helper rules that
> automatically apply the current `--primary-color` and `--header-bg` to
> layout headers and Ant Design cards. When the gold/royal palette is active
> the header text, navigation links and card content will turn gold on a
> royal-blue background.

To add a new color scheme:

1. Open `src/lib/colorSchemes.ts`
2. Add a new constant following the pattern:

```typescript
export const MY_NEW_SCHEME: ColorScheme = {
  name: "My Scheme Name",
  colors: {
    primaryColor: "#XXXXXX",
    successColor: "#XXXXXX",
    warningColor: "#XXXXXX",
    errorColor: "#XXXXXX",
    infoColor: "#XXXXXX",
    textColor: "#XXXXXX",
    backgroundColor: "#XXXXXX",
    headerBg: "#XXXXXX",
    accentColor: "#XXXXXX",
  },
};
```

3. Set it as the active scheme: `export const ACTIVE_SCHEME = MY_NEW_SCHEME;`

## Files Modified

- `src/app/providers.tsx` - Updated to use dynamic color scheme
- `src/app/globals.css` - Added CSS variables for both themes
- `src/lib/colorSchemes.ts` - Created color scheme configuration (NEW)

## Backup

The original color scheme has been preserved and can be restored by changing:

```typescript
export const ACTIVE_SCHEME = ORIGINAL_SCHEME;
```

## CSS Variables

Color variables are also available in CSS if needed:

```css
/* Active theme variables */
--primary-color
--success-color
--warning-color
--error-color
--text-color
--background-color
--header-bg
--accent-color

/* Backup original theme variables */
--original-primary-color
--original-success-color
--original-warning-color
--original-error-color
--original-text-color
--original-background-color
--original-header-bg
--original-accent-color
```
