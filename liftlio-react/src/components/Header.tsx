import React, { useState } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import ProjectModal from './ProjectModal';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: ${props => props.theme.colors.white};
  box-shadow: ${props => props.theme.shadows.sm};
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: ${props => props.theme.zIndices.sticky};
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
`;

const ProjectSelector = styled.div`
  display: flex;
  align-items: center;
  background: #2D1D42; /* Same as sidebar color */
  color: white;
  padding: 10px 18px;
  border-radius: ${props => props.theme.radius.md};
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all ${props => props.theme.transitions.default};
  
  &:hover {
    transform: translateY(-2px);
    background: #3a2655; /* Slightly lighter version of sidebar color */
    box-shadow: ${props => props.theme.shadows.md};
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

const AddProjectButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: ${props => props.theme.radius.md};
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-weight: ${props => props.theme.fontWeights.medium};
  font-size: ${props => props.theme.fontSizes.sm};
  margin-right: 20px; /* Position it at the header right section */
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  
  svg {
    margin-right: 6px;
    font-size: 0.9rem;
  }
`;

const SearchBar = styled.div`
  position: relative;
  flex: 0 1 300px;
  margin: 0 20px;
  
  input {
    width: 100%;
    padding: 10px 15px 10px 40px;
    border-radius: ${props => props.theme.radius.pill};
    border: 1px solid ${props => props.theme.colors.lightGrey};
    background-color: ${props => props.theme.colors.background};
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all ${props => props.theme.transitions.default};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary};
      box-shadow: 0 0 0 2px rgba(78, 14, 179, 0.15);
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

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
};

const Header: React.FC = () => {
  const [currentProject] = useState('Projeto 1');
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  const handleAddProject = (project: Project) => {
    // Aqui você implementaria a lógica para adicionar o projeto
    console.log('Novo projeto:', project);
    setShowProjectModal(false);
  };
  
  return (
    <>
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
          <AddProjectButton onClick={() => setShowProjectModal(true)}>
            {React.createElement(FaIcons.FaPlus)}
            Add new project
          </AddProjectButton>
          
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
      
      <ProjectModal 
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleAddProject}
      />
    </>
  );
};

export default Header;