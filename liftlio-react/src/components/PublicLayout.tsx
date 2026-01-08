import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
`;

const Header = styled.header`
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: white;
  font-size: 24px;
  font-weight: 800;
  
  &:hover {
    color: #8b5cf6;
  }
  
  svg {
    width: 32px;
    height: 32px;
    stroke: #8b5cf6;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 32px;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    color: #8b5cf6;
  }

  &.active {
    color: #8b5cf6;
  }
`;

const TrendsLabel = styled.span`
  position: absolute;
  top: -8px;
  right: -28px;
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  color: white;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MainContent = styled.main`
  flex: 1;
  width: 100%;
`;

const Footer = styled.footer`
  background: rgba(10, 10, 10, 0.95);
  border-top: 1px solid rgba(139, 92, 246, 0.2);
  padding: 48px 0 24px;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const FooterBrand = styled.div`
  max-width: 300px;
`;

const FooterLogo = styled.div`
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
`;

const FooterDescription = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  line-height: 1.6;
`;

const FooterColumn = styled.div`
  h3 {
    color: #8b5cf6;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }
`;

const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    margin-bottom: 12px;
  }

  a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s ease;

    &:hover {
      color: #8b5cf6;
    }
  }
`;


const FooterBottom = styled.div`
  max-width: 1200px;
  margin: 60px auto 0;
  padding-top: 32px;
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
`;

const Copyright = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  margin: 0;
`;


interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const currentPath = window.location.pathname;

  return (
    <LayoutContainer>
      <Header>
        <HeaderContent>
          <Logo to="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            LIFTLIO
          </Logo>
          
          <Nav>
            <NavLink to="/liftlio-analytics" className={currentPath === '/liftlio-analytics' ? 'active' : ''}>
              Analytics
            </NavLink>
            {currentPath !== '/trends' && (
              <NavLink to="/trends" className={currentPath === '/trends' ? 'active' : ''} style={{ position: 'relative' }}>
                Trends
                <TrendsLabel>NEW</TrendsLabel>
              </NavLink>
            )}
            <NavLink to="/#features">Features</NavLink>
            <NavLink to="/#pricing">Pricing</NavLink>
            <NavLink to="/login" style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              padding: '8px 24px',
              borderRadius: '8px',
              color: 'white'
            }}>
              Sign In
            </NavLink>
          </Nav>
        </HeaderContent>
      </Header>

      <MainContent>
        {children}
      </MainContent>

      <Footer>
        <FooterContent>
          <FooterBrand>
            <FooterLogo>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '900'
              }}>LIFTLIO</span>
              <span style={{
                display: 'inline-block',
                background: 'rgba(129, 140, 248, 0.1)',
                border: '1px solid rgba(129, 140, 248, 0.2)',
                color: '#818cf8',
                padding: '3px 10px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginLeft: '10px',
                transition: 'all 0.3s'
              }}>Beta</span>
            </FooterLogo>
            <FooterDescription>
              AI-powered platform to scale word-of-mouth recommendations without paying for ads.
            </FooterDescription>
          </FooterBrand>
          
          <FooterColumn>
            <h3>Product</h3>
            <FooterLinks>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#api">API Documentation</a></li>
            </FooterLinks>
          </FooterColumn>
          
          <FooterColumn>
            <h3>Company</h3>
            <FooterLinks>
              <li><a href="/about">About</a></li>
              <li><a href="https://blog.liftlio.com" target="_blank" rel="noopener noreferrer">Blog</a></li>
              <li><a href="/careers">Careers</a></li>
            </FooterLinks>
          </FooterColumn>
          
          <FooterColumn>
            <h3>Legal</h3>
            <FooterLinks>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/security">Security</a></li>
            </FooterLinks>
          </FooterColumn>
        </FooterContent>
        
        <FooterBottom>
          <Copyright>
            © 2024 Liftlio. All rights reserved.
          </Copyright>
        </FooterBottom>
      </Footer>
    </LayoutContainer>
  );
};

export default PublicLayout;