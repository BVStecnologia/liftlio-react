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

  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    background-color: ${props => props.theme.colors.bg.primary} !important;
    width: 100% !important;
    height: 100% !important;
  }

  body {
    font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
    color: ${props => props.theme.colors.text.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
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
    outline: 2px solid ${props => props.theme.colors.accent.primary};
    outline-offset: 2px;
  }
  
  /* Improve scrolling experience */
  ::-webkit-scrollbar {
    width: 8px !important;
    height: 8px !important;
  }
  
  ::-webkit-scrollbar-track {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)'} !important;
    border-radius: 8px !important;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)'} !important;
    border-radius: 8px !important;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.3)'} !important;
  }
  
  /* Apply to all elements including body and html to ensure consistency */
  *, html, body {
    scrollbar-width: thin;
    scrollbar-color: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)'};
  }
  
  *::-webkit-scrollbar,
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: 8px !important;
    height: 8px !important;
  }
  
  *::-webkit-scrollbar-track,
  html::-webkit-scrollbar-track,
  body::-webkit-scrollbar-track {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.05)'} !important;
    border-radius: 8px !important;
  }
  
  *::-webkit-scrollbar-thumb,
  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)'} !important;
    border-radius: 8px !important;
  }
  
  *::-webkit-scrollbar-thumb:hover,
  html::-webkit-scrollbar-thumb:hover,
  body::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.3)'} !important;
  }
  
  @media (max-width: 768px) {
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
  }
  
  /* Page components styling */
  h1, h2, h3, h4, h5, h6 {
    color: ${props => props.theme.colors.text.primary};
    font-weight: 600;
    margin-bottom: 0.5em;
  }

  p {
    color: ${props => props.theme.colors.text.primary};
    line-height: 1.6;
  }
  
  /* Main content container - applies the dominant color (60%) as background */
  main {
    background-color: ${props => props.theme.colors.bg.primary};
  }

  /* Card components - apply the secondary color (30%) */
  .card, .stat-card, .data-card {
    background-color: ${props => props.theme.colors.bg.secondary};
    border: 1px solid ${props => props.theme.colors.border.primary};
    border-radius: 8px;
    box-shadow: ${props => props.theme.colors.shadow.sm};
  }

  /* Buttons, links, and interactive elements - apply the accent color (10%) */
  .accent-element {
    color: ${props => props.theme.colors.accent.primary};
  }

  /* Header components usually have white background (secondary color - 30%) */
  header {
    background-color: ${props => props.theme.components.header.bg};
    border-bottom: 1px solid ${props => props.theme.components.header.border};
  }
`;

export default GlobalStyle;