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
  
  // Se não tem assinatura ativa, redireciona para checkout
  if (!subscription?.has_active_subscription) {
    console.log('Redirecionando para checkout - subscription:', subscription);
    return <Navigate to="/checkout" replace />;
  }
  
  // Se tem assinatura ativa, mostra o conteúdo
  return <>{children}</>;
};

export default SubscriptionGate;