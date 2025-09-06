import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { IconComponent } from '../utils/IconHelper';
import { FaTwitter, FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa';

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
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 48px;
  margin-bottom: 48px;
`;

const FooterSection = styled.div`
  h3 {
    color: #8b5cf6;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid rgba(139, 92, 246, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const Copyright = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  margin: 0;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 20px;

  a {
    color: rgba(255, 255, 255, 0.4);
    font-size: 20px;
    transition: color 0.3s ease;

    &:hover {
      color: #8b5cf6;
    }
  }
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
          <FooterGrid>
            <FooterSection>
              <h3>Product</h3>
              <ul>
                <li><Link to="/liftlio-analytics">Analytics</Link></li>
                <li><Link to="/trends">YouTube Trends</Link></li>
                <li><Link to="/#features">Features</Link></li>
                <li><Link to="/#pricing">Pricing</Link></li>
              </ul>
            </FooterSection>

            <FooterSection>
              <h3>Company</h3>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><a href="https://blog.liftlio.com" target="_blank" rel="noopener noreferrer">Blog</a></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
              </ul>
            </FooterSection>

            <FooterSection>
              <h3>Support</h3>
              <ul>
                <li><a href="mailto:support@liftlio.com">Contact Us</a></li>
                <li><a href="https://docs.liftlio.com" target="_blank" rel="noopener noreferrer">Documentation</a></li>
                <li><Link to="/security">Security</Link></li>
              </ul>
            </FooterSection>

            <FooterSection>
              <h3>Stay Updated</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '16px' }}>
                Get the latest trends and insights delivered to your inbox.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    flex: 1,
                    fontSize: '14px'
                  }}
                />
                <button
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Subscribe
                </button>
              </div>
            </FooterSection>
          </FooterGrid>

          <FooterBottom>
            <Copyright>
              © 2025 Liftlio. All rights reserved.
            </Copyright>
            <SocialLinks>
              <a href="https://twitter.com/liftlio" target="_blank" rel="noopener noreferrer">
                <IconComponent icon={FaTwitter} />
              </a>
              <a href="https://linkedin.com/company/liftlio" target="_blank" rel="noopener noreferrer">
                <IconComponent icon={FaLinkedin} />
              </a>
              <a href="https://github.com/liftlio" target="_blank" rel="noopener noreferrer">
                <IconComponent icon={FaGithub} />
              </a>
              <a href="mailto:contact@liftlio.com">
                <IconComponent icon={FaEnvelope} />
              </a>
            </SocialLinks>
          </FooterBottom>
        </FooterContent>
      </Footer>
    </LayoutContainer>
  );
};

export default PublicLayout;