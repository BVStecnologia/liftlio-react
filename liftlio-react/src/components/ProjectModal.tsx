import React, { useState } from 'react';
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
};

type ProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
};

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [projectForm, setProjectForm] = useState({
    name: '',
    company: '',
    link: '',
    audience: ''
  });
  
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
    onSave(newProject);
    resetForm();
  };
  
  const resetForm = () => {
    setProjectForm({
      name: '',
      company: '',
      link: '',
      audience: ''
    });
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const modalFooter = (
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit}>Create</Button>
    </>
  );
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Project"
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
          <Label htmlFor="company">Company or Product Name</Label>
          <Input
            id="company"
            name="company"
            value={projectForm.company}
            onChange={handleChange}
            placeholder="Company or product name"
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
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="audience">Audience Description</Label>
          <TextArea
            id="audience"
            name="audience"
            value={projectForm.audience}
            onChange={handleChange}
            placeholder="Describe the behavior of the target audience"
            required
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ProjectModal;