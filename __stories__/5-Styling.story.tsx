import React, { useEffect, useMemo, useState } from 'react';
import { Select, Theme } from '../src';
import { mergeDeep } from '../src/utils';
import { Option } from './helpers/utils';
import DefaultThemeObj from '../src/theme';
import { storiesOf } from '@storybook/react';
import PrettyPrintJson from './helpers/PrettyPrintJson';
import { useCallbackState } from './helpers/useCallbackState';
import { useClearAllToasts } from './helpers/useClearAllToasts';
import PackageLink, { PackageLinkProps } from './helpers/PackageLink';
import { Hr, Code, Title, SubTitle, ListWrapper, List, ListItem, Spacer, Paragraph, JsonContainer, LabelHeader, Container, Card, CardHeader, CardBody, SelectContainer } from './helpers/styled';
import {
  OPTION_CLS,
  OPTION_FOCUSED_CLS,
  OPTION_DISABLED_CLS,
  OPTION_SELECTED_CLS,
  CARET_ICON_CLS,
  CLEAR_ICON_CLS,
  LOADING_DOTS_CLS,
  AUTOSIZE_INPUT_CLS,
  MENU_CONTAINER_CLS,
  SELECT_CONTAINER_CLS,
  CONTROL_CONTAINER_CLS
} from '../src/constants/dom';

  // Normalize animation props as be default they are type of styled-component's "FlattenSimpleInterpolation"
const stringifiedBounceCSS = 'BOUNCE 1.19s ease-in-out infinite';
const stringifiedFadeInCSS = 'FADE_IN 0.225s ease-in-out forwards';

const normalizeStyledKeyframes = {
  loader: {
    animation: stringifiedBounceCSS
  },
  menu: {
    animation: stringifiedFadeInCSS
  },
  multiValue: {
    animation: stringifiedFadeInCSS
  },
  icon: {
    clear: {
      animation: stringifiedFadeInCSS
    }
  }
};

const ThemeDefaultValues = mergeDeep(DefaultThemeObj, normalizeStyledKeyframes);

const ThemeEnum = Object.freeze({
  DEFAULT: 'Default',
  LARGE_TEXT: 'Large text',
  DARK_COLORS: 'Dark colors',
  ZERO_BORDER_RADIUS: 'No border-radius'
});

const StyledComponentsLink = Object.freeze<PackageLinkProps>({
  name: 'styled-components',
  href: 'https://www.styled-components.com'
});

const ThemeConfigMap = Object.freeze<{[key: string]: any}>({
  [ThemeEnum.DEFAULT]: undefined,
  [ThemeEnum.DARK_COLORS]: {
    color: {
      border: '#A8AEB4',
      textColor: '#000',
      primary: '#555555',
    },
    control: {
      boxShadowColor: 'rgba(85, 85, 85, 0.25)',
      focusedBorderColor: 'rgba(85, 85, 85, 0.75)',
    },
    icon: {
      color: '#A6A6A6',
    },
    menu: {
      option: {
        selectedColor: '#fff',
        selectedBgColor: '#555555',
        focusedBgColor: 'rgba(85, 85, 85, 0.225)',
      }
    }
  },
  [ThemeEnum.LARGE_TEXT]: {
    select: {
      fontSize: '1.25rem',
    },
  },
  [ThemeEnum.ZERO_BORDER_RADIUS]: {
    control: {
      borderRadius: '0',
    },
    menu: {
      borderRadius: '0',
    },
  },
});

storiesOf('React Functional Select', module).add('Styling', () => {
  const [themeConfig, setThemeConfig] = useState<Theme | undefined>(undefined);
  const [selectedOption, setSelectedOption] = useCallbackState<Option | null>(null);
  const menuItemSize = (selectedOption && selectedOption.value === ThemeEnum.LARGE_TEXT) ? 44 : 35;

  // Create theme options based upon key-value pairs in ThemeEnum object defined above
  const options = useMemo<Option[]>(() => {
    const results: Option[] = [];
    Object.keys(ThemeEnum).forEach((key: string): void => {
      results.push({
        value: ThemeEnum[key],
        label: ThemeEnum[key]
      });
    });
    return results;
  }, []);

  useEffect(() => {
    if (selectedOption) {
      const mappedThemeConfig = ThemeConfigMap[selectedOption.value];
      setThemeConfig(mappedThemeConfig);
    }
  }, [selectedOption]);

  useClearAllToasts();

  return (
    <Container>
      <Title>Styling</Title>
      <Hr />
      <SubTitle>Theming</SubTitle>
      <Paragraph>
        react-functional-select uses <PackageLink {...StyledComponentsLink} /> to handle its styling.
        The root node is wrapped in styled-component's <Code>&lt;ThemeProvider /&gt;</Code> wrapper
        component which gives all child styled-components access to the provided theme via React's
        context API. To override react-functional-select's default theme, pass an object to
        the <Code>themeConfig</Code> prop - any matching properties will replace those in the
        default theme.
      </Paragraph>
      <JsonContainer>
        <PrettyPrintJson
          header='Default Theme'
          data={ThemeDefaultValues}
        />
      </JsonContainer>
      <SubTitle>Using classNames</SubTitle>
      <Paragraph>
        If you want to style the component using CSS classes, set the <Code>addClassNames</Code> prop
        to true and it will then generate <Code>className</Code> attributes for that specific instance
        of the component. These are the classes that are available:
      </Paragraph>
      <ListWrapper>
        <List>
          <ListItem>
            <Code>{SELECT_CONTAINER_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{CONTROL_CONTAINER_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{MENU_CONTAINER_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{AUTOSIZE_INPUT_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{CARET_ICON_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{CLEAR_ICON_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{LOADING_DOTS_CLS}</Code>
          </ListItem>
          <ListItem>
            <Code>{OPTION_CLS}</Code>{', '}
            <Code>{OPTION_FOCUSED_CLS}</Code>{', '}
            <Code>{OPTION_SELECTED_CLS}</Code>{', '}
            <Code>{OPTION_DISABLED_CLS}</Code>
          </ListItem>
        </List>
      </ListWrapper>
      <SubTitle>Demo</SubTitle>
      <Hr />
      <Card>
        <CardHeader>
          <LabelHeader>Select themes below</LabelHeader>
        </CardHeader>
        <CardBody>
          <SelectContainer>
            <Select
              options={options}
              isClearable={false}
              isSearchable={false}
              themeConfig={themeConfig}
              initialValue={options[0]}
              menuItemSize={menuItemSize}
              onOptionChange={setSelectedOption}
            />
            <Spacer />
            <PrettyPrintJson
              data={themeConfig}
              header='Theme Config'
            />
          </SelectContainer>
        </CardBody>
      </Card>
    </Container>
  );
});