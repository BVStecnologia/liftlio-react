import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from './Modal';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  transition: all ${props => props.theme.transitions.default};
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(78, 14, 179, 0.2);
    outline: none;
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 100px;
  resize: vertical;
  transition: all ${props => props.theme.transitions.default};
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px rgba(78, 14, 179, 0.2);
    outline: none;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.default};
  
  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.gradient.primary};
    color: white;
    border: none;
    box-shadow: ${props.theme.shadows.sm};
    
    &:hover {
      box-shadow: ${props.theme.shadows.md};
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
  ` : `
    background: white;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.grey};
    
    &:hover {
      background: ${props.theme.colors.lightGrey};
    }
  `}
`;

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
  keywords?: string;
};

type ProjectModalProps = {
  isOpen?: boolean;
  onClose: () => void;
  onSave?: (project: Project) => void;
  onCreateProject?: (project: Project) => void;
  existingProjects?: any[];
  onSelectProject?: (project: any) => void;
  selectedProject?: any;
};

const ProjectModal: React.FC<ProjectModalProps> = ({ 
  isOpen = false, 
  onClose, 
  onSave, 
  onCreateProject, 
  existingProjects = [], 
  onSelectProject,
  selectedProject 
}) => {
  const [activeTab, setActiveTab] = useState('create');
  const [projectForm, setProjectForm] = useState({
    name: '',
    company: '',
    link: '',
    audience: '',
    keywords: ''
  });
  
  // Sempre mostrar a aba de criação
  useEffect(() => {
    setActiveTab('create');
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProjectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: Date.now().toString(),
      ...projectForm
    };
    
    if (onSave) {
      onSave(newProject);
    } else if (onCreateProject) {
      onCreateProject(newProject);
    }
    
    resetForm();
  };
  
  const resetForm = () => {
    setProjectForm({
      name: '',
      company: '',
      link: '',
      audience: '',
      keywords: ''
    });
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const modalFooter = (
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit}>Create Project</Button>
    </>
  );
  
  // Estilos adicionais
  const TabContainer = styled.div`
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid ${props => props.theme.colors.grey};
  `;

  const Tab = styled.button<{ active: boolean }>`
    padding: 12px 24px;
    background: none;
    border: none;
    border-bottom: 2px solid ${props => props.active ? props.theme.colors.primary : 'transparent'};
    color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
    font-weight: ${props => props.active ? '600' : '400'};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      color: ${props => props.theme.colors.primary};
    }
  `;

  const ProjectList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 300px;
    overflow-y: auto;
  `;

  const ProjectCard = styled.div<{ active?: boolean }>`
    padding: 15px;
    border-radius: 8px;
    border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.grey};
    background-color: ${props => props.active ? 'rgba(45, 29, 66, 0.05)' : 'white'};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: rgba(45, 29, 66, 0.05);
      border-color: ${props => props.theme.colors.primary};
    }
  `;

  const ProjectTitle = styled.h3`
    margin: 0 0 5px 0;
    font-size: 16px;
  `;

  const ProjectDescription = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${props => props.theme.colors.darkGrey};
  `;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      footer={modalFooter}
    >
      <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              name="name"
              value={projectForm.name}
              onChange={handleChange}
              placeholder="Project 1"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="company">Company or product name</Label>
            <Input
              id="company"
              name="company"
              value={projectForm.company}
              onChange={handleChange}
              placeholder="Enter your company or product name"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="audience">Audience description</Label>
            <TextArea
              id="audience"
              name="audience"
              value={projectForm.audience}
              onChange={handleChange}
              placeholder="Describe your target audience"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="link">Project Link</Label>
            <Input
              id="link"
              name="link"
              value={projectForm.link}
              onChange={handleChange}
              placeholder="www.example.com"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="keywords">Keywords (optional)</Label>
            <TextArea
              id="keywords"
              name="keywords"
              value={projectForm.keywords || ''}
              onChange={handleChange}
              placeholder="Keywords separated by commas"
            />
          </FormGroup>
        </Form>
    </Modal>
  );
};

export default ProjectModal;