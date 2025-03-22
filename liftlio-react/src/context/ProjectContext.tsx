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
    
    // Verificar se devemos pular diretamente para o dashboard
    const skipOnboarding = localStorage.getItem('skipOnboarding') === 'true';
    if (skipOnboarding) {
      console.log("Flag skipOnboarding detectado, pulando direto para o dashboard");
      // Limpar a flag
      localStorage.removeItem('skipOnboarding');
      // Forçar o onboarding para concluído
      setOnboardingStep(4);
      setHasProjects(true);
      setHasIntegrations(true);
      setHasData(true);
      setOnboardingReady(true);
      
      // Ainda precisamos carregar os projetos para ter o contexto correto
      loadUserProjects().then(projectsList => {
        setProjects(projectsList);
      });
      
      // Set up real-time subscription
      setupRealtimeSubscription();
      
      return;
    }
    
    // Load all projects
    loadUserProjects().then(projectsList => {
      setProjects(projectsList);
      setHasProjects(projectsList.length > 0);
      
      // Verificar se acabamos de completar uma integração
      const integrationCompleted = localStorage.getItem('integrationCompleted') === 'true';
      
      // Se tem projetos, atualizar onboardingStep
      if (projectsList.length > 0) {
        // Se acabamos de completar uma integração, forçar uma atualização completa
        // do estado de onboarding
        if (integrationCompleted) {
          // Limpar o flag de integração completada
          localStorage.removeItem('integrationCompleted');
          
          // Forçar a atualização do estado de onboarding e pular para o dashboard
          determineOnboardingState(projectsList[0].id, true).finally(() => {
            console.log("Onboarding concluído após integração");
            setOnboardingReady(true);
          });
        } else {
          // Comportamento normal quando não estamos vindo de uma integração
          determineOnboardingState(projectsList[0].id).finally(() => {
            setOnboardingReady(true); // Marcar como pronto após determinar o estado
          });
        }
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
      determineOnboardingState(project.id);
    }
  };
  
  // Função para determinar o estado de onboarding com base no projeto
  const determineOnboardingState = async (projectId: string | number, forceComplete: boolean = false) => {
    try {
      // Verificar se tem integrações
      const { data: integrationData } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', projectId)
        .eq('ativo', true);
      
      const projectHasIntegrations = integrationData && integrationData.length > 0;
      setHasIntegrations(projectHasIntegrations);
      
      // Se estamos vindo de um processo de integração concluído com sucesso
      // e o parâmetro forceComplete está ativo, podemos avançar para o dashboard
      if (forceComplete && projectHasIntegrations) {
        console.log("Integração detectada, avançando para o dashboard");
        setHasData(true); // Vamos fingir que já temos dados para acessar o dashboard
        setOnboardingStep(4); // Pular diretamente para o onboarding completo
        setOnboardingReady(true); // Marcar como pronto imediatamente
        return;
      }
      
      // ATENÇÃO: Se a integração foi conectada, sempre avançar para o painel
      // sem aguardar dados
      if (projectHasIntegrations) {
        console.log("Integração já configurada, avançando para o dashboard");
        setHasData(true); // Considerar que já temos dados
        setOnboardingStep(4); // Completar o onboarding
        return;
      } else {
        // Sem integrações
        setHasData(false);
        setOnboardingStep(2); // Precisa configurar integrações
      }
    } catch (error) {
      console.error("Erro ao verificar estado de onboarding:", error);
      // Em caso de erro, assumir o pior caso (sem integrações, sem dados)
      setHasIntegrations(false);
      setHasData(false);
      setOnboardingStep(2);
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