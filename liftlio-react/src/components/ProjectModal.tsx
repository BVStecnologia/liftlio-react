import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import { FaTimes, FaMagic, FaSpinner } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

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
  
  &:focus {
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
  
  &:focus {
    outline: none;
  }
`;

// Componente Select estilizado
const Select = styled.select`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: white;
  
  &:focus {
    outline: none;
  }
`;

// Wrapper para o campo de país com bandeira
const CountrySelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CountryFlag = styled.span`
  position: absolute;
  left: 12px;
  font-size: 1.2rem;
`;

const CountrySelect = styled(Select)`
  padding-left: 40px;
  min-width: 180px; // Deixando o select mais largo
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary'; disabled?: boolean }>`
  padding: 12px 24px;
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.medium};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  
  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.primary};
    color: white;
    border: none;
  ` : `
    background: white;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.grey};
  `}
`;

const KeywordsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Keyword = styled.div`
  display: flex;
  align-items: center;
  background-color: ${props => `${props.theme.colors.primary}15`};
  color: ${props => props.theme.colors.text};
  padding: 6px 12px;
  border-radius: ${props => props.theme.radius.sm};
  font-size: ${props => props.theme.fontSizes.sm};
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: ${props => props.theme.colors.darkGrey};
    margin-left: 8px;
    cursor: pointer;
    padding: 2px;
    font-size: 14px;
  }
`;

const GenerateButton = styled(Button)`
  margin-top: 8px;
  font-size: ${props => props.theme.fontSizes.sm};
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    font-size: 14px;
  }
`;

const InfoText = styled.p`
  margin: 4px 0 0;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.darkGrey};
`;

type Project = {
  id: string;
  name: string;
  company: string;
  link: string;
  audience: string;
  keywords?: string;
  country?: string;
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
    keywords: '',
    country: 'BR' // Default para Brasil
  });
  const [keywordsArray, setKeywordsArray] = useState<string[]>([]);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  
  // Sempre mostrar a aba de criação
  useEffect(() => {
    setActiveTab('create');
  }, []);
  
  // Atualizar o array de keywords quando o texto muda
  useEffect(() => {
    if (projectForm.keywords) {
      const keywords = projectForm.keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword !== '');
      setKeywordsArray(keywords);
    } else {
      setKeywordsArray([]);
    }
  }, [projectForm.keywords]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulário enviado");
    
    // Verificar se todos os campos obrigatórios estão preenchidos, incluindo keywords
    if (!projectForm.name || !projectForm.company || !projectForm.link || 
        !projectForm.audience || keywordsArray.length === 0) {
      alert('Por favor, preencha todos os campos e adicione ao menos uma palavra-chave.');
      return;
    }
    
    // Mapear país para o código correto (BR ou US)
    const countryCode = projectForm.country;
    
    const newProject: Project = {
      id: Date.now().toString(),
      ...projectForm,
      country: countryCode
    };
    
    console.log("Novo projeto:", newProject);
    console.log("onSave:", !!onSave, "onCreateProject:", !!onCreateProject);
    
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
      keywords: '',
      country: 'BR'
    });
    setKeywordsArray([]);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const removeKeyword = (indexToRemove: number) => {
    const updatedKeywords = keywordsArray.filter((_, index) => index !== indexToRemove);
    setKeywordsArray(updatedKeywords);
    setProjectForm(prev => ({
      ...prev,
      keywords: updatedKeywords.join(', ')
    }));
  };
  
  const generateKeywords = async () => {
    // Verificar se temos dados suficientes para gerar palavras-chave
    if (!projectForm.name || !projectForm.company || !projectForm.audience) {
      alert('Por favor, preencha os campos de Nome do Projeto, Nome da Empresa e Descrição do Público para gerar palavras-chave.');
      return;
    }
    
    setIsGeneratingKeywords(true);
    
    try {
      // Determinar o idioma baseado no país selecionado
      const language = projectForm.country === 'BR' ? 'pt' : 'en';
      
      // Chamar a Edge Function diretamente via fetch
      const prompt = language === 'pt' ? 
        `Gere 5-8 palavras-chave relevantes para o seguinte projeto:
         Nome do Projeto: ${projectForm.name}
         Nome da Empresa/Produto: ${projectForm.company}
         Descrição do Público-alvo: ${projectForm.audience}
         Responda APENAS com as palavras-chave separadas por vírgula, sem introdução ou explicação.` :
        `Generate 5-8 relevant keywords for the following project:
         Project Name: ${projectForm.name}
         Company/Product Name: ${projectForm.company}
         Target Audience Description: ${projectForm.audience}
         Respond ONLY with the keywords separated by commas, without any introduction or explanation.`;
      
      // Obter a sessão atual
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || '';
      
      // Chamar a Edge Function diretamente via fetch
      const response = await fetch('https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/claude-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        throw new Error(`Error invoking edge function: ${response.statusText}`);
      }
      
      const fnData = await response.json();
      
      // Extrair as keywords da resposta
      const responseText = fnData?.content?.[0]?.text || '';
      
      // Processar as keywords (remover quebras de linha, pontos, etc)
      const cleanedResponse = responseText.replace(/\n/g, '').trim();
      const generatedKeywords = cleanedResponse
        .split(',')
        .map((keyword: string) => keyword.trim())
        .filter((keyword: string) => keyword !== '');
      
      // Atualizar o formulário com as novas keywords
      setKeywordsArray(generatedKeywords);
      setProjectForm(prev => ({
        ...prev,
        keywords: generatedKeywords.join(', ')
      }));
    } catch (error) {
      console.error('Error generating keywords:', error);
      alert('Erro ao gerar palavras-chave. Por favor, tente novamente.');
    } finally {
      setIsGeneratingKeywords(false);
    }
  };
  
  // Verificar se todos os campos obrigatórios estão preenchidos
  const isFormValid = () => {
    return Boolean(
      projectForm.name && 
      projectForm.company && 
      projectForm.link && 
      projectForm.audience && 
      keywordsArray.length > 0
    );
  };
  
  const modalFooter = (
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button 
        variant="primary" 
        onClick={handleSubmit} 
        disabled={!isFormValid()}
      >
        Create Project
      </Button>
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
    background-color: ${props => props.active ? `${props.theme.colors.primary}0A` : 'white'};
    cursor: pointer;
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
            <Label htmlFor="country">Country</Label>
            <CountrySelectWrapper>
              <CountryFlag>
                {projectForm.country === 'BR' ? '🇧🇷' : '🇺🇸'}
              </CountryFlag>
              <CountrySelect
                id="country"
                name="country"
                value={projectForm.country}
                onChange={handleChange}
                required
              >
                <option value="BR">Brazil</option>
                <option value="US">United States</option>
              </CountrySelect>
            </CountrySelectWrapper>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="keywords">Keywords (separated by commas)</Label>
            <TextArea
              id="keywords"
              name="keywords"
              value={projectForm.keywords || ''}
              onChange={handleChange}
              placeholder="Keywords separated by commas (e.g. marketing, sales, product)"
              required
            />
            
            {/* Exibir keywords como tags */}
            {keywordsArray.length > 0 && (
              <KeywordsContainer>
                {keywordsArray.map((keyword, index) => (
                  <Keyword key={index}>
                    {keyword}
                    <button type="button" onClick={() => removeKeyword(index)}>
                      <IconComponent icon={FaTimes} />
                    </button>
                  </Keyword>
                ))}
              </KeywordsContainer>
            )}
            
            {/* Botão para gerar keywords */}
            <GenerateButton
              type="button"
              variant="secondary"
              onClick={generateKeywords}
              disabled={isGeneratingKeywords || !projectForm.name || !projectForm.company || !projectForm.audience}
            >
              {isGeneratingKeywords ? (
                <>
                  <IconComponent icon={FaSpinner} />
                  Generating...
                </>
              ) : (
                <>
                  <IconComponent icon={FaMagic} />
                  Generate Keywords
                </>
              )}
            </GenerateButton>
            
            <InfoText>
              Keywords will be generated based on your project information in {projectForm.country === 'BR' ? 'Portuguese' : 'English'}.
            </InfoText>
          </FormGroup>
        </Form>
    </Modal>
  );
};

// Removidos efeitos de animação do spinner

export default ProjectModal;