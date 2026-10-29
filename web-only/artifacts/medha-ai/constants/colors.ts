/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1F302D',
    tint: '#1F5C52',

    // Core surfaces
    background: '#F7F6F0',
    foreground: '#1F302D',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1F302D',

    // Primary action color (buttons, links, active states)
    primary: '#1F5C52',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E8F0EA',
    secondaryForeground: '#23453E',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EEF1EC',
    mutedForeground: '#708079',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F2B28F',
    accentForeground: '#5A3629',

    // Destructive actions (delete, error states)
    destructive: '#B94E4E',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#DCE5DD',
    input: '#D5E1D8',

    // Product accents
    navy: '#183C46',
    softNavy: '#E6EFF0',
    sage: '#C8DCCB',
    peach: '#F8E1D5',
    sun: '#F7D68D',
    safe: '#2F806D',
    warning: '#B97838',
    shadow: '#163B35',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
