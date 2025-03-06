import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

type ProjectContextType = {
  currentProject: any | null;
  setCurrentProject: (project: any) => void;
  loadUserProjects: () => Promise<any[]>;
  isLoading: boolean;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Carregar do localStorage ao iniciar
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      fetchProject(savedProjectId);
    }
  }, []);
  
  const fetchProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Projeto')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (data && !error) {
        setCurrentProject(data);
        localStorage.setItem('currentProjectId', projectId);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
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
  
  return (
    <ProjectContext.Provider 
      value={{
        currentProject,
        setCurrentProject: setProject,
        loadUserProjects,
        isLoading
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