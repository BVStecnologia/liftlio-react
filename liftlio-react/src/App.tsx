import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import GlobalStyle from './styles/GlobalStyle';
import { theme } from './styles/theme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import Monitoring from './pages/Monitoring';
import Mentions from './pages/Mentions';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import YoutubeMonitoring from './pages/YoutubeMonitoring';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from './utils/IconHelper';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  
  @media (min-width: 769px) {
    flex-direction: row;
  }
  
  /* Applied to fix any possible issues with sidebar */
  position: relative;
  z-index: 0;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  background-color: ${props => props.theme.colors.background};
  width: 100%;
  
  @media (max-width: 768px) {
    padding-bottom: 60px; /* Space for mobile navigation button */
  }
`;

const ContentWrapper = styled.div`
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 16px 12px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 8px;
  }
`;

const MobileNavToggle = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${props => props.theme.shadows.md};
  z-index: 1001; /* Higher than sidebar (1000) to always be visible */
  border: none;
  font-size: 1.4rem;
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (min-width: 769px) {
    display: none;
  }
  
  @media (max-width: 480px) {
    width: 56px;
    height: 56px;
    bottom: 16px;
    right: 16px;
  }
`;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <AppContainer>
          {/* Sidebar - desktop mode it's controlled by media query, mobile by state */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
          <MainContent>
            <Header />
            <ContentWrapper>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/mentions" element={<Mentions />} />
                <Route path="/youtube-monitoring" element={<YoutubeMonitoring />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/integrations" element={<Integrations />} />
              </Routes>
            </ContentWrapper>
          </MainContent>
          
          {/* Mobile navigation toggle button - always shows hamburger icon */}
          <MobileNavToggle onClick={toggleSidebar}>
            <IconComponent icon={FaIcons.FaBars} />
          </MobileNavToggle>
        </AppContainer>
      </Router>
    </ThemeProvider>
  );
}

export default App;
