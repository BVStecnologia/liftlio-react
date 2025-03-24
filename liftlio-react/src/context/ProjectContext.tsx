import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// Interface para o modelo de dados de Projeto
interface Project {
  id: string | number;
  name: string;
  description: string;
  user: string;
  user_id?: string;
  link?: string;
  audience?: string;
  "Project name"?: string; // Campo legado usado na interface
  // Adicione outros campos conforme necessário
}

type ProjectContextType = {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  loadUserProjects: () => Promise<Project[]>;
  isLoading: boolean;
  projects: Project[];
  hasProjects: boolean;
  hasIntegrations: boolean;
  hasData: boolean;
  onboardingStep: number;
  isOnboarding: boolean; // Indica se o usuário está em modo onboarding
  onboardingReady: boolean; // Indica se o estado de onboarding foi determinado
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasProjects, setHasProjects] = useState(false);
  const [hasIntegrations, setHasIntegrations] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const isOnboarding = onboardingStep < 4; // Quando onboardingStep < 4, estamos em modo onboarding
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    // Load from localStorage on start
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      fetchProject(savedProjectId);
    }
    
    // Removida a verificação de skipOnboarding que estava causando
    // redirecionamentos indesejados após a autenticação do YouTube
    
    // Load all projects
    loadUserProjects().then(projectsList => {
      setProjects(projectsList);
      setHasProjects(projectsList.length > 0);
      
      // Verificamos a lista de projetos
      
      // Se tem projetos, atualizar onboardingStep
      if (projectsList.length > 0) {
        // Comportamento unificado - não fazemos mais distinção se estamos vindo de uma integração
        // pois isso causava problemas de redirecionamento
        determineOnboardingState(projectsList[0].id).finally(() => {
          setOnboardingReady(true); // Marcar como pronto após determinar o estado
        });
      } else {
        setOnboardingStep(1); // Precisa criar projeto
        setOnboardingReady(true); // Mesmo sem projetos, estamos prontos (etapa 1)
      }
    });
    
    // Set up real-time subscription
    setupRealtimeSubscription();
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);
  
  const fetchProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        // Se não há usuário, limpar o projeto salvo
        localStorage.removeItem('currentProjectId');
        setCurrentProject(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('Projeto')
        .select('*')
        .eq('id', projectId)
        .eq('user', user.email) // Verifica se pertence ao usuário atual
        .single();
        
      if (data && !error) {
        setCurrentProject(data);
        localStorage.setItem('currentProjectId', projectId);
      } else {
        // Se o projeto não existe ou não pertence ao usuário, limpar
        localStorage.removeItem('currentProjectId');
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      localStorage.removeItem('currentProjectId');
      setCurrentProject(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadUserProjects = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('Projeto')
        .select('*')
        .eq('user', user.email);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error loading projects:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  const setProject = (project: any) => {
    setCurrentProject(project);
    if (project?.id) {
      localStorage.setItem('currentProjectId', project.id.toString());
      
      // Ao trocar de projeto, verificamos se o usuário já completou o onboarding
      // para não forçá-lo a passar por isso novamente
      const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';
      
      if (userCompletedOnboarding) {
        // Se o usuário já completou, não reiniciar o onboarding
        console.log("Trocando de projeto mas mantendo o status de onboarding completo");
        setOnboardingStep(4);
        setHasData(true);
        setOnboardingReady(true);
      } else {
        // Se nunca completou, verificar estado normalmente
        determineOnboardingState(project.id);
      }
    }
  };
  
  // Função para determinar o estado de onboarding com base no projeto
  const determineOnboardingState = async (projectId: string | number, forceComplete: boolean = false) => {
    try {
      // Verificar se o usuário já completou o onboarding antes
      const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';
      
      // Verificar se tem integrações ativas
      const { data: activeIntegrations } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', projectId)
        .eq('ativo', true);
      
      // Verificar se já existiu alguma integração (ativa ou não)
      const { data: anyIntegrations } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', projectId);
      
      // Projeto tem integrações ativas?
      const projectHasActiveIntegrations = activeIntegrations && activeIntegrations.length > 0;
      // Projeto já teve alguma integração (mesmo que não esteja ativa agora)?
      const projectEverHadIntegrations = anyIntegrations && anyIntegrations.length > 0;
      
      setHasIntegrations(projectHasActiveIntegrations);
      
      // IMPORTANTE: Se o projeto já teve alguma integração, consideramos que o usuário 
      // já passou pelo onboarding, mesmo que as integrações estejam desativadas agora
      if (projectEverHadIntegrations) {
        console.log("Projeto já teve integrações, mantendo interface completa");
        localStorage.setItem('userCompletedOnboarding', 'true');
      }
      
      // Se estamos vindo de um processo de integração concluído com sucesso
      // e o parâmetro forceComplete está ativo, podemos avançar para o dashboard
      if (forceComplete && (projectHasActiveIntegrations || projectEverHadIntegrations)) {
        console.log("Integração detectada, avançando para o dashboard");
        setHasData(true); // Vamos fingir que já temos dados para acessar o dashboard
        setOnboardingStep(4); // Pular diretamente para o onboarding completo
        setOnboardingReady(true); // Marcar como pronto imediatamente
        
        // Marcar que o usuário completou o onboarding
        localStorage.setItem('userCompletedOnboarding', 'true');
        return;
      }
      
      // ALTERAÇÃO: Se o usuário já completou o onboarding anteriormente ou o projeto já teve integrações,
      // não deve voltar ao modo onboarding mesmo que não tenha integrações ativas
      if (userCompletedOnboarding || projectEverHadIntegrations) {
        console.log("Usuário já completou onboarding ou projeto já teve integrações, mantendo modo normal");
        setHasData(true); // Mantemos dados para acessar o dashboard
        setOnboardingStep(4); // Manter onboarding completo
        return;
      }
      
      // ATENÇÃO: Se a integração foi conectada, sempre avançar para o painel
      // sem aguardar dados
      if (projectHasActiveIntegrations) {
        console.log("Integração já configurada, avançando para o dashboard");
        setHasData(true); // Considerar que já temos dados
        setOnboardingStep(4); // Completar o onboarding
        
        // Marcar que o usuário completou o onboarding
        localStorage.setItem('userCompletedOnboarding', 'true');
        return;
      } else {
        // Sem integrações ativas e usuário nunca completou onboarding e projeto nunca teve integrações
        setHasData(false);
        setOnboardingStep(2); // Precisa configurar integrações
      }
    } catch (error) {
      console.error("Erro ao verificar estado de onboarding:", error);
      
      try {
        // Mesmo com erro, vamos tentar verificar se o projeto já teve integrações
        const { data: everHadIntegrations } = await supabase
          .from('Integrações')
          .select('*')
          .eq('PROJETO id', projectId);
          
        const hadIntegrations = everHadIntegrations && everHadIntegrations.length > 0;
        
        // Em caso de erro, se o usuário já completou onboarding anteriormente ou
        // se o projeto já teve integrações, mantenha-o no modo completo
        const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';
        
        if (userCompletedOnboarding || hadIntegrations) {
          console.log("Erro, mas usuário já completou onboarding ou projeto teve integrações");
          if (hadIntegrations) {
            localStorage.setItem('userCompletedOnboarding', 'true');
          }
          setHasIntegrations(false);
          setHasData(true);
          setOnboardingStep(4);
        } else {
          // Caso contrário, assumir o pior caso (sem integrações, sem dados)
          setHasIntegrations(false);
          setHasData(false);
          setOnboardingStep(2);
        }
      } catch (secondError) {
        // Se mesmo a segunda consulta falhar, verificar só o localStorage
        console.error("Erro secundário ao verificar integrações:", secondError);
        const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';
        if (userCompletedOnboarding) {
          setHasIntegrations(false);
          setHasData(true);
          setOnboardingStep(4);
        } else {
          setHasIntegrations(false);
          setHasData(false);
          setOnboardingStep(2);
        }
      }
    }
    
    // Após determinar o estado, independentemente do resultado, marcar como pronto
    setOnboardingReady(true);
  };
  
  // Setup real-time subscription for projects changes
  const setupRealtimeSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        console.error("User not authenticated for real-time subscription");
        return;
      }
      
      // Create a channel for Projeto table changes
      const subscription = supabase
        .channel('public:Projeto')
        .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'Projeto',
              filter: `user=eq.${user.email}`
            }, 
            (payload) => {
              console.log('Real-time change detected:', payload);
              
              // Handle different types of changes
              if (payload.eventType === 'INSERT') {
                setProjects(prevProjects => [...prevProjects, payload.new]);
              } 
              else if (payload.eventType === 'UPDATE') {
                setProjects(prevProjects => 
                  prevProjects.map(project => 
                    project.id === payload.new.id ? payload.new : project
                  )
                );
                
                // If current project was updated, update it
                if (currentProject && currentProject.id === payload.new.id) {
                  setCurrentProject(payload.new);
                }
              } 
              else if (payload.eventType === 'DELETE') {
                setProjects(prevProjects => 
                  prevProjects.filter(project => project.id !== payload.old.id)
                );
                
                // If current project was deleted, set to null or another project
                if (currentProject && currentProject.id === payload.old.id) {
                  const remainingProjects = projects.filter(p => p.id !== payload.old.id);
                  setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
                }
              }
            }
        )
        .subscribe();
      
      // Store subscription reference for cleanup
      subscriptionRef.current = subscription;
      console.log('Real-time subscription established');
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  };

  return (
    <ProjectContext.Provider 
      value={{
        currentProject,
        setCurrentProject: setProject,
        loadUserProjects,
        isLoading,
        projects,
        hasProjects,
        hasIntegrations,
        hasData,
        onboardingStep,
        isOnboarding,
        onboardingReady
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};