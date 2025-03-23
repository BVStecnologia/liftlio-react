import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    
    @media (max-width: 1200px) {
      font-size: 15px;
    }
    
    @media (max-width: 768px) {
      font-size: 14px;
    }
    
    @media (max-width: 480px) {
      font-size: 13px;
    }
  }

  body {
    font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    width: 100%;
    position: relative;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  a {
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
  
  /* Improve touch interactions on mobile */
  input, 
  button, 
  select, 
  textarea {
    font-family: inherit;
    font-size: inherit;
  }
  
  /* For better accessibility */
  :focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
  
  /* Improve scrolling experience */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.tertiaryLight};
    border-radius: 8px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.tertiary};
    border-radius: 8px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.tertiaryDark};
  }
  
  @media (max-width: 768px) {
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
  }
`;

export default GlobalStyle;