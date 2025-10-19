import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingDataIndicator from './LoadingDataIndicator';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { subscription, checkingSubscription, loading, checkSubscription, user, clearSubscriptionCache } = useAuth();
  
  // Força verificação da assinatura quando o componente monta
  useEffect(() => {
    console.log('SubscriptionGate mounted - Estado atual:', {
      user: !!user,
      loading,
      checkingSubscription,
      subscription,
      has_active_subscription: subscription?.has_active_subscription
    });
    
    if (user && !checkingSubscription && !loading) {
      console.log('Forçando verificação de assinatura no SubscriptionGate...');
      clearSubscriptionCache(); // Limpa o cache primeiro
      checkSubscription(true); // Force check
    }
  }, [user]);
  
  // Mostrar loading enquanto verifica
  if (loading || checkingSubscription) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingDataIndicator />
      </div>
    );
  }

  // ========================================
  // 1. VERIFICAR WAITLIST PRIMEIRO
  // ========================================
  // Se não está aprovado na waitlist, bloqueia TUDO
  if (subscription && !subscription.waitlist_approved) {
    console.log('Usuário não aprovado na waitlist - bloqueando acesso:', {
      waitlist_status: subscription.waitlist_status,
      message: subscription.message
    });
    return <Navigate to="/waitlist-pending" replace />;
  }

  // ========================================
  // 2. SE APROVADO MAS SEM SUBSCRIPTION
  // ========================================
  // Permite ir para checkout
  if (subscription && !subscription.has_active_subscription) {
    console.log('Aprovado na waitlist mas sem subscription - redirecionando para checkout');
    return <Navigate to="/checkout" replace />;
  }

  // ========================================
  // 3. SE APROVADO E COM SUBSCRIPTION ATIVA
  // ========================================
  // Mostra o conteúdo protegido
  return <>{children}</>;
};

export default SubscriptionGate;