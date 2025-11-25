import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import Spinner from '../components/ui/Spinner';
import { IconComponent } from '../utils/IconHelper';
import { FaPlay, FaStop, FaRedo, FaCheckCircle, FaTimesCircle, FaClock, FaRobot, FaGlobe, FaMousePointer, FaKeyboard, FaImage, FaPaperPlane, FaExpand, FaCompress, FaTrash, FaCircle, FaWifi, FaCamera, FaSyncAlt } from 'react-icons/fa';

// Browser Agent VPS Configuration
const BROWSER_AGENT_HOST = '173.249.22.2';
const BROWSER_ORCHESTRATOR_PORT = 8080;  // Orchestrator manages containers
const BROWSER_AGENT_BASE_PORT = 10100;   // Base port for browser agents

// Types
interface BrowserTask {
  id: string;
  project_id: number;
  task: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  response: {
    result?: string;
    success?: boolean;
    data?: any;
  } | null;
  error_message: string | null;
  iterations_used: number | null;
  actions_taken: any[] | null;
  behavior_used: any | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ContainerInfo {
  projectId: string | number;
  port: number;
  status: 'running' | 'stopped' | 'starting' | 'error';
  createdAt?: string;
  lastActivity?: string;
}

interface SSEEvent {
  type: 'action' | 'result' | 'error' | 'screenshot' | 'status';
  data: any;
  timestamp: string;
}

// Styled Components
const PageContainer = styled.div`
  padding: 0;
  min-height: calc(100vh - 80px);
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PageDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  max-width: 600px;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const BrowserViewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const BrowserFrame = styled.div<{ isExpanded?: boolean }>`
  background: ${props => props.theme.name === 'dark' ? '#0a0a0b' : '#f5f5f7'};
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  aspect-ratio: ${props => props.isExpanded ? 'auto' : '16/9'};
  min-height: ${props => props.isExpanded ? '600px' : '400px'};
  display: flex;
  flex-direction: column;
`;

const BrowserToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
  border-bottom: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`;

const ToolbarDots = styled.div`
  display: flex;
  gap: 6px;
`;

const Dot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const UrlBar = styled.div`
  flex: 1;
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToolbarButton = styled.button`
  padding: 6px;
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const BrowserContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.name === 'dark' ? '#000' : '#fff'};
  position: relative;
`;

const PlaceholderContent = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};

  svg {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
`;

const ConnectionStatus = styled.div<{ status: 'connected' | 'disconnected' | 'connecting' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    if (props.status === 'connected') return 'rgba(34, 197, 94, 0.15)';
    if (props.status === 'connecting') return 'rgba(234, 179, 8, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  }};
  color: ${props => {
    if (props.status === 'connected') return '#22c55e';
    if (props.status === 'connecting') return '#eab308';
    return '#ef4444';
  }};
`;

const StatusDot = styled.div<{ status: 'connected' | 'disconnected' | 'connecting' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.status === 'connected') return '#22c55e';
    if (props.status === 'connecting') return '#eab308';
    return '#ef4444';
  }};
  ${props => props.status === 'connecting' && `
    animation: pulse 1.5s ease-in-out infinite;
  `}

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const BrowserScreenshot = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`;

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
  border-top: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
`;

const ControlButton = styled.button<{ variant?: 'primary' | 'danger' | 'default' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: #fff;
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
  `}

  ${props => props.variant === 'danger' && `
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    &:hover { background: rgba(239, 68, 68, 0.25); }
  `}

  ${props => (!props.variant || props.variant === 'default') && `
    background: ${props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
    color: ${props.theme.colors.text.primary};
    &:hover { background: ${props.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}; }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const EventsLog = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'};
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
`;

const EventLine = styled.div<{ type: string }>`
  padding: 4px 0;
  color: ${props => {
    if (props.type === 'error') return '#ef4444';
    if (props.type === 'result') return '#22c55e';
    if (props.type === 'action') return '#8b5cf6';
    return props.theme.colors.text.secondary;
  }};

  .timestamp {
    color: ${props => props.theme.colors.text.secondary};
    margin-right: 8px;
  }
`;

const TaskInputSection = styled(Card)`
  padding: 20px;
`;

const TaskInputHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const TaskInputTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TaskTypeSelect = styled.select`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${props => props.theme.colors.text.primary};
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const TaskTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
    opacity: 0.6;
  }
`;

const TaskActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`;

const PrioritySelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
`;

const PriorityInput = styled.input`
  width: 60px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  color: ${props => props.theme.colors.text.primary};
  font-size: 13px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const SendButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TasksSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TasksHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TasksTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
    border-radius: 3px;
  }
`;

const TaskCard = styled(motion.div)<{ status: string }>`
  background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'};
  border: 1px solid ${props => {
    if (props.status === 'completed') return 'rgba(34, 197, 94, 0.3)';
    if (props.status === 'failed') return 'rgba(239, 68, 68, 0.3)';
    if (props.status === 'running') return 'rgba(139, 92, 246, 0.3)';
    return props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  }};
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => {
      if (props.status === 'completed') return 'rgba(34, 197, 94, 0.5)';
      if (props.status === 'failed') return 'rgba(239, 68, 68, 0.5)';
      if (props.status === 'running') return 'rgba(139, 92, 246, 0.5)';
      return '#8b5cf6';
    }};
  }
`;

const TaskCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const TaskStatus = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => {
    if (props.status === 'completed') return '#22c55e';
    if (props.status === 'failed') return '#ef4444';
    if (props.status === 'running') return '#8b5cf6';
    return props.theme.colors.text.secondary;
  }};
`;

const TaskTime = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
`;

const TaskText = styled.p`
  font-size: 13px;
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
`;

const TaskMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.theme.colors.text.secondary};

  svg {
    font-size: 36px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    if (props.status === 'completed') return 'rgba(34, 197, 94, 0.15)';
    if (props.status === 'failed') return 'rgba(239, 68, 68, 0.15)';
    if (props.status === 'running') return 'rgba(139, 92, 246, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => {
    if (props.status === 'completed') return '#22c55e';
    if (props.status === 'failed') return '#ef4444';
    if (props.status === 'running') return '#8b5cf6';
    return props.theme.colors.text.secondary;
  }};
`;

// Helper function
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <IconComponent icon={FaCheckCircle} />;
    case 'failed':
      return <IconComponent icon={FaTimesCircle} />;
    case 'running':
      return <Spinner size={12} />;
    default:
      return <IconComponent icon={FaClock} />;
  }
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Main Component
const LiftlioBrowser: React.FC = () => {
  const { currentProject } = useProject();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskText, setTaskText] = useState('');
  const [taskType, setTaskType] = useState('action');
  const [priority, setPriority] = useState(5);
  const [sending, setSending] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BrowserTask | null>(null);

  // Container & Connection state
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [containerLoading, setContainerLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get container port for project
  const getContainerPort = useCallback(() => {
    if (!currentProject?.id) return null;
    // Port is calculated as base port + project index (simplified)
    // In real implementation, orchestrator assigns ports
    return containerInfo?.port || null;
  }, [currentProject?.id, containerInfo]);

  // Check container status
  const checkContainerStatus = useCallback(async () => {
    if (!currentProject?.id) return;

    try {
      const response = await fetch(`http://${BROWSER_AGENT_HOST}:${BROWSER_ORCHESTRATOR_PORT}/containers`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and {containers: []} response format
        const containers = Array.isArray(data) ? data : (data.containers || []);
        const myContainer = containers.find((c: any) =>
          String(c.projectId) === String(currentProject.id)
        );

        if (myContainer) {
          setContainerInfo({
            projectId: myContainer.projectId,
            port: myContainer.mcpPort || myContainer.port,
            status: 'running',
            createdAt: myContainer.createdAt,
            lastActivity: myContainer.lastActivity
          });
          setConnectionStatus('connected');
        } else {
          setContainerInfo(null);
          setConnectionStatus('disconnected');
        }
      }
    } catch (err) {
      console.error('Error checking container status:', err);
      setConnectionStatus('disconnected');
    }
  }, [currentProject?.id]);

  // Create container for project
  const createContainer = useCallback(async () => {
    if (!currentProject?.id) return;

    setContainerLoading(true);
    setConnectionStatus('connecting');

    try {
      const response = await fetch(`http://${BROWSER_AGENT_HOST}:${BROWSER_ORCHESTRATOR_PORT}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: String(currentProject.id) })
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both container and nested container response
        const containerData = data.container || data;
        setContainerInfo({
          projectId: containerData.projectId,
          port: containerData.mcpPort || containerData.port,
          status: 'running'
        });
        setConnectionStatus('connected');
      } else {
        throw new Error('Failed to create container');
      }
    } catch (err) {
      console.error('Error creating container:', err);
      setConnectionStatus('disconnected');
    } finally {
      setContainerLoading(false);
    }
  }, [currentProject?.id]);

  // Stop container
  const stopContainer = useCallback(async () => {
    if (!currentProject?.id) return;

    setContainerLoading(true);

    try {
      await fetch(`http://${BROWSER_AGENT_HOST}:${BROWSER_ORCHESTRATOR_PORT}/containers/${currentProject.id}`, {
        method: 'DELETE'
      });

      setContainerInfo(null);
      setConnectionStatus('disconnected');
      setScreenshot(null);
      setEvents([]);
    } catch (err) {
      console.error('Error stopping container:', err);
    } finally {
      setContainerLoading(false);
    }
  }, [currentProject?.id]);

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    const port = getContainerPort();
    if (!port) return;

    try {
      const response = await fetch(`http://${BROWSER_AGENT_HOST}:${port}/mcp/screenshot`);
      if (response.ok) {
        const data = await response.json();
        if (data.screenshot) {
          setScreenshot(`data:image/png;base64,${data.screenshot}`);
        }
      }
    } catch (err) {
      console.error('Error capturing screenshot:', err);
    }
  }, [getContainerPort]);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    const port = getContainerPort();
    if (!port) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`http://${BROWSER_AGENT_HOST}:${port}/sse`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(prev => [...prev.slice(-50), {
          type: data.type || 'status',
          data: data,
          timestamp: new Date().toISOString()
        }]);

        // Update URL if navigated
        if (data.url) {
          setCurrentUrl(data.url);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  }, [getContainerPort]);

  // Check container status on mount
  useEffect(() => {
    checkContainerStatus();

    // Poll for container status every 30 seconds
    const interval = setInterval(checkContainerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkContainerStatus]);

  // Connect SSE and start screenshot polling when container is ready
  useEffect(() => {
    if (connectionStatus === 'connected' && containerInfo?.port) {
      // Connect to SSE
      connectSSE();

      // Start screenshot polling every 2 seconds
      screenshotIntervalRef.current = setInterval(captureScreenshot, 2000);
      captureScreenshot(); // Immediate capture

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        if (screenshotIntervalRef.current) {
          clearInterval(screenshotIntervalRef.current);
        }
      };
    }
  }, [connectionStatus, containerInfo?.port, connectSSE, captureScreenshot]);

  // Fetch tasks
  useEffect(() => {
    if (!currentProject?.id) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('browser_tasks')
          .select('*')
          .eq('project_id', currentProject.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        console.error('Error fetching browser tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('browser_tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'browser_tasks',
        filter: `project_id=eq.${currentProject.id}`
      }, (payload) => {
        console.log('Browser task update:', payload);

        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as BrowserTask, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t =>
            t.id === payload.new.id ? payload.new as BrowserTask : t
          ));

          // Update selected task if it's the one that was updated
          if (selectedTask?.id === payload.new.id) {
            setSelectedTask(payload.new as BrowserTask);
          }
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProject?.id]);

  // Send task
  const handleSendTask = async () => {
    if (!taskText.trim() || !currentProject?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('browser_tasks')
        .insert({
          project_id: currentProject.id,
          task: taskText.trim(),
          task_type: taskType,
          priority: priority,
          status: 'pending'
        });

      if (error) throw error;

      setTaskText('');
    } catch (err) {
      console.error('Error sending task:', err);
    } finally {
      setSending(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('browser_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <IconComponent icon={FaGlobe} style={{ color: '#8b5cf6' }} />
          Browser
        </PageTitle>
        <PageDescription>
          AI-powered browser automation. Send natural language tasks and let Claude AI execute them automatically.
        </PageDescription>
      </PageHeader>

      <MainGrid>
        <BrowserViewSection>
          {/* Browser Frame */}
          <BrowserFrame isExpanded={isExpanded}>
            <BrowserToolbar>
              <ToolbarDots>
                <Dot color="#ff5f57" />
                <Dot color="#febc2e" />
                <Dot color="#28c840" />
              </ToolbarDots>
              <UrlBar>
                <IconComponent icon={FaGlobe} />
                {currentUrl || 'Browser ready - send a task to begin'}
              </UrlBar>
              <ConnectionStatus status={connectionStatus}>
                <StatusDot status={connectionStatus} />
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </ConnectionStatus>
              <ToolbarButton onClick={captureScreenshot} title="Capture screenshot">
                <IconComponent icon={FaCamera} />
              </ToolbarButton>
              <ToolbarButton onClick={() => setIsExpanded(!isExpanded)}>
                <IconComponent icon={isExpanded ? FaCompress : FaExpand} />
              </ToolbarButton>
            </BrowserToolbar>
            <BrowserContent>
              {/* Show screenshot if available and connected */}
              {connectionStatus === 'connected' && screenshot ? (
                <BrowserScreenshot src={screenshot} alt="Browser view" />
              ) : connectionStatus === 'connecting' ? (
                <PlaceholderContent>
                  <Spinner size={40} />
                  <p style={{ marginTop: '16px' }}>Starting browser...</p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>This may take a few seconds</p>
                </PlaceholderContent>
              ) : connectionStatus === 'disconnected' ? (
                <PlaceholderContent>
                  <IconComponent icon={FaGlobe} />
                  <p>Browser not connected</p>
                  <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                    Start the browser to view and interact with it
                  </p>
                  <ControlButton
                    variant="primary"
                    onClick={createContainer}
                    disabled={containerLoading}
                    style={{ margin: '0 auto' }}
                  >
                    {containerLoading ? <Spinner size={14} /> : <IconComponent icon={FaPlay} />}
                    Start Browser
                  </ControlButton>
                </PlaceholderContent>
              ) : selectedTask && selectedTask.status === 'running' ? (
                <PlaceholderContent>
                  <Spinner size={40} />
                  <p style={{ marginTop: '16px' }}>Executing task...</p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>
                    {selectedTask.task.substring(0, 100)}{selectedTask.task.length > 100 ? '...' : ''}
                  </p>
                </PlaceholderContent>
              ) : selectedTask && selectedTask.response ? (
                <div style={{ padding: '20px', width: '100%', height: '100%', overflow: 'auto' }}>
                  <StatusBadge status={selectedTask.status}>
                    {getStatusIcon(selectedTask.status)}
                    {selectedTask.status}
                  </StatusBadge>
                  <h4 style={{ margin: '16px 0 8px', color: theme.name === 'dark' ? '#fff' : '#000' }}>Result:</h4>
                  <pre style={{
                    fontSize: '13px',
                    background: theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(selectedTask.response, null, 2)}
                  </pre>
                </div>
              ) : (
                <PlaceholderContent>
                  <IconComponent icon={FaRobot} />
                  <p>Select a task to view results</p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>or send a new task below</p>
                </PlaceholderContent>
              )}
            </BrowserContent>
            {/* Controls bar when connected */}
            {connectionStatus === 'connected' && (
              <ControlsBar>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <ControlButton onClick={captureScreenshot} title="Refresh screenshot">
                    <IconComponent icon={FaSyncAlt} />
                    Refresh
                  </ControlButton>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <ControlButton
                    variant="danger"
                    onClick={stopContainer}
                    disabled={containerLoading}
                  >
                    {containerLoading ? <Spinner size={14} /> : <IconComponent icon={FaStop} />}
                    Stop Browser
                  </ControlButton>
                </div>
              </ControlsBar>
            )}
          </BrowserFrame>

          {/* Task Input */}
          <TaskInputSection>
            <TaskInputHeader>
              <TaskInputTitle>
                <IconComponent icon={FaPaperPlane} />
                New Task
              </TaskInputTitle>
              <TaskTypeSelect value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                <option value="action">Action</option>
                <option value="query">Query</option>
                <option value="scrape">Scrape</option>
                <option value="login">Login</option>
              </TaskTypeSelect>
            </TaskInputHeader>

            <TaskTextarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Describe what you want the browser to do...&#10;&#10;Examples:&#10;- Go to youtube.com and search for 'AI news'&#10;- Collect the titles of the first 5 videos&#10;- Login to my account and check notifications"
            />

            <TaskActions>
              <PrioritySelector>
                Priority:
                <PriorityInput
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                />
                <span style={{ opacity: 0.6 }}>(1=urgent, 10=low)</span>
              </PrioritySelector>

              <SendButton
                onClick={handleSendTask}
                disabled={!taskText.trim() || sending}
              >
                {sending ? <Spinner size={14} /> : <IconComponent icon={FaPaperPlane} />}
                {sending ? 'Sending...' : 'Send Task'}
              </SendButton>
            </TaskActions>
          </TaskInputSection>
        </BrowserViewSection>

        {/* Tasks Sidebar */}
        <TasksSidebar>
          <Card style={{ padding: '16px' }}>
            <TasksHeader>
              <TasksTitle>Recent Tasks</TasksTitle>
              <span style={{ fontSize: '12px', color: theme.name === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                {tasks.length} tasks
              </span>
            </TasksHeader>
          </Card>

          <TasksList>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size={24} />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState>
                <IconComponent icon={FaRobot} />
                <p>No tasks yet</p>
                <p style={{ fontSize: '12px', opacity: 0.7 }}>Send your first task to get started</p>
              </EmptyState>
            ) : (
              <AnimatePresence>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    status={task.status}
                    onClick={() => setSelectedTask(task)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      background: selectedTask?.id === task.id
                        ? (theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)')
                        : undefined
                    }}
                  >
                    <TaskCardHeader>
                      <TaskStatus status={task.status}>
                        {getStatusIcon(task.status)}
                        {task.status}
                      </TaskStatus>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TaskTime>{formatTimeAgo(task.created_at)}</TaskTime>
                        <ToolbarButton
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          style={{ padding: '4px' }}
                        >
                          <IconComponent icon={FaTrash} style={{ fontSize: '10px' }} />
                        </ToolbarButton>
                      </div>
                    </TaskCardHeader>

                    <TaskText>{task.task}</TaskText>

                    <TaskMeta>
                      <TaskMetaItem>
                        <IconComponent icon={FaClock} />
                        {task.task_type}
                      </TaskMetaItem>
                      {task.iterations_used && (
                        <TaskMetaItem>
                          <IconComponent icon={FaMousePointer} />
                          {task.iterations_used} steps
                        </TaskMetaItem>
                      )}
                    </TaskMeta>
                  </TaskCard>
                ))}
              </AnimatePresence>
            )}
          </TasksList>
        </TasksSidebar>
      </MainGrid>
    </PageContainer>
  );
};

export default LiftlioBrowser;
