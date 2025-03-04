import React from 'react';
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

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  background-color: ${props => props.theme.colors.background};
`;

const ContentWrapper = styled.div`
  padding: 20px;
`;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Router>
        <AppContainer>
          <Sidebar />
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
        </AppContainer>
      </Router>
    </ThemeProvider>
  );
}

export default App;
