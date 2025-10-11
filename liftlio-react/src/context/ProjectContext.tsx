import React, { createContext, useContext, useState, useEffect, useRef, startTransition } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// Interface para o modelo de dados de Projeto
interface Project {
  id: string | number;
  name: string;
  description: string;
  user: string;
  user_id?: string;
  link?: string;
  audience?: string;
  status?: string;
  "Project name"?: string; // Campo legado usado na interface
  projetc_index?: boolean; // Indica se este é o projeto selecionado pelo usuário
  fuso_horario?: string; // Fuso horário do usuário
  // Adicione outros campos conforme necessário
}

type ProjectContextType = {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => Promise<void>;
  loadUserProjects: () => Promise<Project[]>;
  isLoading: boolean;
  projects: Project[];
  hasProjects: boolean;
  hasIntegrations: boolean;
  hasData: boolean;
  hasMensagens: boolean; // Indica se o projeto tem mensagens
  onboardingStep: number;
  isOnboarding: boolean; // Indica se o usuário está em modo onboarding
  onboardingReady: boolean; // Indica se o estado de onboarding foi determinado
  projectIntegrations: any[]; // Lista de integrações do projeto atual
  isInitialProcessing: boolean; // Indica se o projeto está em processamento inicial
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth(); // Importar user do AuthContext
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hasProjects, setHasProjects] = useState(false);
  const [hasIntegrations, setHasIntegrations] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [hasMensagens, setHasMensagens] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [projectIntegrations, setProjectIntegrations] = useState<any[]>([]);
  const [isInitialProcessing, setIsInitialProcessing] = useState(false);
  const isOnboarding = onboardingStep < 4; // Quando onboardingStep < 4, estamos em modo onboarding
  const subscriptionRef = useRef<any>(null);
  const isTransitioning = useRef<boolean>(false); // Flag para pausar verificações durante transição
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref para o intervalo de verificação
  
  useEffect(() => {
    // 🔥 OTIMIZADO: Carregar projeto marcado como index automaticamente
    const initializeProject = async () => {
      console.log('[ProjectContext] Inicializando e carregando projeto index...');

      // Carregar lista de projetos do usuário
      const projectsList = await loadUserProjects();
      setProjects(projectsList);
      setHasProjects(projectsList.length > 0);

      // Se tem projetos, buscar o projeto marcado como index
      if (projectsList.length > 0) {
        // Procurar projeto com projetc_index = true
        const indexedProject = projectsList.find(p => p.projetc_index === true);

        if (indexedProject) {
          console.log(`[ProjectContext] Projeto ${indexedProject.id} encontrado com index=true, selecionando...`);
          setCurrentProject(indexedProject);

          // Determinar estado de onboarding do projeto selecionado
          determineOnboardingState(indexedProject.id).finally(() => {
            setOnboardingReady(true);
          });
        } else {
          // Fallback: se nenhum tem index, usar o primeiro
          console.log('[ProjectContext] Nenhum projeto com index=true, usando primeiro como fallback');
          const fallbackProject = projectsList[0];
          setCurrentProject(fallbackProject);

          determineOnboardingState(fallbackProject.id).finally(() => {
            setOnboardingReady(true);
          });
        }
      } else {
        setOnboardingStep(1); // Precisa criar projeto
        setOnboardingReady(true);
      }
    };
    
    // Só inicializar se tivermos um user autenticado
    if (user) {
      // Inicializar o sistema de projetos
      initializeProject();

      // Set up real-time subscription
      setupRealtimeSubscription();
    }

    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user]); // Reagir quando user mudar
  
  // Verificar se o projeto tem mensagens e configurar isInitialProcessing
  useEffect(() => {
    if (currentProject?.id) {
      // Limpar cache antigo quando trocar de projeto
      const cacheKey = `project_cache_${currentProject.id}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);

      // Invalidar cache se for mais antigo que 30 segundos
      if (cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff > 30000) {
          console.log(`[ProjectContext] Invalidando cache antigo para projeto ${currentProject.id}`);
          sessionStorage.removeItem(cacheKey);
          sessionStorage.removeItem(`${cacheKey}_time`);
        }
      }

      // Verificação inicial
      checkProjectProcessingState(currentProject.id);

      // Verificar fuso horário e atualizar se necessário (sem await para não bloquear)
      checkAndUpdateTimezone(currentProject);

      // Limpar intervalo anterior se existir
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Verificar novamente a cada 5 segundos para projetos em processamento
      // ⚡ OTIMIZAÇÃO: Só rodar se NÃO estiver em transição
      intervalRef.current = setInterval(() => {
        if (currentProject?.id && !isTransitioning.current) {
          const status = parseInt(currentProject.status || '6', 10);
          // Só verificar se está em processamento (status <= 6)
          if (status <= 6) {
            checkProjectProcessingState(currentProject.id);
          }
        }
      }, 5000);

      // Limpar o intervalo quando o componente for desmontado ou o projeto mudar
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [currentProject?.id]); // Mudado para depender apenas do ID
  
  // Função para verificar e atualizar o fuso horário do projeto
  const checkAndUpdateTimezone = async (project: Project) => {
    try {
      // Obter o fuso horário atual do navegador
      const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Se o projeto não tem fuso horário definido ou é diferente do atual
      if (!project.fuso_horario || project.fuso_horario !== currentTimezone) {
        console.log(`Atualizando fuso horário do projeto ${project.id} de ${project.fuso_horario || 'não definido'} para ${currentTimezone}`);
        
        // Atualizar o fuso horário no Supabase
        const { error } = await supabase
          .from('Projeto')
          .update({ fuso_horario: currentTimezone })
          .eq('id', project.id);
          
        if (error) {
          console.error("Erro ao atualizar fuso horário:", error);
        } else {
          console.log(`Fuso horário atualizado com sucesso para ${currentTimezone}`);
          
          // Atualizar o estado local com o novo fuso horário
          setCurrentProject({
            ...project,
            fuso_horario: currentTimezone
          });
        }
      }
    } catch (error) {
      console.error("Erro ao verificar/atualizar fuso horário:", error);
    }
  };
  
  // Função para verificar o estado de processamento do projeto
  const checkProjectProcessingState = async (projectId: string | number) => {
    try {
      // Usar cache para evitar múltiplas chamadas simultâneas
      const cacheKey = `project_state_${projectId}`;
      const lastCheck = sessionStorage.getItem(`${cacheKey}_checking`);
      
      // Se já está verificando, não fazer nova verificação
      if (lastCheck && (Date.now() - parseInt(lastCheck)) < 1000) {
        console.log(`[ProjectContext] Verificação em andamento para projeto ${projectId}, pulando`);
        return;
      }
      
      // Marcar que estamos verificando
      sessionStorage.setItem(`${cacheKey}_checking`, Date.now().toString());
      
      // 1. Verificar se o projeto tem status entre 0 e 5
      const { data: projectData, error: projectError } = await supabase
        .from('Projeto')
        .select('status')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        console.error("Erro ao verificar status do projeto:", projectError);
        sessionStorage.removeItem(`${cacheKey}_checking`);
        return;
      }
      
      const projectStatus = parseInt(projectData?.status || '6', 10);
      const isProcessing = projectStatus >= 0 && projectStatus <= 5;
      
      // 2. Verificar se o projeto tem mensagens (só se status >= 6)
      let hasMensagens = false;
      if (projectStatus >= 6) {
        const { data: mensagens, error: mensagensError } = await supabase
          .from('Mensagens')
          .select('id')
          .eq('project_id', projectId)
          .limit(1);
          
        if (mensagensError) {
          console.error("Erro ao verificar mensagens do projeto:", mensagensError);
          sessionStorage.removeItem(`${cacheKey}_checking`);
          return;
        }
        
        hasMensagens = mensagens && mensagens.length > 0;
      }

      // Atualizar estado de hasMensagens
      setHasMensagens(hasMensagens);

      // 3. Definir isInitialProcessing: verdadeiro se estiver processando OU (status=6 E não tiver mensagens)
      const shouldBeProcessing = isProcessing || (projectStatus === 6 && !hasMensagens);

      // Só atualizar se mudou
      if (shouldBeProcessing !== isInitialProcessing) {
        console.log(`[ProjectContext] Atualizando estado de processamento para projeto ${projectId}: ${shouldBeProcessing}`);
        setIsInitialProcessing(shouldBeProcessing);
      }

      console.log(`[ProjectContext] Projeto ${projectId}: status=${projectStatus}, hasMensagens=${hasMensagens}, isInitialProcessing=${shouldBeProcessing}`);
      
      // Limpar flag de verificação
      sessionStorage.removeItem(`${cacheKey}_checking`);
      
      // Salvar resultado no cache
      sessionStorage.setItem(cacheKey, JSON.stringify({ status: projectStatus, hasMensagens, shouldBeProcessing }));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
    } catch (error) {
      console.error("Erro ao verificar estado de processamento do projeto:", error);
      const cacheKey = `project_state_${projectId}`;
      sessionStorage.removeItem(`${cacheKey}_checking`);
    }
  };
  
  const fetchProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        // Se não há usuário, limpar o projeto salvo
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
        
        // Se o projeto não é o indexado, atualizá-lo como tal
        if (!data.projetc_index) {
          updateProjectIndex(data);
        }
        
        // Verificar estado de processamento
        checkProjectProcessingState(projectId);
      } else {
        // Se o projeto não existe ou não pertence ao usuário, limpar
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
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
  
  // Função para atualizar o índice de um projeto no banco de dados
  const updateProjectIndex = async (project: Project) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        console.error("Usuário não autenticado ao tentar atualizar índice do projeto");
        return false;
      }
      
      console.log("Atualizando índice do projeto no Supabase usando função otimizada...");

      // Usar a função RPC otimizada diretamente pelo cliente Supabase
      const { data, error } = await supabase
        .rpc('set_project_index', {
          p_user_email: user.email,
          p_project_id: project.id
        });

      if (error) {
        console.error("Erro ao atualizar índice do projeto via RPC:", error);
        
        // Fallback: tentativa manual em duas etapas caso RPC falhe
        console.log("Tentando método alternativo otimizado...");

        // Primeiro, desmarcar APENAS projetos ativos (otimização)
        const { error: resetError } = await supabase
          .from('Projeto')
          .update({ projetc_index: false })
          .eq('user', user.email)
          .eq('projetc_index', true)
          .neq('id', project.id);

        if (resetError) {
          console.error("Erro ao resetar índices de projetos:", resetError);
          return false;
        }

        // Depois, marcar o projeto selecionado APENAS se não está ativo
        const { error: updateError } = await supabase
          .from('Projeto')
          .update({ projetc_index: true })
          .eq('id', project.id)
          .eq('user', user.email)
          .or('projetc_index.is.null,projetc_index.eq.false');

        if (updateError) {
          console.error("Erro ao atualizar índice do projeto:", updateError);
          return false;
        } else {
          console.log(`Projeto ${project.id} definido como projeto indexado (método alternativo)`);

          // Verificar se a atualização foi bem-sucedida
          return await verificarIndexacao(project.id, user.email);
        }
      } else {
        console.log(`Projeto ${project.id} definido como projeto indexado via RPC otimizada (< 50ms)`);
        return true;
      }
    } catch (error) {
      console.error("Erro ao atualizar índice do projeto:", error);
      return false;
    }
  };
  
  // Função para verificar se o projeto foi corretamente indexado
  const verificarIndexacao = async (projectId: string | number, userEmail: string) => {
    try {
      // Aguardar 500ms para dar tempo ao banco de processar a atualização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar se o projeto está marcado como indexado
      const { data, error } = await supabase
        .from('Projeto')
        .select('projetc_index')
        .eq('id', projectId)
        .eq('user', userEmail)
        .single();
        
      if (error) {
        console.error("Erro ao verificar indexação do projeto:", error);
        return false;
      }
      
      if (!data.projetc_index) {
        console.warn("Projeto não foi indexado corretamente. Tentando novamente...");
        
        // Tentar novamente a atualização
        const { error: updateError } = await supabase
          .from('Projeto')
          .update({ projetc_index: true })
          .eq('id', projectId)
          .eq('user', userEmail);

        if (updateError) {
          console.error("Falha na segunda tentativa de indexação:", updateError);
          return false;
        } else {
          console.log("Segunda tentativa de indexação bem-sucedida");
          // Verificar novamente após a segunda tentativa
          await new Promise(resolve => setTimeout(resolve, 500));

          const { data: verificacaoData, error: verificacaoError } = await supabase
            .from('Projeto')
            .select('projetc_index')
            .eq('id', projectId)
            .eq('user', userEmail)
            .single();
            
          if (verificacaoError || !verificacaoData.projetc_index) {
            console.error("Falha na verificação após segunda tentativa:", verificacaoError);
            return false;
          }
          
          return true;
        }
      } else {
        console.log("Verificação de indexação: OK");
        return true;
      }
    } catch (error) {
      console.error("Erro ao verificar indexação:", error);
      return false;
    }
  };
  
  const setProject = async (project: any) => {
    if (!project?.id) {
      console.error("Tentativa de selecionar projeto sem ID");
      return;
    }

    // ⚡ OTIMIZAÇÃO: Ativar flag de transição para pausar verificações periódicas
    isTransitioning.current = true;

    // Adicionar flag para impedir navegação durante a atualização
    const atualizacaoEmProgresso = 'projeto_atualizando_' + project.id;
    sessionStorage.setItem(atualizacaoEmProgresso, 'true');

    try {
      console.log("⚡ [Otimizado] Iniciando troca rápida de projeto");

      // IMPORTANTE: Resetar estados ANTES de trocar de projeto
      setIsInitialProcessing(false);
      setHasIntegrations(false);
      setProjectIntegrations([]); // Limpar integrações do projeto anterior

      // PRIMEIRO: Atualizar no banco de dados que este é o projeto ativo
      const atualizadoNoBanco = await updateProjectIndex(project);

      if (atualizadoNoBanco) {
        console.log("⚡ Projeto indexado, carregando dados em paralelo...");

        // ⚡ OTIMIZAÇÃO: Executar queries em paralelo usando Promise.all
        const [updatedProjects, processingState, onboardingCheck] = await Promise.all([
          loadUserProjects(),
          checkProjectProcessingState(project.id).then(() => true).catch(() => false),
          (async () => {
            const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';
            // SEMPRE buscar integrações, mesmo se já completou onboarding
            await determineOnboardingState(project.id);
            return userCompletedOnboarding;
          })()
        ]);

        // Encontrar o projeto atualizado na lista
        const updatedProject = updatedProjects.find(p => p.id === project.id) || project;

        // ⚡ OTIMIZAÇÃO: Batch de state updates usando startTransition
        startTransition(() => {
          setCurrentProject(updatedProject);
          setProjects(updatedProjects);

          // Se usuário já completou onboarding, configurar estados
          if (onboardingCheck) {
            setOnboardingStep(4);
            setHasData(true);
            setOnboardingReady(true);
          }
        });

        // Limpar cache do projeto anterior
        sessionStorage.removeItem('lastProjectId');
        sessionStorage.setItem('lastProjectId', project.id.toString());

        console.log("✅ [Otimizado] Troca de projeto concluída rapidamente");
      } else {
        console.error("Falha ao atualizar o projeto no Supabase");
      }
    } catch (error) {
      console.error("Erro durante a atualização do projeto:", error);
    } finally {
      // ⚡ OTIMIZAÇÃO: Desativar flag de transição após breve delay
      setTimeout(() => {
        isTransitioning.current = false;
      }, 500);

      // Remover flag de atualização em progresso
      sessionStorage.removeItem(atualizacaoEmProgresso);
    }
  };
  
  // Função para determinar o estado de onboarding com base no projeto
  const determineOnboardingState = async (projectId: string | number, forceComplete: boolean = false) => {
    try {
      // Verificar se o usuário já completou o onboarding antes
      const userCompletedOnboarding = localStorage.getItem('userCompletedOnboarding') === 'true';

      // ⚡ OTIMIZAÇÃO: Buscar todas as integrações de uma vez (ativas e inativas)
      const { data: anyIntegrations } = await supabase
        .from('Integrações')
        .select('*')
        .eq('PROJETO id', projectId);

      // Filtrar integrações ativas no cliente (evita query extra)
      const activeIntegrations = anyIntegrations?.filter(i => i.ativo) || [];

      // Projeto tem integrações ativas?
      const projectHasActiveIntegrations = activeIntegrations.length > 0;
      // Projeto já teve alguma integração (mesmo que não esteja ativa agora)?
      const projectEverHadIntegrations = anyIntegrations && anyIntegrations.length > 0;
      
      // Armazenar as integrações para uso posterior
      setProjectIntegrations(anyIntegrations || []);
      
      setHasIntegrations(projectHasActiveIntegrations || false);
      
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

      // ⚡ OTIMIZAÇÃO: Cancelar subscription antiga ANTES de criar nova
      if (subscriptionRef.current) {
        console.log("⚡ Cancelando subscription antiga antes de criar nova");
        await subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
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

              // ⚡ OTIMIZAÇÃO: Ignorar eventos durante transição de projeto
              if (isTransitioning.current) {
                console.log("⚡ Ignorando evento real-time durante transição");
                return;
              }

              // Handle different types of changes
              if (payload.eventType === 'INSERT') {
                setProjects(prevProjects => [...prevProjects, payload.new as Project]);
              }
              else if (payload.eventType === 'UPDATE') {
                setProjects(prevProjects =>
                  prevProjects.map(project =>
                    project.id === payload.new.id ? payload.new as Project : project
                  )
                );

                // If current project was updated, update it
                if (currentProject && currentProject.id === payload.new.id) {
                  setCurrentProject(payload.new as Project);

                  // Verificar estado de processamento quando o status muda
                  if (payload.old.status !== payload.new.status) {
                    checkProjectProcessingState(payload.new.id);
                  }
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
      console.log('⚡ Real-time subscription established');
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  };

  // DEBUG: Monitorar quando o valor do contexto muda
  useEffect(() => {
    console.log("🔵 [ProjectContext Provider] currentProject no contexto mudou para:", currentProject);
    console.log("🔵 [ProjectContext Provider] ID:", currentProject?.id, "Nome:", currentProject?.["Project name"]);
  }, [currentProject]);

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
        hasMensagens,
        onboardingStep,
        isOnboarding,
        onboardingReady,
        projectIntegrations,
        isInitialProcessing
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