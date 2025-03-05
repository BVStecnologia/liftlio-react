import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import * as FaIcons from 'react-icons/fa';
import ProjectModal from './ProjectModal';
import { IconComponent } from '../utils/IconHelper';

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
  z-index: 900; /* High but lower than sidebar (1000) */
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);

  @media (max-width: 768px) {
    padding: 10px 16px;
    flex-wrap: wrap;
  }
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

  @media (max-width: 768px) {
    padding: 8px 14px;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    padding: 6px 12px;
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

  @media (max-width: 768px) {
    gap: 16px;
  }

  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const PopupMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  width: 250px;
  background-color: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: ${props => props.theme.zIndices.dropdown};
  overflow: hidden;
  margin-top: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);

  @media (max-width: 480px) {
    width: 200px;
  }
`;

const PopupMenuItem = styled.div`
  padding: 12px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  position: relative;
  border-left: 3px solid transparent;

  &:hover {
    background-color: rgba(45, 29, 66, 0.04);
    border-left: 3px solid ${props => props.theme.colors.primary || '#2D1D42'};
  }

  &:active {
    background-color: rgba(45, 29, 66, 0.08);
  }

  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
    opacity: 0.7;
  }
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

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    
    svg {
      font-size: 1.1rem;
    }
  }
`;

const NotificationPopup = styled(PopupMenu)`
  width: 330px;
  max-height: 400px;
  overflow-y: auto;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 16px;
    width: 12px;
    height: 12px;
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 768px) {
    width: 290px;
  }

  @media (max-width: 480px) {
    width: 260px;
    right: -100px;
  }
`;

const NotificationItem = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: rgba(45, 29, 66, 0.03);
  }

  &:last-child {
    border-bottom: none;
  }
  
  h4 {
    font-weight: ${props => props.theme.fontWeights.medium};
    margin: 0 0 6px 0;
    font-size: 0.9rem;
    color: #2D1D42;
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${props => props.theme.colors.darkGrey};
    line-height: 1.4;
  }
  
  time {
    display: block;
    font-size: 0.75rem;
    color: ${props => props.theme.colors.grey};
    margin-top: 8px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 18px;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-top: 2px solid #ccc;
    border-right: 2px solid #ccc;
    transform: translateY(-50%) rotate(45deg);
  }
`;

const PopupHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-weight: ${props => props.theme.fontWeights.medium};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(245, 245, 250, 0.5);
  font-size: 0.95rem;
  color: #2D1D42;
  
  span {
    font-size: 0.8rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: ${props => props.theme.radius.md};
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .user-icon {
    font-size: 2rem;
    color: ${props => props.theme.colors.primary};
  }

  @media (max-width: 480px) {
    padding: 4px 8px;
    
    .user-icon {
      font-size: 1.8rem;
    }
  }
`;

const UserPopup = styled(PopupMenu)`
  width: 220px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 16px;
    width: 12px;
    height: 12px;
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 480px) {
    width: 190px;
  }
`;

const UserInfo = styled.div`
  padding: 18px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  text-align: center;
  background-color: rgba(245, 245, 250, 0.3);
  
  h4 {
    margin: 10px 0 5px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: #2D1D42;
  }
  
  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${props => props.theme.colors.darkGrey};
  }
  
  .user-avatar {
    font-size: 3rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
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

  @media (max-width: 768px) {
    margin-right: 12px;
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  @media (max-width: 480px) {
    padding: 5px 8px;
    font-size: 0.75rem;
    
    svg {
      font-size: 0.8rem;
    }
  }
`;

const LanguageSelector = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: ${props => props.theme.radius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.darkGrey};
    margin-right: 5px;
  }

  @media (max-width: 768px) {
    padding: 4px 8px;
  }

  @media (max-width: 480px) {
    padding: 4px 6px;
    
    svg {
      font-size: 1.1rem;
    }
  }
`;

const LanguagePopup = styled(PopupMenu)`
  width: 160px;
  right: -50px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    right: 50px;
    width: 12px;
    height: 12px;
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 480px) {
    width: 130px;
  }
`;

const ProjectsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: ${props => props.theme.zIndices.dropdown};
  width: 280px;
  background-color: white;
  border-radius: ${props => props.theme.radius.md};
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  margin-top: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  &:before {
    content: '';
    position: absolute;
    top: -6px;
    left: 40px;
    width: 12px;
    height: 12px;
    background: white;
    transform: rotate(45deg);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 480px) {
    width: 240px;
  }
`;

const ProjectItem = styled.div`
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  border-left: 3px solid transparent;
  
  &:hover {
    background-color: rgba(45, 29, 66, 0.05);
    border-left: 3px solid ${props => props.theme.colors.primary || '#2D1D42'};
  }
  
  &:active {
    background-color: rgba(45, 29, 66, 0.08);
  }
  
  svg {
    margin-right: 12px;
    font-size: 1rem;
    color: ${props => props.theme.colors.primary || '#2D1D42'};
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
  const [currentProject, setCurrentProject] = useState('Projeto 1');
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  const projectsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  
  // Mock data for dropdowns
  const projects = [
    { id: '1', name: 'Project 1' },
    { id: '2', name: 'Project 2' },
    { id: '3', name: 'Project 3' }
  ];
  
  const notifications = [
    { id: '1', title: 'New mention', message: 'Your product was mentioned on Twitter', time: '2 hours ago' },
    { id: '2', title: 'Sentiment analysis', message: 'New analysis available for review', time: '5 hours ago' },
    { id: '3', title: 'Weekly report', message: 'Your weekly report is ready', time: '1 day ago' }
  ];
  
  const handleAddProject = (project: Project) => {
    console.log('Novo projeto:', project);
    setShowProjectModal(false);
  };
  
  const handleProjectSelect = (project: { id: string, name: string }) => {
    setCurrentProject(project.name);
    setShowProjectsDropdown(false);
  };
  
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    setShowLanguageMenu(false);
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectsRef.current && !projectsRef.current.contains(event.target as Node)) {
        setShowProjectsDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <>
      <HeaderContainer>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={projectsRef} style={{ position: 'relative' }}>
            <ProjectSelector onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}>
              <ProjectIcon>
                <IconComponent icon={FaIcons.FaProjectDiagram} />
              </ProjectIcon>
              {currentProject}
            </ProjectSelector>
            
            {showProjectsDropdown && (
              <ProjectsDropdown>
                <PopupHeader>Your Projects</PopupHeader>
                {projects.map(project => (
                  <ProjectItem key={project.id} onClick={() => handleProjectSelect(project)}>
                    <IconComponent icon={FaIcons.FaFolder} />
                    {project.name}
                  </ProjectItem>
                ))}
              </ProjectsDropdown>
            )}
          </div>
        </div>
        
        <RightSection>
          <AddProjectButton onClick={() => setShowProjectModal(true)}>
            <IconComponent icon={FaIcons.FaPlus} />
            Add new project
          </AddProjectButton>
          
          <div ref={notificationsRef} style={{ position: 'relative' }}>
            <NotificationBadge onClick={() => setShowNotifications(!showNotifications)}>
              <IconComponent icon={FaIcons.FaBell} />
            </NotificationBadge>
            
            {showNotifications && (
              <NotificationPopup>
                <PopupHeader>
                  Notifications
                  <span>Mark all as read</span>
                </PopupHeader>
                {notifications.map(notification => (
                  <NotificationItem key={notification.id}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <time>{notification.time}</time>
                  </NotificationItem>
                ))}
              </NotificationPopup>
            )}
          </div>
          
          <div ref={languageRef} style={{ position: 'relative' }}>
            <LanguageSelector onClick={() => setShowLanguageMenu(!showLanguageMenu)}>
              <IconComponent icon={FaIcons.FaGlobe} />
              {currentLanguage}
            </LanguageSelector>
            
            {showLanguageMenu && (
              <LanguagePopup>
                <PopupMenuItem onClick={() => handleLanguageChange('EN')}>
                  <IconComponent icon={FaIcons.FaFlag} />
                  English
                </PopupMenuItem>
                <PopupMenuItem onClick={() => handleLanguageChange('PT')}>
                  <IconComponent icon={FaIcons.FaFlag} />
                  Português
                </PopupMenuItem>
              </LanguagePopup>
            )}
          </div>
          
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <UserProfile onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="user-icon">
                <IconComponent icon={FaIcons.FaUserCircle} />
              </span>
            </UserProfile>
            
            {showUserMenu && (
              <UserPopup>
                <UserInfo>
                  <span className="user-avatar">
                    <IconComponent icon={FaIcons.FaUserCircle} />
                  </span>
                  <h4>John Doe</h4>
                  <p>john.doe@example.com</p>
                </UserInfo>
                <PopupMenuItem>
                  <IconComponent icon={FaIcons.FaUser} />
                  Profile
                </PopupMenuItem>
                <PopupMenuItem>
                  <IconComponent icon={FaIcons.FaCog} />
                  Settings
                </PopupMenuItem>
                <PopupMenuItem>
                  <IconComponent icon={FaIcons.FaSignOutAlt} />
                  Logout
                </PopupMenuItem>
              </UserPopup>
            )}
          </div>
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