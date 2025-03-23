import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { useLocation, Link } from 'react-router-dom';
import { sidebarHoverEffect } from '../../styles/animations';

interface SidebarProps {
  children: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  to: string;
  collapsed?: boolean;
  badge?: number | string;
  badgeColor?: 'success' | 'warning' | 'error' | 'info';
}

const SidebarContainer = styled.div<{ collapsed: boolean }>`
  position: fixed;
  height: 100vh;
  width: ${props => (props.collapsed ? '64px' : '240px')};
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.secondary};
  transition: width 0.3s ease;
  overflow-x: hidden;
  z-index: ${props => props.theme.zIndices.sticky};
  box-shadow: ${props => props.theme.shadows.md};
`;

const SidebarHeader = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 ${props => props.theme.spacing.md};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const SidebarLogo = styled.div<{ collapsed: boolean }>`
  display: flex;
  align-items: center;
  
  img {
    height: 32px;
    width: 32px;
  }
  
  span {
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    margin-left: ${props => props.theme.spacing.sm};
    white-space: nowrap;
    opacity: ${props => (props.collapsed ? 0 : 1)};
    transition: opacity 0.3s ease;
  }
`;

const SidebarToggle = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.secondary};
  cursor: pointer;
  margin-left: auto;
  font-size: ${props => props.theme.fontSizes.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.radius.circle};
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const SidebarContent = styled.div`
  padding: ${props => props.theme.spacing.md} 0;
  height: calc(100vh - 64px);
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: ${props => props.theme.radius.pill};
  }
`;

const SidebarItemContainer = styled(Link)<{ active: boolean; collapsed: boolean }>`
  display: flex;
  align-items: center;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.radius.md};
  text-decoration: none;
  color: ${props => props.theme.colors.secondary};
  background-color: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  ${sidebarHoverEffect}
  
  .sidebar-item-icon {
    min-width: 24px;
    display: flex;
    justify-content: center;
    font-size: ${props => props.theme.fontSizes.xl};
  }
  
  .sidebar-item-label {
    margin-left: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    white-space: nowrap;
    opacity: ${props => (props.collapsed ? 0 : 1)};
    transition: opacity 0.3s ease;
  }
  
  .sidebar-item-badge {
    margin-left: auto;
    background-color: ${props => {
      switch (props.color) {
        case 'success': return props.theme.colors.success;
        case 'warning': return props.theme.colors.warning;
        case 'error': return props.theme.colors.error;
        case 'info': return props.theme.colors.info;
        default: return props.theme.colors.primary;
      }
    }};
    color: ${props => props.theme.colors.secondary};
    padding: 2px 8px;
    border-radius: ${props => props.theme.radius.pill};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.bold};
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${props => (props.collapsed ? 0 : 1)};
    transition: opacity 0.3s ease;
  }
`;

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  to, 
  collapsed = false, 
  badge,
  badgeColor = 'info'
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <SidebarItemContainer to={to} active={isActive} collapsed={collapsed} color={badgeColor}>
      {icon && <div className="sidebar-item-icon">{icon}</div>}
      <div className="sidebar-item-label">{label}</div>
      {badge && <div className="sidebar-item-badge">{badge}</div>}
    </SidebarItemContainer>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  children, 
  collapsed = false, 
  onToggle 
}) => {
  return (
    <SidebarContainer collapsed={collapsed}>
      <SidebarHeader>
        <SidebarLogo collapsed={collapsed}>
          <img src="/logo192.png" alt="Logo" />
          <span>Liftlio</span>
        </SidebarLogo>
        {onToggle && (
          <SidebarToggle onClick={onToggle}>
            {collapsed ? '➡️' : '⬅️'}
          </SidebarToggle>
        )}
      </SidebarHeader>
      <SidebarContent>
        {children}
      </SidebarContent>
    </SidebarContainer>
  );
};

export default Sidebar;