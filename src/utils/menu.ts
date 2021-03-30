/**
 * @private
 * @param c: amount of change
 * @param d: duration
 * @param s: initial value (start)
 * @param t: time (elapsed)
 */
function easeOutCubic(
  c: number,
  d: number,
  s: number,
  t: number
): number {
  return c * ((t = t / d - 1) * t * t + 1) + s;
}

/**
 * @private
 */
function getScrollTop(el: Element): number {
  return isDocumentElement(el) ? window.pageYOffset : el.scrollTop;
}

/**
 * @private
 */
function scrollTo(el: Element, top: number): void {
  isDocumentElement(el) ? window.scrollTo(0, top) : (el.scrollTop = top);
}

/**
 * @private
 */
function isDocumentElement(el: Element | Window): boolean {
  return el === document.documentElement || el === document.body || el === window;
}

/**
 * @private
 */
function styleHasOverlfow({ overflow, overflowX, overflowY }: CSSStyleDeclaration): boolean {
  const isOverflow = (x: string): boolean => x === 'auto' || x === 'scroll';

  return isOverflow(overflow) || isOverflow(overflowX) || isOverflow(overflowY);
}

/**
 * @private
 */
function getScrollParent(el: Element): Element {
  let style = getComputedStyle(el);
  const isParentAbs = style.position === 'absolute';

  if (style.position === 'fixed') {
    return document.documentElement;
  }

  for (let parent: Element | null = el; (parent = parent?.parentElement);) {
    style = getComputedStyle(parent);
    if (!(isParentAbs && style.position === 'static') && styleHasOverlfow(style)) {
      return parent;
    }
  }

  return document.documentElement;
}

/**
 * @private
 */
function smoothScrollTo(
  el: Element,
  to: number,
  duration: number = 300,
  callback?: (...args: any[]) => any
): void {
  let time = 0;
  const start = getScrollTop(el);
  const change = to - start;

  function scrollFn(): void {
    time += 5;
    scrollTo(el, easeOutCubic(change, duration, start, time));

    (time < duration)
      ? requestAnimationFrame(scrollFn)
      : callback?.();
  }

  requestAnimationFrame(scrollFn);
}

/**
 * Calculates the top property value for the MenuWrapper <div />.
 * This property is only generated when the position of the menu is above the control.
 */
export const calculateMenuTop = (
  menuHeight: number,
  menuEl: Element | null,
  controlEl: Element | null
): string => {
  const menuHeightOrDefault = (menuHeight > 0 || !menuEl)
    ? menuHeight
    : menuEl.getBoundingClientRect().height;

  const controlHeight = controlEl ? controlEl.getBoundingClientRect().height : 0;
  const menuElStyle = menuEl && getComputedStyle(menuEl);
  const marginBottom = menuElStyle ? parseInt(menuElStyle.marginBottom, 10) : 0;
  const marginTop = menuElStyle ? parseInt(menuElStyle.marginTop, 10) : 0;

  const basePx = -Math.abs(menuHeightOrDefault + controlHeight);
  const adjustPx = marginBottom + marginTop;

  return 'calc(' + basePx + 'px + ' + adjustPx + 'px)';
};

export const menuFitsBelowControl = (el: Element | null): boolean => {
  if (!el) return true;

  const scrollParent = getScrollParent(el);
  const { top, height } = el.getBoundingClientRect();
  const scrollSpaceBelow = scrollParent.getBoundingClientRect().height - getScrollTop(scrollParent) - top;

  return scrollSpaceBelow >= height;
};

/**
 * Calculate space around the control and menu to determine if an animated
 * scroll can performed to show the menu in full view. Also, execute a callback if defined.
 */
export const scrollMenuIntoViewOnOpen = (
  menuEl: Element | null,
  menuScrollDuration: number | undefined,
  scrollMenuIntoView: boolean | undefined,
  handleOnMenuOpen: (availableSpace?: number) => void
): void => {
  if (!menuEl) {
    handleOnMenuOpen();
    return;
  }

  const { top, height, bottom } = menuEl.getBoundingClientRect();
  const viewInner = window.innerHeight;
  const viewSpaceBelow = viewInner - top;

  // Menu will fit in available space - no need to do scroll
  if (viewSpaceBelow >= height) {
    handleOnMenuOpen();
    return;
  }

  const scrollParent = getScrollParent(menuEl);
  const scrollTop = getScrollTop(scrollParent);
  const scrollSpaceBelow = scrollParent.getBoundingClientRect().height - scrollTop - top;
  const notEnoughSpaceBelow = scrollSpaceBelow < height;

  // Sufficient space does not exist to scroll menu fully into view
  // ...Calculate available space and use that as the the new menuHeight (use scrollSpaceBelow for now).
  // OR scrollMenuIntoView = false
  if (notEnoughSpaceBelow || !scrollMenuIntoView) {
    const condensedMenuHeight = notEnoughSpaceBelow ? scrollSpaceBelow : undefined;
    handleOnMenuOpen(condensedMenuHeight);
    return;
  }

  // Do scroll and upon scroll animation completion, execute the callback if defined
  const marginBottom = parseInt(getComputedStyle(menuEl).marginBottom, 10);
  const scrollDown = bottom - viewInner + scrollTop + marginBottom;

  smoothScrollTo(scrollParent, scrollDown, menuScrollDuration, handleOnMenuOpen);
};
