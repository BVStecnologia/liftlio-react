import React, { useState } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 24px;
  background-color: ${props => props.theme.colors.white};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.9);
`;

const ProjectSelector = styled.div`
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.secondary} 100%);
  color: white;
  padding: 10px 18px;
  border-radius: ${props => props.theme.radius.md};
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  box-shadow: 0 2px 8px rgba(94, 53, 177, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(94, 53, 177, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    margin-left: 8px;
  }
`;

const ProjectIcon = styled.span`
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const NotificationBadge = styled.div`
  position: relative;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.darkGrey};
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    background-color: ${props => props.theme.colors.error};
    border-radius: 50%;
    box-shadow: 0 0 0 2px white;
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: ${props => props.theme.radius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .user-icon {
    font-size: 2rem;
    color: ${props => props.theme.colors.primary};
    margin-right: 6px;
  }
  
  .dropdown-icon {
    font-size: 0.9rem;
    color: ${props => props.theme.colors.darkGrey};
    margin-left: 5px;
  }
`;

const SearchBar = styled.div`
  position: relative;
  flex: 0 1 300px;
  margin: 0 20px;
  
  input {
    width: 100%;
    padding: 10px 15px 10px 40px;
    border-radius: 20px;
    border: 1px solid ${props => props.theme.colors.grey};
    background-color: #f5f7f9;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(94, 53, 177, 0.2);
      background-color: white;
    }
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.colors.darkGrey};
    font-size: 1rem;
  }
`;

const Header: React.FC = () => {
  const [currentProject] = useState('projeto 2');
  
  return (
    <HeaderContainer>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ProjectSelector>
          <ProjectIcon>
            {React.createElement(FaIcons.FaProjectDiagram)}
          </ProjectIcon>
          {currentProject}
          <span style={{ marginLeft: '8px' }}>
            {React.createElement(FaIcons.FaAngleDown)}
          </span>
        </ProjectSelector>
        
        <SearchBar>
          <input type="text" placeholder="Search..." />
          <span className="search-icon">
            {React.createElement(FaIcons.FaSearch)}
          </span>
        </SearchBar>
      </div>
      
      <RightSection>
        <NotificationBadge>
          {React.createElement(FaIcons.FaBell)}
        </NotificationBadge>
        <UserProfile>
          <span className="user-icon">
            {React.createElement(FaIcons.FaUserCircle)}
          </span>
          <span className="dropdown-icon">
            {React.createElement(FaIcons.FaAngleDown)}
          </span>
        </UserProfile>
      </RightSection>
    </HeaderContainer>
  );
};

export default Header;