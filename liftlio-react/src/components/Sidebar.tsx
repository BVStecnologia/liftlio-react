import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const SidebarContainer = styled.aside`
  width: 240px;
  height: 100%;
  background: #2D1D42; /* Dark purple from reference */
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.lg};
  position: relative;
  z-index: ${props => props.theme.zIndices.sticky};
  transition: width ${props => props.theme.transitions.default};
`;

const Logo = styled.div`
  padding: 24px;
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 1px;
  position: relative;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
  color: #fff;
  text-transform: uppercase;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(110, 66, 229, 0.1), transparent);
    transform: translateX(-50%);
    z-index: -1;
    transition: width 0.5s ease;
  }
  
  /* Glowing particles */
  span {
    position: relative;
    z-index: 2;
  }
  
  /* Ambient glow particles */
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: radial-gradient(circle at 30% 50%, rgba(110, 66, 229, 0.1) 0%, transparent 45%),
                      radial-gradient(circle at 70% 50%, rgba(79, 172, 254, 0.1) 0%, transparent 45%);
    opacity: 0;
    transition: opacity 0.6s ease;
    z-index: 1;
    pointer-events: none;
  }
  
  &:hover {
    text-shadow: 0 0 15px rgba(79, 172, 254, 0.6), 0 0 25px rgba(79, 172, 254, 0.4);
    letter-spacing: 2px;
    
    &::before {
      width: 100%;
      background: linear-gradient(90deg, transparent, rgba(110, 66, 229, 0.2), transparent);
      animation: pulse 2s infinite;
    }
    
    &::after {
      opacity: 1;
      animation: shimmer 3s infinite alternate;
    }
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 0.4;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 100% 0%;
    }
  }
`;

const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0;
`;

// Removed ProjectSelector from Sidebar as it's now in Header

// Removed ProjectName as well

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 15px 24px;
  color: rgba(255, 255, 255, 0.7);
  transition: all ${props => props.theme.transitions.default};
  position: relative;
  text-decoration: none;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  &.active {
    color: white;
    background-color: rgba(255, 255, 255, 0.15);
    border-left: 4px solid ${props => props.theme.colors.tertiary};
  }

  svg {
    margin-right: 12px;
    font-size: 1.2rem;
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 10px 12px;
`;

const UpgradeButton = styled.div`
  margin-top: auto;
  padding: 16px 24px;
  background: linear-gradient(135deg, #8a54ff 0%, #4facfe 100%);
  color: white;
  font-weight: 700;
  text-align: center;
  border-radius: 12px;
  margin: 24px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 15px rgba(79, 172, 254, 0.3), 
              0 0 15px rgba(138, 84, 255, 0.2) inset;
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      transparent 100%);
    transition: left 0.7s ease;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 20px rgba(79, 172, 254, 0.4),
                0 0 20px rgba(138, 84, 255, 0.3) inset;
    
    &::before {
      left: 100%;
    }
  }
  
  svg {
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.7));
  }
`;

const NavItemIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 1.2rem;
`;

const AddButton = styled.button`
  background: ${props => props.theme.colors.gradient.accent};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radius.sm};
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all ${props => props.theme.transitions.springy};
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${props => props.theme.shadows.glow};
  }
`;

// Removing user section as per the reference image

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'FaHome' },
  { path: '/mentions', label: 'Mentions', icon: 'FaComments' },
  { path: '/youtube-monitoring', label: 'Monitoring', icon: 'FaYoutube' },
  { path: '/settings', label: 'Settings', icon: 'FaCog' },
  { path: '/integrations', label: 'Integrations', icon: 'FaPlug' }
];

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
};

const Sidebar: React.FC = () => {
  const [selectedProject] = React.useState({
    id: '1',
    name: 'Project 1',
    company: 'Acme Corp',
    link: 'www.acme.com',
    audience: 'Tech professionals'
  });
  
  return (
    <IconContext.Provider value={{ style: { marginRight: '10px' } }}>
      <SidebarContainer>
        <Logo><span data-text="Liftlio">Liftlio</span></Logo>
        
        <NavContainer>
          {navItems.map(item => (
            <NavItem 
              key={item.path}
              to={item.path} 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <NavItemIcon>
                <IconComponent icon={FaIcons[item.icon as keyof typeof FaIcons]} />
              </NavItemIcon>
              {item.label}
            </NavItem>
          ))}
          
          <div style={{ marginTop: 'auto', marginBottom: '24px' }}>
            <UpgradeButton>
              <NavItemIcon>
                <IconComponent icon={FaIcons.FaCrown} />
              </NavItemIcon>
              Upgrade
            </UpgradeButton>
          </div>
        </NavContainer>
      </SidebarContainer>
    </IconContext.Provider>
  );
};

export default Sidebar;