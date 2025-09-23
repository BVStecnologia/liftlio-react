import { useNavigate } from 'react-router-dom';
import { startTransition, useTransition } from 'react';
import { useGlobalLoading } from '../context/LoadingContext';

/**
 * Hook customizado para navegação com transição suave
 * Previne múltiplos loadings durante navegação entre rotas lazy-loaded
 */
export const useTransitionNavigation = () => {
  const navigate = useNavigate();
  const [isPending, startTransitionHook] = useTransition();
  const { showGlobalLoader, hideGlobalLoader } = useGlobalLoading();

  const navigateWithTransition = (to: string) => {
    // Ativar loading global imediatamente
    showGlobalLoader('Loading', 'Please wait...');

    // Usar startTransition para manter UI atual enquanto carrega
    startTransition(() => {
      navigate(to);

      // Desativar loading após pequeno delay para garantir transição suave
      setTimeout(() => {
        hideGlobalLoader();
      }, 100);
    });
  };

  const navigateWithTransitionAsync = async (to: string, beforeNavigate?: () => Promise<void>) => {
    // Ativar loading global
    showGlobalLoader('Loading', 'Please wait...');

    try {
      // Executar lógica antes de navegar (se fornecida)
      if (beforeNavigate) {
        await beforeNavigate();
      }

      // Navegar com transição
      startTransition(() => {
        navigate(to);
      });
    } finally {
      // Garantir que loading seja desativado
      setTimeout(() => {
        hideGlobalLoader();
      }, 100);
    }
  };

  return {
    navigate: navigateWithTransition,
    navigateAsync: navigateWithTransitionAsync,
    isPending,
    isNavigating: isPending
  };
};