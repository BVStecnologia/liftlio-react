import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from './Modal';
import { supabase, callEdgeFunction } from '../lib/supabaseClient';
import { FaTimes, FaMagic, FaSpinner, FaGlobe, FaUser, FaBuilding, FaTag } from 'react-icons/fa';
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
  color: ${props => props.theme.colors.text.secondary};
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.components.input.border};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: ${props => props.theme.components.input.bg};
  color: ${props => props.theme.components.input.text};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.components.input.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 149, 255, 0.1)'};
  }
  
  &::placeholder {
    color: ${props => props.theme.components.input.placeholder};
  }
  
  &:disabled {
    background-color: ${props => props.theme.components.input.disabled};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.components.input.border};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  min-height: 100px;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  background-color: ${props => props.theme.components.input.bg};
  color: ${props => props.theme.components.input.text};
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.components.input.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 149, 255, 0.1)'};
  }
  
  &::placeholder {
    color: ${props => props.theme.components.input.placeholder};
  }
`;

// Componente Select estilizado
const Select = styled.select`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.components.input.border};
  border-radius: ${props => props.theme.radius.md};
  font-size: ${props => props.theme.fontSizes.md};
  background-color: ${props => props.theme.components.input.bg};
  color: ${props => props.theme.components.input.text};
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.components.input.borderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.name === 'dark' ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 149, 255, 0.1)'};
  }
  
  option {
    background-color: ${props => props.theme.components.input.bg};
    color: ${props => props.theme.components.input.text};
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
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: ${props.theme.components.button.primary.bg};
    color: ${props.theme.components.button.primary.text};
    border: 1px solid ${props.theme.components.button.primary.border};
    
    &:hover:not(:disabled) {
      background: ${props.theme.components.button.primary.hover};
    }
    
    &:disabled {
      background: ${props.theme.components.button.primary.disabled};
      opacity: 0.6;
    }
  ` : `
    background: ${props.theme.components.button.secondary.bg};
    color: ${props.theme.components.button.secondary.text};
    border: 1px solid ${props.theme.components.button.secondary.border};
    
    &:hover:not(:disabled) {
      background: ${props.theme.components.button.secondary.hover};
    }
    
    &:disabled {
      background: ${props.theme.components.button.secondary.disabled};
      opacity: 0.6;
    }
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
  status?: string;
  fuso_horario?: string;
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
    country: 'US', // Default para Estados Unidos
    fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone // Captura automática do fuso horário do usuário
  });
  const [keywordsArray, setKeywordsArray] = useState<string[]>([]);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  
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
    
    // Verificar se a URL é válida quando o campo link é alterado
    if (name === 'link') {
      try {
        // Adicionar protocolo se não existir
        let urlToTest = value;
        if (value && !value.match(/^https?:\/\//)) {
          urlToTest = 'https://' + value;
        }
        
        const url = new URL(urlToTest);
        setIsValidUrl(url.hostname.includes('.'));
      } catch (e) {
        setIsValidUrl(false);
      }
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulário enviado");
    
    // Verificar se todos os campos obrigatórios estão preenchidos, incluindo keywords
    if (!projectForm.name || !projectForm.company || !projectForm.link || 
        !projectForm.audience || keywordsArray.length === 0) {
      alert('Por favor, preencha todos os campos obrigatórios e adicione pelo menos uma palavra-chave.');
      return;
    }
    
    // Mapear país para o código correto (BR ou US)
    const countryCode = projectForm.country;
    
    const newProject: Project = {
      id: Date.now().toString(),
      ...projectForm,
      country: countryCode,
      status: '0'
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
      country: 'US',
      fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone
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
  
  const generateAIContent = async (contentType: 'keywords' | 'description') => {
    // Verificar se temos dados suficientes
    if (contentType === 'keywords' && (!projectForm.name || !projectForm.company || !projectForm.audience)) {
      alert('Por favor, preencha os campos Nome do Projeto, Nome da Empresa e Descrição do Público para gerar palavras-chave.');
      return;
    }
    
    if (contentType === 'description' && (!projectForm.name || !projectForm.company || !isValidUrl)) {
      alert('Por favor, preencha os campos Nome do Projeto, Nome da Empresa e adicione uma URL válida.');
      return;
    }
    
    if (contentType === 'keywords') {
      setIsGeneratingKeywords(true);
    } else {
      setIsGeneratingDescription(true);
    }
    
    try {
      // Determinar o idioma baseado no país selecionado
      const language = projectForm.country === 'BR' ? 'pt' : 'en';
      
      // Preparar o prompt adequado baseado no tipo de conteúdo
      let prompt = '';
      
      if (contentType === 'keywords') {
        prompt = `Generate exactly 5 relevant keywords for the following project:
         Project Name: ${projectForm.name}
         Company/Product Name: ${projectForm.company}
         Target Audience Description: ${projectForm.audience}
         
         Generate a list of 5 bottom-of-funnel keywords that indicate high purchase intent. Focus on transactional queries — such as comparisons, reviews, or product-versus-product searches — that indicate the user is further along in the buying process. Do not mention prices, free trials, or discounts.
         
         Respond ONLY with the keywords separated by commas, without any introduction or explanation.`;
      } else {
        // Construir a URL correta
        let url = projectForm.link;
        if (!url.match(/^https?:\/\//)) {
          url = 'https://' + url;
        }
        
        prompt = `Visit the URL ${url} and write a concise description (maximum 3 sentences) of the ideal target audience for this project/company.
         Project Name: ${projectForm.name}
         Company/Product Name: ${projectForm.company}
         URL: ${url}
         Respond ONLY with the target audience description, without any introduction or explanation.`;
      }
      
      // Usar a função helper para chamar a edge function
      const fnData = await callEdgeFunction('claude-proxy', {
        prompt: prompt,
        textOnly: true
      });
      
      // Extrair a resposta - a estrutura pode variar dependendo da implementação da edge function
      const responseText = fnData?.content?.[0]?.text || fnData?.text || fnData || '';
      
      // Processar a resposta com validação de tipo e limpar caracteres especiais, preservando quebras de linha
      const cleanedResponse = typeof responseText === 'string' 
        ? responseText.replace(/[\*\#\/\\\[\]\(\)]/g, '').replace(/ +/g, ' ').trim()
        : String(responseText).replace(/[\*\#\/\\\[\]\(\)]/g, '').replace(/ +/g, ' ').trim();
      
      if (contentType === 'keywords') {
        // Processar as keywords
        const generatedKeywords = cleanedResponse
          .split(',')
          .map((keyword: string) => keyword.trim())
          .filter((keyword: string) => keyword !== '');
        
        // Verificar se temos keywords válidas
        if (generatedKeywords.length === 0) {
          throw new Error('Could not generate valid keywords');
        }
        
        // Atualizar o formulário com as novas keywords
        setKeywordsArray(generatedKeywords);
        setProjectForm(prev => ({
          ...prev,
          keywords: generatedKeywords.join(', ')
        }));
      } else {
        // Verificar se temos uma resposta válida para a descrição
        if (!cleanedResponse || cleanedResponse.length < 5) {
          throw new Error('Could not generate a valid description');
        }
        
        // Atualizar o campo de descrição do público
        setProjectForm(prev => ({
          ...prev,
          audience: cleanedResponse
        }));
      }
    } catch (error: unknown) {
      console.error(`Error generating ${contentType}:`, error);
      alert(`Error generating ${contentType === 'keywords' ? 'keywords' : 'description'}. Please try again.`);
    } finally {
      if (contentType === 'keywords') {
        setIsGeneratingKeywords(false);
      } else {
        setIsGeneratingDescription(false);
      }
    }
  };
  
  const generateKeywords = () => generateAIContent('keywords');
  const generateDescription = async () => {
    // Verificar se temos dados suficientes
    if (!projectForm.name || !projectForm.company || !isValidUrl) {
      alert('Please fill in the Project Name, Company Name fields and add a valid URL.');
      return;
    }
    
    setIsGeneratingDescription(true);
    
    try {
      // Construir a URL correta
      let url = projectForm.link;
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      
      console.log(`Extraindo informações da URL: ${url}`);
      
      // Usar nossa função helper para chamar a edge function Dados-da-url
      // IMPORTANTE: O formato correto é usando 'name' para a URL
      const urlData = await callEdgeFunction('Dados-da-url', {
        name: url
      });
      
      console.log('Dados extraídos da URL:', JSON.stringify(urlData, null, 2));
      
      // Se a resposta contém uma mensagem, usamos como descrição (com limpeza de caracteres especiais)
      if (urlData && urlData.message) {
        const cleanedMessage = String(urlData.message)
          .replace(/[\*\#\/\\\[\]\(\)]/g, '')
          .replace(/ +/g, ' ')
          .trim();
          
        // Atualizar o campo de descrição do público
        setProjectForm(prev => ({
          ...prev,
          audience: cleanedMessage
        }));
      } else {
        // Se não há mensagem, informamos o usuário
        alert('Could not extract a description from this URL. Please try another URL or enter the description manually.');
      }
    } catch (error: unknown) {
      console.error('Error extracting data from URL:', error);
      
      let errorMessage = 'An error occurred while accessing the URL. Please try again.';
      
      // Verificar se o erro é um objeto Error
      if (error instanceof Error) {
        // Verificar se é um erro de timeout
        if (error.message && error.message.includes('Timeout error')) {
          errorMessage = 'The operation took too long to complete. This URL might be too complex to process or temporarily unavailable.';
        }
        
        // Verificar se é um erro de CORS ou acesso
        if (error.message && (error.message.includes('CORS') || error.message.includes('access'))) {
          errorMessage = 'Access to this URL is restricted. Please try a different URL.';
        }
      }
      
      alert(errorMessage);
    } finally {
      // Finalizamos o estado de carregamento
      setIsGeneratingDescription(false);
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
            <Label htmlFor="link">Home URL to project</Label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label htmlFor="audience">Audience description</Label>
              <GenerateButton
                type="button"
                variant="secondary"
                onClick={generateDescription}
                disabled={isGeneratingDescription || !projectForm.name || !projectForm.company || !isValidUrl}
                title={!isValidUrl ? "Add a valid URL first to enable this feature" : "Generate audience description from your website"}
              >
                {isGeneratingDescription ? (
                  <>
                    <IconComponent icon={FaSpinner} />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconComponent icon={FaMagic} />
                    Generate Description
                  </>
                )}
              </GenerateButton>
            </div>
            <div style={{ position: 'relative' }}>
              <TextArea
                id="audience"
                name="audience"
                value={projectForm.audience}
                onChange={handleChange}
                placeholder="Describe your target audience"
                required
              />
              {isGeneratingDescription && (
                <LoadingOverlay>
                  <LoadingAnimation>
                    <LoadingDots>
                      <span></span>
                      <span></span>
                      <span></span>
                    </LoadingDots>
                    <LoadingText>Analyzing website...</LoadingText>
                  </LoadingAnimation>
                </LoadingOverlay>
              )}
            </div>
            {!isValidUrl && (
              <InfoText style={{ color: '#888' }}>
                Adicione uma URL válida acima para ativar o recurso de geração de público
              </InfoText>
            )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label htmlFor="keywords">Keywords (separated by commas)</Label>
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
            </div>
            <div style={{ position: 'relative' }}>
              <TextArea
                id="keywords"
                name="keywords"
                value={projectForm.keywords || ''}
                onChange={handleChange}
                placeholder="Keywords separated by commas (e.g. marketing, sales, product)"
                required
              />
              {isGeneratingKeywords && (
                <LoadingOverlay>
                  <LoadingAnimation>
                    <LoadingDots>
                      <span></span>
                      <span></span>
                      <span></span>
                    </LoadingDots>
                    <LoadingText>Generating keywords...</LoadingText>
                  </LoadingAnimation>
                </LoadingOverlay>
              )}
            </div>
            
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
            
            <InfoText>
              Keywords will be generated based on your project information, focusing on high-purchase intent transactional terms that indicate users who are ready to buy.
            </InfoText>
          </FormGroup>
        
          {/* Live Preview */}
          <PreviewContainer>
            <PreviewTitle>Project Preview</PreviewTitle>
            <PreviewContent>
              <PreviewItem>
                <strong><IconComponent icon={FaBuilding} /> Company/Product: </strong>
                {projectForm.company || <PreviewPlaceholder>Enter company or product name</PreviewPlaceholder>}
              </PreviewItem>
              <PreviewItem>
                <strong><IconComponent icon={FaGlobe} /> Website: </strong>
                {projectForm.link || <PreviewPlaceholder>Enter website URL</PreviewPlaceholder>}
              </PreviewItem>
              <PreviewItem>
                <strong><IconComponent icon={FaUser} /> Target Audience: </strong>
                {projectForm.audience ? (
                  projectForm.audience.length > 100 
                    ? `${projectForm.audience.substring(0, 100)}...` 
                    : projectForm.audience
                ) : (
                  <PreviewPlaceholder>Enter or generate target audience</PreviewPlaceholder>
                )}
              </PreviewItem>
              <PreviewItem>
                <strong><IconComponent icon={FaTag} /> Keywords: </strong>
                {keywordsArray.length > 0 ? (
                  keywordsArray.map((keyword, i) => (
                    <span key={i} style={{ 
                      display: 'inline-block', 
                      background: '#f0f0f0', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      margin: '0 4px 4px 0',
                      fontSize: '0.85em' 
                    }}>
                      {keyword}
                    </span>
                  ))
                ) : (
                  <PreviewPlaceholder>Enter or generate keywords</PreviewPlaceholder>
                )}
              </PreviewItem>
            </PreviewContent>
          </PreviewContainer>
        </Form>
    </Modal>
  );
};

// Add loading animation styles
const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.radius.md};
  backdrop-filter: blur(4px);
  z-index: 5;
`;

const LoadingAnimation = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 8px;
  
  span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${props => props.theme.colors.primary};
    animation: loadingPulse 1.4s ease-in-out infinite;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
  
  @keyframes loadingPulse {
    0%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
  }
`;

const LoadingText = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.primary};
  margin: 0;
  font-weight: 500;
`;

// Live preview card
const PreviewContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  border: 1px dashed ${props => props.theme.colors.grey};
  border-radius: ${props => props.theme.radius.md};
  background-color: ${props => `${props.theme.colors.background}80`};
  transition: all 0.3s ease;
`;

const PreviewTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  margin: 0 0 12px 0;
  color: ${props => props.theme.colors.text};
`;

const PreviewContent = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
`;

const PreviewItem = styled.div`
  margin-bottom: 8px;
  
  strong {
    font-weight: 500;
    color: ${props => props.theme.colors.text};
  }
`;

const PreviewPlaceholder = styled.span`
  color: ${props => props.theme.colors.grey};
  font-style: italic;
`;

export default ProjectModal;