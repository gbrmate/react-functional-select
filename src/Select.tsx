import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useCallback,
  useImperativeHandle
} from 'react';

import {
  isBoolean,
  mergeThemes,
  normalizeValue,
  IS_TOUCH_DEVICE,
  isArrayWithLength,
  suppressMouseOrTouchEvent
} from './utils';

import {
  ValueIndexEnum,
  FilterMatchEnum,
  OptionIndexEnum,
  MenuPositionEnum,
  EMPTY_ARRAY,
  SELECT_WRAPPER_ATTRS,
  PLACEHOLDER_DEFAULT,
  LOADING_MSG_DEFAULT,
  CONTROL_CONTAINER_CLS,
  FOCUSED_OPTION_DEFAULT,
  NO_OPTIONS_MSG_DEFAULT,
  MENU_ITEM_SIZE_DEFAULT,
  MENU_MAX_HEIGHT_DEFAULT,
  CONTROL_CONTAINER_TESTID
} from './constants';

import styled, { css, ThemeProvider } from 'styled-components';
import { Menu, Value, AriaLiveRegion, AutosizeInput, IndicatorIcons } from './components';
import { useDebounce, useMenuPositioner, useMenuOptions, useMountEffect, useUpdateEffect } from './hooks';

import type { FixedSizeList } from 'react-window';
import type { DefaultTheme } from 'styled-components';
import type { Ref, FormEvent, FocusEvent, ReactNode, ReactText, KeyboardEvent, FocusEventHandler } from 'react';

import type {
  OptionData,
  PartialDeep,
  IconRenderer,
  FocusedOption,
  SelectedOption,
  CallbackFunction,
  MouseOrTouchEvent,
  AriaLiveAttribute
} from './types';

export type Theme = PartialDeep<DefaultTheme>;

export type MultiParams = Readonly<{
  selected: SelectedOption[];
  renderOptionLabel: (data: OptionData) => ReactNode;
}>;

export type MenuOption = Readonly<{
  label: ReactText;
  value: ReactText;
  data: OptionData;
  isDisabled?: boolean;
  isSelected?: boolean;
}>;

export type SelectRef = Readonly<{
  empty: boolean;
  menuOpen: boolean;
  blur: () => void;
  focus: () => void;
  clearValue: () => void;
  toggleMenu: (state?: boolean) => void;
  setValue: (option?: OptionData) => void;
}>;

export type SelectProps = Readonly<{
  async?: boolean;
  inputId?: string;
  selectId?: string;
  isMulti?: boolean;
  ariaLabel?: string;
  required?: boolean;
  loadingMsg?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  isInvalid?: boolean;
  inputDelay?: number;
  themeConfig?: Theme;
  isDisabled?: boolean;
  placeholder?: string;
  menuWidth?: ReactText;
  menuItemSize?: number;
  isClearable?: boolean;
  lazyLoadMenu?: boolean;
  options?: OptionData[];
  isSearchable?: boolean;
  menuMaxHeight?: number;
  loadingNode?: ReactNode;
  ariaLabelledBy?: string;
  clearIcon?: IconRenderer;
  caretIcon?: IconRenderer;
  openMenuOnClick?: boolean;
  openMenuOnFocus?: boolean;
  menuPortalTarget?: Element;
  menuOverscanCount?: number;
  tabSelectsOption?: boolean;
  filterIgnoreCase?: boolean;
  itemKeySelector?: ReactText;
  menuScrollDuration?: number;
  blurInputOnSelect?: boolean;
  closeMenuOnSelect?: boolean;
  isAriaLiveEnabled?: boolean;
  scrollMenuIntoView?: boolean;
  noOptionsMsg?: string | null;
  ariaLive?: AriaLiveAttribute;
  hideSelectedOptions?: boolean;
  filterIgnoreAccents?: boolean;
  onMenuOpen?: CallbackFunction;
  onMenuClose?: CallbackFunction;
  backspaceClearsValue?: boolean;
  menuPosition?: MenuPositionEnum;
  filterMatchFrom?: FilterMatchEnum;
  menuItemDirection?: 'ltr' | 'rtl';
  onInputChange?: (value?: string) => any;
  initialValue?: OptionData | OptionData[];
  onSearchChange?: (value?: string) => any;
  onOptionChange?: (data: OptionData) => any;
  getOptionLabel?: (data: OptionData) => ReactText;
  getOptionValue?: (data: OptionData) => ReactText;
  onInputBlur?: FocusEventHandler<HTMLInputElement>;
  onInputFocus?: FocusEventHandler<HTMLInputElement>;
  renderOptionLabel?: (data: OptionData) => ReactNode;
  getIsOptionDisabled?: (data: OptionData) => boolean;
  getFilterOptionString?: (option: MenuOption) => string;
  renderMultiOptions?: (params: MultiParams) => ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, input?: string, focusedOption?: FocusedOption) => any;
}>;

interface ControlWrapperProps extends Pick<SelectProps, 'isInvalid' | 'isDisabled'> {
  isFocused: boolean;
}

const SelectWrapper = styled.div.attrs(SELECT_WRAPPER_ATTRS)`
  position: relative;
  box-sizing: border-box;
  ${({ theme }) => theme.select.css}
`;

const ValueWrapper = styled.div`
  flex: 1 1 0%;
  display: flex;
  flex-wrap: wrap;
  overflow: hidden;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  padding: ${({ theme }) => theme.control.padding};
`;

const ControlWrapper = styled.div<ControlWrapperProps>`
  outline: 0;
  display: flex;
  flex-wrap: wrap;
  cursor: default;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  justify-content: space-between;

  ${({ isDisabled, isFocused, isInvalid, theme: { control, color } }) => css`
    transition: ${control.transition};
    border-style: ${control.borderStyle};
    border-width: ${control.borderWidth};
    border-radius: ${control.borderRadius};
    min-height: ${control.height || control.minHeight};

    border-color: ${isInvalid
      ? color.danger
      : isFocused
      ? control.focusedBorderColor
      : color.border};

    ${control.height ? `height: ${control.height};` : ''}
    ${isDisabled ? 'pointer-events:none;user-select:none;' : ''}

    ${control.backgroundColor || isDisabled
      ? `background-color: ${isDisabled ? color.disabled : control.backgroundColor};`
      : ''}

    ${isFocused
      ? `box-shadow: ${control.boxShadow} ${
          isInvalid ? color.dangerLight : control.boxShadowColor
        };`
      : ''}
  `}

  ${({ theme }) => theme.control.css}
  ${({ isFocused, theme }) => isFocused && theme.control.focusedCss}
`;

const Select = forwardRef<SelectRef, SelectProps>((
  {
    async,
    isMulti,
    inputId,
    selectId,
    required,
    ariaLive,
    autoFocus,
    isLoading,
    onKeyDown,
    clearIcon,
    caretIcon,
    isInvalid,
    ariaLabel,
    menuWidth,
    isDisabled,
    inputDelay,
    onMenuOpen,
    onMenuClose,
    onInputBlur,
    isClearable,
    themeConfig,
    loadingNode,
    initialValue,
    onInputFocus,
    onInputChange,
    ariaLabelledBy,
    onOptionChange,
    onSearchChange,
    getOptionLabel,
    getOptionValue,
    itemKeySelector,
    openMenuOnFocus,
    menuPortalTarget,
    isAriaLiveEnabled,
    menuOverscanCount,
    blurInputOnSelect,
    menuItemDirection,
    renderOptionLabel,
    renderMultiOptions,
    menuScrollDuration,
    filterIgnoreAccents,
    hideSelectedOptions,
    getIsOptionDisabled,
    getFilterOptionString,
    isSearchable = true,
    lazyLoadMenu = false,
    openMenuOnClick = true,
    filterIgnoreCase = true,
    tabSelectsOption = true,
    closeMenuOnSelect = true,
    scrollMenuIntoView = true,
    backspaceClearsValue = true,
    filterMatchFrom = FilterMatchEnum.ANY,
    menuPosition = MenuPositionEnum.BOTTOM,
    options = EMPTY_ARRAY,
    loadingMsg = LOADING_MSG_DEFAULT,
    placeholder = PLACEHOLDER_DEFAULT,
    noOptionsMsg = NO_OPTIONS_MSG_DEFAULT,
    menuItemSize = MENU_ITEM_SIZE_DEFAULT,
    menuMaxHeight = MENU_MAX_HEIGHT_DEFAULT
  },
  ref: Ref<SelectRef>
) => {
  // Instance prop refs (primitive/function type)
  const menuOpenRef = useRef<boolean>(false);
  const prevMenuOptionsLength = useRef<number>();
  const onChangeEventValue = useRef<boolean>(false);
  const onSearchChangeRef = useRef<(value?: string) => any>();
  const onOptionChangeRef = useRef<(data: OptionData) => any>();

  // DOM element refs
  const listRef = useRef<FixedSizeList | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);

  // Stateful values
  const [inputValue, setInputValue] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [focusedMultiValue, setFocusedMultiValue] = useState<ReactText | null>(null);
  const [focusedOption, setFocusedOption] = useState<FocusedOption>(FOCUSED_OPTION_DEFAULT);

  // Memoized DefaultTheme object for styled-components ThemeProvider
  const theme = useMemo<DefaultTheme>(() => mergeThemes(themeConfig), [themeConfig]);

  // Memoized callback functions referencing optional function properties on Select.tsx
  const getOptionLabelFn = useMemo<((data: OptionData) => ReactText)>(() => getOptionLabel || ((data) => data.label), [getOptionLabel]);
  const getOptionValueFn = useMemo<((data: OptionData) => ReactText)>(() => getOptionValue || ((data) => data.value), [getOptionValue]);
  const renderOptionLabelFn = useMemo<((data: OptionData) => ReactNode)>(() => renderOptionLabel || getOptionLabelFn, [renderOptionLabel, getOptionLabelFn]);

  // Custom hook abstraction that debounces search input value (opt-in)
  const debouncedInputValue = useDebounce<string>(inputValue, inputDelay);

  // If initialValue is specified attempt to initialize, otherwise default to []
  const [selectedOption, setSelectedOption] = useState<SelectedOption[]>(() => normalizeValue(initialValue, getOptionValueFn, getOptionLabelFn));

  // Custom hook abstraction that handles the creation of menuOptions
  const menuOptions = useMenuOptions(
    options,
    debouncedInputValue,
    filterMatchFrom,
    selectedOption,
    getOptionValueFn,
    getOptionLabelFn,
    getIsOptionDisabled,
    getFilterOptionString,
    filterIgnoreCase,
    filterIgnoreAccents,
    isMulti,
    hideSelectedOptions,
    async
  );

  // Custom hook abstraction that handles calculating menuHeightCalc (defaults to menuMaxHeight) / handles executing callbacks/logic on menuOpen state change.
  const [menuStyleTop, menuHeightCalc] = useMenuPositioner(
    menuRef,
    controlRef,
    menuOpen,
    menuPosition,
    menuItemSize,
    menuMaxHeight,
    menuOptions.length,
    !!menuPortalTarget,
    menuScrollDuration,
    scrollMenuIntoView,
    onMenuOpen,
    onMenuClose
  );

  const blurInput = (): void => inputRef.current?.blur();
  const focusInput = (): void => inputRef.current?.focus();
  const scrollToItemIndex = (index: number): void => listRef.current?.scrollToItem(index);

  const openMenuAndFocusOption = useCallback((position: OptionIndexEnum): void => {
    if (!isArrayWithLength(menuOptions)) {
      !menuOpenRef.current && setMenuOpen(true);
      return;
    }

    const selectedIndex = !isMulti
      ? menuOptions.findIndex((x) => x.isSelected)
      : -1;

    const index = selectedIndex > -1
      ? selectedIndex
      : position === OptionIndexEnum.FIRST
        ? 0
        : menuOptions.length - 1;

    !menuOpenRef.current && setMenuOpen(true);
    setFocusedOption({ index, ...menuOptions[index] });
    scrollToItemIndex(index);
  }, [isMulti, menuOptions]);

  const removeSelectedOption = useCallback((value?: ReactText): void => {
    setSelectedOption((prev) => prev.filter((x) => x.value !== value));
  }, []);

  const selectOption = useCallback((option: SelectedOption, isSelected?: boolean): void => {
    if (isSelected) {
      isMulti && removeSelectedOption(option.value);
    } else {
      setSelectedOption((prev) => !isMulti ? [option] : [...prev, option]);
    }

    // Use 'blurInputOnSelect' if defined, otherwise evaluate to true if current device is touch-device
    const blurControl = isBoolean(blurInputOnSelect)
      ? blurInputOnSelect
      : IS_TOUCH_DEVICE;

    if (blurControl) {
      blurInput();
    } else if (closeMenuOnSelect) {
      setMenuOpen(false);
      setInputValue('');
    }
  }, [isMulti, closeMenuOnSelect, removeSelectedOption, blurInputOnSelect]);

  /**
   * useImperativeHandle.
   * Exposed API methods/properties available on a ref instance of this Select.tsx component.
   */
  useImperativeHandle(ref, () => ({
    empty: !isArrayWithLength(selectedOption),
    menuOpen,
    blur: blurInput,
    focus: focusInput,
    clearValue: () => {
      if (selectOption.length)
        setSelectedOption(EMPTY_ARRAY);
      if (focusedOption.data)
        setFocusedOption(FOCUSED_OPTION_DEFAULT);
    },
    setValue: (option?: OptionData) => {
      const normalizedOptions = normalizeValue(option, getOptionValueFn, getOptionLabelFn);
      setSelectedOption(normalizedOptions);
    },
    toggleMenu: (state?: boolean) => {
      if (state === true || (state === undefined && !menuOpen)) {
        !isFocused && focusInput();
        openMenuAndFocusOption(OptionIndexEnum.FIRST);
      } else {
        blurInput();
      }
    }
  }));

  /**
   * useMountEffect:
   * If autoFocus = true, focus the control following initial mount.
   */
  useMountEffect(() => {
    autoFocus && focusInput();
  });

  /**
   * Write value of 'menuOpen' to ref object.
   * Prevent extraneous state update calls/rerenders.
   */
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  /**
   * Write value of 'onOptionChange' & 'onSearchChange' props to ref object.
   * Prevent effects using these props from excessive executions if they are not memoized or change frequently.
   */
  useEffect(() => {
    onOptionChangeRef.current = onOptionChange;
    onSearchChangeRef.current = onSearchChange;
  }, [onOptionChange, onSearchChange]);

  /**
   * If control recieves focus & openMenuOnFocus = true, open menu
   */
  useEffect(() => {
    if (isFocused && openMenuOnFocus) {
      openMenuAndFocusOption(OptionIndexEnum.FIRST);
    }
  }, [isFocused, openMenuOnFocus, openMenuAndFocusOption]);

  /**
   * If 'onSearchChange' function is defined, run as callback when the stateful debouncedInputValue
   * updates check if onChangeEventValue ref is set true, which indicates the inputValue change was triggered by input change event
   */
  useEffect(() => {
    const { current: onSearchFn } = onSearchChangeRef;

    if (onSearchFn && onChangeEventValue.current) {
      onChangeEventValue.current = false;
      onSearchFn(debouncedInputValue);
    }
  }, [debouncedInputValue]);

  /**
   * useUpdateEffect:
   * Handle passing 'selectedOption' value(s) to onOptionChange callback function prop (if defined)
   */
  useUpdateEffect(() => {
    const { current: onChangeFn } = onOptionChangeRef;

    if (onChangeFn) {
      const normalizedOptionValue = isMulti
        ? selectedOption.map((x) => x.data)
        : isArrayWithLength(selectedOption)
          ? selectedOption[0].data
          : null;

      onChangeFn(normalizedOptionValue);
    }
  }, [isMulti, selectedOption]);

  /**
   * useUpdateEffect:
   * Handle clearing focused option if menuOptions array has 0 length;
   * Handle menuOptions changes - conditionally focus first option and do scroll to first option;
   * Handle reseting scroll pos to first item after the previous search returned zero results (use prevMenuOptionsLen)
   */
  useUpdateEffect(() => {
    const { length: menuLen } = menuOptions;
    const inputChanged = menuLen > 0 && (async || menuLen !== options.length || prevMenuOptionsLength.current === 0);

    if (menuLen === 0) {
      setFocusedOption(FOCUSED_OPTION_DEFAULT);
    } else if (menuLen === 1 || inputChanged) {
      setFocusedOption({ index: 0, ...menuOptions[0] });
      scrollToItemIndex(0);
    }

    prevMenuOptionsLength.current = menuLen;
  }, [async, options, menuOptions]);

  const selectOptionFromFocused = (): void => {
    const {
      data,
      value,
      label,
      isSelected,
      isDisabled: disabled
    } = focusedOption;

    if (data && !disabled) {
      selectOption({ data, value, label }, isSelected);
    }
  };

  // Only Multiselect mode supports value focusing
  const focusValueOnArrowKey = (direction: ValueIndexEnum): void => {
    if (!isArrayWithLength(selectedOption)) return;

    let nextFocusedIdx = -1;
    const lastValueIdx = selectedOption.length - 1;
    const curFocusedIdx = focusedMultiValue ? selectedOption.findIndex((x) => x.value === focusedMultiValue) : -1;

    if (direction === ValueIndexEnum.NEXT) {
      nextFocusedIdx = (curFocusedIdx > -1 && curFocusedIdx < lastValueIdx)
        ? curFocusedIdx + 1
        : -1;
    } else {
      nextFocusedIdx = curFocusedIdx !== 0
        ? curFocusedIdx === -1
          ? lastValueIdx
          : curFocusedIdx - 1
        : 0;
    }

    const nextFocusedVal = nextFocusedIdx >= 0
      ? selectedOption[nextFocusedIdx].value!
      : null;

    if (focusedOption.data) setFocusedOption(FOCUSED_OPTION_DEFAULT);
    if (nextFocusedVal !== focusedMultiValue) setFocusedMultiValue(nextFocusedVal);
  };

  const focusOptionOnArrowKey = (direction: OptionIndexEnum): void => {
    if (!isArrayWithLength(menuOptions)) return;

    const index =
      direction === OptionIndexEnum.DOWN
        ? (focusedOption.index + 1) % menuOptions.length
        : focusedOption.index > 0
          ? focusedOption.index - 1
          : menuOptions.length - 1;

    focusedMultiValue && setFocusedMultiValue(null);
    setFocusedOption({ index, ...menuOptions[index] });
    scrollToItemIndex(index);
  };

  const handleUpDownKeySubRoutine = (key: string): void => {
    const downKey = key === 'ArrowDown';
    const downUpIndex = downKey ? OptionIndexEnum.DOWN : OptionIndexEnum.UP;
    const posIndex = downKey ? OptionIndexEnum.FIRST : OptionIndexEnum.LAST;

    menuOpen ? focusOptionOnArrowKey(downUpIndex) : openMenuAndFocusOption(posIndex);
  };

  const handleOnKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (isDisabled) return;

    if (onKeyDown) {
      onKeyDown(e, inputValue, focusedOption);
      if (e.defaultPrevented) return;
    }

    const { key } = e;
    switch (key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        handleUpDownKeySubRoutine(key);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!isMulti || inputValue || renderMultiOptions) return;

        const leftRightIndex = key === 'ArrowLeft' ? ValueIndexEnum.PREVIOUS : ValueIndexEnum.NEXT;
        focusValueOnArrowKey(leftRightIndex);

        break;
      }
      // Handle spacebar keydown events
      case ' ': {
        if (inputValue) return;

        if (!menuOpen) {
          openMenuAndFocusOption(OptionIndexEnum.FIRST);
        } else if (!focusedOption.data) {
          return;
        } else {
          selectOptionFromFocused();
        }

        break;
      }
      // Check e.keyCode !== 229 (Input Method Editor)
      case 'Enter': {
        if (menuOpen && e.keyCode !== 229) selectOptionFromFocused();
        break;
      }
      case 'Escape': {
        if (menuOpen) {
          setMenuOpen(false);
          setInputValue('');
        }

        break;
      }
      case 'Tab': {
        if (!menuOpen || !tabSelectsOption || !focusedOption.data || e.shiftKey) return;
        selectOptionFromFocused();
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (inputValue) return;

        if (focusedMultiValue) {
          const clearFocusedIndex = selectedOption.findIndex((x) => x.value === focusedMultiValue);

          const nexFocusedMultiValue = (clearFocusedIndex > -1 && (clearFocusedIndex < (selectedOption.length - 1)))
            ? selectedOption[clearFocusedIndex + 1].value!
            : null;

          removeSelectedOption(focusedMultiValue);
          setFocusedMultiValue(nexFocusedMultiValue);
        } else {
          if (!backspaceClearsValue) return;
          if (!isArrayWithLength(selectedOption)) break;

          if (isMulti && !renderMultiOptions) {
            const { value } = selectedOption[selectedOption.length - 1];
            removeSelectedOption(value);
          } else if (isClearable) {
            setSelectedOption(EMPTY_ARRAY);
          }
        }

        break;
      }
      default:
        return;
    }

    e.preventDefault();
  };

  const handleOnControlMouseDown = (e: MouseOrTouchEvent<HTMLDivElement>): void => {
    if (isDisabled) return;
    if (!isFocused) focusInput();

    const targetIsNotInput = e.currentTarget.tagName !== 'INPUT';

    if (!menuOpen) {
      openMenuOnClick && openMenuAndFocusOption(OptionIndexEnum.FIRST);
    } else if (targetIsNotInput) {
      menuOpen && setMenuOpen(false);
      inputValue && setInputValue('');
    }

    if (targetIsNotInput) e.preventDefault();
  };

  const handleOnMenuMouseDown = (e: MouseOrTouchEvent<HTMLDivElement>): void => {
    suppressMouseOrTouchEvent(e);
    focusInput();
  };

  const handleOnInputBlur = useCallback((e: FocusEvent<HTMLInputElement>): void => {
    onInputBlur?.(e);
    setIsFocused(false);
    setMenuOpen(false);
    setInputValue('');
  }, [onInputBlur]);

  const handleOnInputFocus = useCallback((e: FocusEvent<HTMLInputElement>): void => {
    onInputFocus?.(e);
    setIsFocused(true);
  }, [onInputFocus]);

  const handleOnInputChange = useCallback((e: FormEvent<HTMLInputElement>): void => {
    const newInputVal = e.currentTarget.value || '';
    onChangeEventValue.current = true;
    onInputChange?.(newInputVal);
    !menuOpenRef.current && setMenuOpen(true);
    setInputValue(newInputVal);
  }, [onInputChange]);

  const handleOnClearMouseDown = useCallback((e: MouseOrTouchEvent<HTMLDivElement>): void => {
    setSelectedOption(EMPTY_ARRAY);
    suppressMouseOrTouchEvent(e);
    focusInput();
  }, []);

  const handleOnCaretMouseDown = useCallback((e: MouseOrTouchEvent<HTMLDivElement>): void => {
    focusInput();
    menuOpenRef.current ? setMenuOpen(false) : openMenuAndFocusOption(OptionIndexEnum.FIRST);
    suppressMouseOrTouchEvent(e);
  }, [openMenuAndFocusOption]);

  const renderMenu = !lazyLoadMenu || (lazyLoadMenu && menuOpen);
  const inputReadOnly = isDisabled || !isSearchable || !!focusedMultiValue;
  const showClear = !!(isClearable && !isDisabled && isArrayWithLength(selectedOption));
  const handleOnCaretMouseDownOrNoop = (!isDisabled && !openMenuOnClick) ? handleOnCaretMouseDown : undefined;

  return (
    <ThemeProvider theme={theme}>
      <SelectWrapper
        id={selectId}
        aria-controls={inputId}
        aria-expanded={menuOpen}
        onKeyDown={handleOnKeyDown}
      >
        <ControlWrapper
          ref={controlRef}
          isInvalid={isInvalid}
          isFocused={isFocused}
          isDisabled={isDisabled}
          className={CONTROL_CONTAINER_CLS}
          onTouchEnd={handleOnControlMouseDown}
          onMouseDown={handleOnControlMouseDown}
          data-testid={CONTROL_CONTAINER_TESTID}
        >
          <ValueWrapper>
            <Value
              isMulti={isMulti}
              inputValue={inputValue}
              placeholder={placeholder}
              selectedOption={selectedOption}
              focusedMultiValue={focusedMultiValue}
              renderOptionLabel={renderOptionLabelFn}
              renderMultiOptions={renderMultiOptions}
              removeSelectedOption={removeSelectedOption}
            />
            <AutosizeInput
              id={inputId}
              ref={inputRef}
              required={required}
              ariaLabel={ariaLabel}
              inputValue={inputValue}
              readOnly={inputReadOnly}
              onBlur={handleOnInputBlur}
              onFocus={handleOnInputFocus}
              onChange={handleOnInputChange}
              ariaLabelledBy={ariaLabelledBy}
              selectedOption={selectedOption}
            />
          </ValueWrapper>
          <IndicatorIcons
            menuOpen={menuOpen}
            clearIcon={clearIcon}
            caretIcon={caretIcon}
            isInvalid={isInvalid}
            isLoading={isLoading}
            showClear={showClear}
            isDisabled={isDisabled}
            loadingNode={loadingNode}
            onClearMouseDown={handleOnClearMouseDown}
            onCaretMouseDown={handleOnCaretMouseDownOrNoop}
          />
        </ControlWrapper>
        {renderMenu && (
          <Menu
            menuRef={menuRef}
            menuOpen={menuOpen}
            isLoading={isLoading}
            menuTop={menuStyleTop}
            height={menuHeightCalc}
            itemSize={menuItemSize}
            loadingMsg={loadingMsg}
            menuOptions={menuOptions}
            fixedSizeListRef={listRef}
            noOptionsMsg={noOptionsMsg}
            selectOption={selectOption}
            direction={menuItemDirection}
            itemKeySelector={itemKeySelector}
            overscanCount={menuOverscanCount}
            menuPortalTarget={menuPortalTarget}
            width={menuWidth || theme.menu.width}
            onMenuMouseDown={handleOnMenuMouseDown}
            renderOptionLabel={renderOptionLabelFn}
            focusedOptionIndex={focusedOption.index}
          />
        )}
        {isAriaLiveEnabled && (
          <AriaLiveRegion
            ariaLive={ariaLive}
            menuOpen={menuOpen}
            isFocused={isFocused}
            ariaLabel={ariaLabel}
            inputValue={inputValue}
            isSearchable={isSearchable}
            focusedOption={focusedOption}
            selectedOption={selectedOption}
            optionCount={menuOptions.length}
          />
        )}
      </SelectWrapper>
    </ThemeProvider>
  );
});

Select.displayName = 'Select';

export { Select };