import 'styled-components';
import { ExtendedTheme } from './themeExtensions';

declare module 'styled-components' {
  export interface DefaultTheme extends ExtendedTheme {}
}