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
  font-size: 1.5rem;
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  letter-spacing: -0.5px;
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
  { path: '/monitoring', label: 'Analytics', icon: 'FaChartLine' },
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
        <Logo>Sales Advocate</Logo>
        
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
        </NavContainer>
      </SidebarContainer>
    </IconContext.Provider>
  );
};

export default Sidebar;