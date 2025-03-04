import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaCog, FaUser, FaBell, FaPalette, FaShieldAlt } from 'react-icons/fa';

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
`;

const SettingsContainer = styled.div`
  display: flex;
  gap: 30px;
`;

const TabsContainer = styled.div`
  width: 250px;
`;

const ContentContainer = styled.div`
  flex: 1;
`;

const TabItem = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: ${props => props.theme.radius.md};
  background-color: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.lightGrey};
  }
  
  svg {
    margin-right: 10px;
    font-size: 1.2rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes.xl};
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.darkGrey};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  transition: all 0.3s ease;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 120px;
  resize: vertical;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.2);
  }
`;

const ColorOption = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.color};
  margin-right: 10px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => props.theme.colors.white};
  transition: all 0.3s ease;
  
  &.active {
    border-color: ${props => props.theme.colors.darkGrey};
    transform: scale(1.1);
  }
`;

const ColorsContainer = styled.div`
  display: flex;
  margin-top: 10px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.grey};
    transition: .4s;
    border-radius: 34px;
    
    &:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
  
  input:checked + span {
    background-color: ${props => props.theme.colors.primary};
  }
  
  input:focus + span {
    box-shadow: 0 0 1px ${props => props.theme.colors.primary};
  }
  
  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const KeywordsContainer = styled.div`
  margin-top: 20px;
`;

const KeywordItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 10px;
`;

const KeywordText = styled.div`
  font-weight: ${props => props.theme.fontWeights.medium};
`;

const DeactivateButton = styled.button`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.darkGrey};
  color: ${props => props.theme.colors.darkGrey};
  padding: 5px 10px;
  border-radius: ${props => props.theme.radius.sm};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.error};
    border-color: ${props => props.theme.colors.error};
    color: white;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f7;
  border: none;
  color: ${props => props.theme.colors.primary};
  padding: 10px 15px;
  border-radius: ${props => props.theme.radius.md};
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.medium};
  margin-bottom: 20px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #e8e8f0;
  }
  
  svg {
    margin-right: 5px;
  }
`;

const FormRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  > div {
    flex: 1;
  }
`;

const ThemePreview = styled.div`
  margin-top: 20px;
  background-color: white;
  border-radius: ${props => props.theme.radius.md};
  padding: 20px;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const ThemePreviewHeader = styled.div`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  padding: 12px 20px;
  border-radius: ${props => props.theme.radius.md};
  margin-bottom: 20px;
  font-weight: ${props => props.theme.fontWeights.semiBold};
`;

const ThemePreviewContent = styled.div`
  padding: 10px;
`;

const ThemePreviewText = styled.p`
  margin-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

// Sample data
const activeKeywords = [
  'ai affiliate marketing',
  'passive income with ai',
  'ai product reviews'
];

const colors = [
  { name: 'Purple', value: '#5e35b1' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Orange', value: '#ff9800' },
  { name: 'Red', value: '#f44336' }
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('project');
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const renderIcon = (IconComponent: React.ComponentType) => {
    return <IconComponent />;
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons', style: { marginRight: '10px' } }}>
      <div>
        <PageTitle>Settings</PageTitle>
        
        <SettingsContainer>
          <TabsContainer>
            <TabItem 
              active={activeTab === 'project'} 
              onClick={() => setActiveTab('project')}
            >
              {renderIcon(FaCog)}
              Project
            </TabItem>
            <TabItem 
              active={activeTab === 'account'} 
              onClick={() => setActiveTab('account')}
            >
              {renderIcon(FaUser)}
              Account
            </TabItem>
            <TabItem 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')}
            >
              {renderIcon(FaBell)}
              Notifications
            </TabItem>
            <TabItem 
              active={activeTab === 'interface'} 
              onClick={() => setActiveTab('interface')}
            >
              {renderIcon(FaPalette)}
              Interface
            </TabItem>
            <TabItem 
              active={activeTab === 'security'} 
              onClick={() => setActiveTab('security')}
            >
              {renderIcon(FaShieldAlt)}
              Security
            </TabItem>
          </TabsContainer>
          
          <ContentContainer>
            {activeTab === 'project' && (
              <Card>
                <SectionTitle>Project Settings</SectionTitle>
                
                <FormRow>
                  <FormGroup>
                    <Label htmlFor="projectName">Project name</Label>
                    <Input 
                      id="projectName" 
                      type="text" 
                      defaultValue="projeto 2" 
                    />
                  </FormGroup>
                  
                  <FormGroup>
                    <Label htmlFor="projectLink">Project link</Label>
                    <Input 
                      id="projectLink" 
                      type="url" 
                      defaultValue="https://humanlikewriter.com" 
                    />
                  </FormGroup>
                </FormRow>
                
                <FormGroup>
                  <Label htmlFor="companyName">Company or product name</Label>
                  <Input 
                    id="companyName" 
                    type="text" 
                    placeholder="Company or product name" 
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="audienceDescription">Audience description</Label>
                  <TextArea 
                    id="audienceDescription" 
                    defaultValue="Humanlike Writer is for Affiliate Marketers who need content for their website to increase affiliate commissions. Humanlike Writer is an AI writer the mimics human writing that sounds like a person actually tested the product. More genuine-sounding content increases trust and conversions. Right now you can get 3 free articles to test out the ai writer."
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="region">Region</Label>
                  <Select id="region" defaultValue="US">
                    <option value="US">US</option>
                    <option value="EU">EU</option>
                    <option value="UK">UK</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="BR">Brazil</option>
                  </Select>
                </FormGroup>
                
                <FormGroup>
                  <Label>Keywords Active</Label>
                  <KeywordsContainer>
                    {activeKeywords.map(keyword => (
                      <KeywordItem key={keyword}>
                        <KeywordText>{keyword}</KeywordText>
                        <DeactivateButton>Deactivate</DeactivateButton>
                      </KeywordItem>
                    ))}
                  </KeywordsContainer>
                  <AddButton>+ Add new</AddButton>
                </FormGroup>
                
                <FormGroup>
                  <Label>Negative keywords</Label>
                  <AddButton>+ Add new</AddButton>
                </FormGroup>
              </Card>
            )}
            
            {activeTab === 'interface' && (
              <Card>
                <SectionTitle>Interface Settings</SectionTitle>
                
                <FormGroup>
                  <Label>Primary Color</Label>
                  <ColorsContainer>
                    {colors.map(color => (
                      <ColorOption 
                        key={color.name}
                        color={color.value}
                        className={selectedColor === color.value ? 'active' : ''}
                        onClick={() => setSelectedColor(color.value)}
                      />
                    ))}
                  </ColorsContainer>
                </FormGroup>
                
                <FormGroup>
                  <Label>Color Mode</Label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ToggleSwitch>
                      <input 
                        type="checkbox" 
                        checked={isDarkMode}
                        onChange={() => setIsDarkMode(!isDarkMode)}
                      />
                      <span />
                    </ToggleSwitch>
                    <span style={{ marginLeft: '10px' }}>
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                </FormGroup>
                
                <ThemePreview>
                  <SectionTitle>Theme Preview</SectionTitle>
                  <ThemePreviewHeader style={{ backgroundColor: selectedColor }}>
                    Dashboard
                  </ThemePreviewHeader>
                  <ThemePreviewContent>
                    <ThemePreviewText>
                      Welcome back, User!
                    </ThemePreviewText>
                    <ThemePreviewText>
                      This preview shows how your selected theme settings will look 
                      when applied to the dashboard. Adjust the settings on the left to 
                      see changes reflected here.
                    </ThemePreviewText>
                  </ThemePreviewContent>
                </ThemePreview>
              </Card>
            )}
          </ContentContainer>
        </SettingsContainer>
      </div>
    </IconContext.Provider>
  );
};

export default Settings;