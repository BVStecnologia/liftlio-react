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
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    // Load from localStorage on start
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      fetchProject(savedProjectId);
    }
    
    // Load all projects
    loadUserProjects().then(projectsList => {
      setProjects(projectsList);
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
    }
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
        projects
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