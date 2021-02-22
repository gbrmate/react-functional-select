/**
 * Determines if the current device is touch-enabled.
 */
export const IS_TOUCH_DEVICE: boolean =
  (typeof window !== 'undefined' && 'ontouchstart' in window) ||
  (typeof navigator !== 'undefined' && !!navigator.maxTouchPoints);

/**
 * Determines if the current browser is IE or Edge (standard/chromium).
 */
const IE_EDGE_BROWSER_REGEXP = /(MSIE|Trident\/|Edge\/|Edg\/)/i;

export const IS_MICROSOFT_BROWSER: boolean =
  typeof navigator !== 'undefined' && IE_EDGE_BROWSER_REGEXP.test(navigator.userAgent);