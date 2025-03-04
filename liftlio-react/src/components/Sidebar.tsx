import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { IconContext } from 'react-icons';
import * as FaIcons from 'react-icons/fa';

const SidebarContainer = styled.aside`
  width: 240px;
  height: 100%;
  background: linear-gradient(180deg, #2e1259 0%, #3d1c70 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 3px 0 10px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
`;

const Logo = styled.div`
  padding: 24px 20px;
  font-size: 1.5rem;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.15);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  
  &::before {
    content: '';
    display: block;
    width: 8px;
    height: 24px;
    background: #8561c5;
    margin-right: 12px;
    border-radius: 4px;
  }
`;

const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 10px 0;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    transform: translateX(4px);
  }
  
  &.active {
    background: rgba(133, 97, 197, 0.25);
    color: white;
    border-left: 4px solid #8561c5;
    
    &::after {
      content: '';
      position: absolute;
      right: 0;
      height: 100%;
      width: 6px;
      background-color: #8561c5;
      top: 0;
    }
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

const navItems = [
  { path: '/', label: 'Overview', icon: 'FaHome' },
  { path: '/monitoring', label: 'Monitoring', icon: 'FaChartBar' },
  { path: '/mentions', label: 'Mentions', icon: 'FaComments' },
  { path: '/settings', label: 'Settings', icon: 'FaCog' },
  { path: '/integrations', label: 'Integrations', icon: 'FaPlug' }
];

const Sidebar: React.FC = () => {
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
                {React.createElement(FaIcons[item.icon as keyof typeof FaIcons])}
              </NavItemIcon>
              {item.label}
            </NavItem>
          ))}
        </NavContainer>
        <Divider />
      </SidebarContainer>
    </IconContext.Provider>
  );
};

export default Sidebar;