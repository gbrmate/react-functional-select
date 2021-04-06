import { useEffect, useState, useRef } from 'react';
import { MenuPositionEnum } from '../constants';
import { useUpdateEffect } from './useUpdateEffect';
import { calculateMenuTop, menuFitsBelowControl, scrollMenuIntoViewOnOpen } from '../utils';

import type { RefObject } from 'react';
import type { CallbackFunction } from '../types';

/**
 * Handle calculating and maintaining the menuHeight used by react-window.
 * Handle scroll animation and callback execution when menuOpen = true.
 * Handle resetting menuHeight back to the menuHeightDefault and callback execution when menuOpen = false.
 * Use ref to track if the menuHeight was resized, and if so, set the menu height back to default (avoids uncessary renders) with call to setMenuHeight.
 * Handle determining where to place the menu in relation to control - when menuPosition = 'top' or menuPosition = 'bottom' and there is not sufficient space below control, place on top.
 */
export const useMenuPositioner = (
  menuRef: RefObject<HTMLElement | null>,
  controlRef: RefObject<HTMLElement | null>,
  menuOpen: boolean,
  menuPosition: MenuPositionEnum,
  menuItemSize: number,
  menuHeightDefault: number,
  menuOptionsLength: number,
  isMenuPortaled: boolean,
  menuScrollDuration?: number,
  scrollMenuIntoView?: boolean,
  onMenuOpen?: CallbackFunction,
  onMenuClose?: CallbackFunction
): [string | undefined, number] => {
  const onMenuOpenRef = useRef<CallbackFunction>();
  const onMenuCloseRef = useRef<CallbackFunction>();
  const resetMenuHeightRef = useRef<boolean>(false);
  const shouldScrollRef = useRef<boolean>(!isMenuPortaled);

  const [menuHeight, setMenuHeight] = useState<number>(menuHeightDefault);
  const [isMenuTopPosition, setIsMenuTopPosition] = useState<boolean>(false);

  useEffect(() => {
    onMenuOpenRef.current = onMenuOpen;
    onMenuCloseRef.current = onMenuClose;
  }, [onMenuOpen, onMenuClose]);

  useEffect(() => {
    shouldScrollRef.current = !isMenuTopPosition && !isMenuPortaled;
  }, [isMenuTopPosition, isMenuPortaled]);

  useEffect(() => {
    const isTopPos =
      menuPosition === MenuPositionEnum.TOP ||
      (menuPosition === MenuPositionEnum.AUTO && !menuFitsBelowControl(menuRef.current));

    setIsMenuTopPosition(isTopPos);
  }, [menuRef, menuPosition]);

  useUpdateEffect(() => {
    if (menuOpen) {
      const handleOnMenuOpen = (availableSpace?: number): void => {
        onMenuOpenRef.current?.();
        if (availableSpace) {
          resetMenuHeightRef.current = true;
          setMenuHeight(availableSpace);
        }
      };

      shouldScrollRef.current
        ? scrollMenuIntoViewOnOpen(
            menuRef.current,
            menuScrollDuration,
            scrollMenuIntoView,
            handleOnMenuOpen
          )
        : handleOnMenuOpen();
    } else {
      onMenuCloseRef.current?.();
      if (resetMenuHeightRef.current) {
        resetMenuHeightRef.current = false;
        setMenuHeight(menuHeightDefault);
      }
    }
  }, [menuRef, menuOpen, menuHeightDefault, scrollMenuIntoView, menuScrollDuration]);

  // Calculated menu height passed react-window; calculate MenuWrapper <div /> 'top' style prop if menu is positioned above control
  const menuHeightCalc = Math.min(menuHeight, menuOptionsLength * menuItemSize);

  const menuStyleTop = isMenuTopPosition
    ? calculateMenuTop(menuHeightCalc, menuRef.current, controlRef.current)
    : undefined;

  return [menuStyleTop, menuHeightCalc];
};