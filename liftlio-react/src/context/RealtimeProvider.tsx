import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useProject } from './ProjectContext';
import { supabase } from '../lib/supabaseClient';

// Event emitter for global realtime events
class RealtimeEventEmitter extends EventTarget {
  emit(eventType: string, data: any) {
    this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }
}

// Create singleton instance
const realtimeEmitter = new RealtimeEventEmitter();

interface RealtimeContextType {
  emitter: RealtimeEventEmitter;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
  emitter: realtimeEmitter,
  isConnected: false
});

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    // Return default if provider not found (backward compatibility)
    return {
      emitter: realtimeEmitter,
      isConnected: false
    };
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { currentProject } = useProject();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentProject?.id) {
      console.log('🔌 RealtimeProvider: No project selected');
      return;
    }

    console.log('🚀 RealtimeProvider: Setting up global channel for project', currentProject.id);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create single global channel for all analytics events
    const channel = supabase
      .channel('global-analytics-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public', 
          table: 'analytics',
          filter: `project_id=eq.${currentProject.id}`
        },
        (payload) => {
          console.log('📡 RealtimeProvider: New analytics event received', payload);
          
          // Emit to all listeners
          realtimeEmitter.emit('analytics-insert', payload);
          
          // Also emit specific events for backward compatibility
          realtimeEmitter.emit('analytics-update', payload);
          realtimeEmitter.emit('new-analytics-data', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analytics', 
          filter: `project_id=eq.${currentProject.id}`
        },
        (payload) => {
          console.log('📡 RealtimeProvider: Analytics update received', payload);
          realtimeEmitter.emit('analytics-update', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'analytics',
          filter: `project_id=eq.${currentProject.id}`
        },
        (payload) => {
          console.log('📡 RealtimeProvider: Analytics delete received', payload);
          realtimeEmitter.emit('analytics-delete', payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ RealtimeProvider: Successfully subscribed to global channel');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ RealtimeProvider: Channel error');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ RealtimeProvider: Subscription timed out');
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or project change
    return () => {
      console.log('🧹 RealtimeProvider: Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [currentProject?.id]);

  return (
    <RealtimeContext.Provider value={{ emitter: realtimeEmitter, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

// Export the singleton emitter for components that might not have provider
export { realtimeEmitter };