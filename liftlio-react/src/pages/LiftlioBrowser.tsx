import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/Card';
import Spinner from '../components/ui/Spinner';
import { IconComponent } from '../utils/IconHelper';
import { FaPlay, FaStop, FaCheckCircle, FaTimesCircle, FaTimes, FaClock, FaRobot, FaGlobe, FaMousePointer, FaPaperPlane, FaExpand, FaCompress, FaTrash, FaCamera, FaDesktop, FaChevronDown, FaChevronUp, FaEye, FaCopy } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

// VNC port is now dynamic per project (16000 + projectId)
// No fixed VNC_PORT - determined at runtime from orchestrator

// Browser MCP Configuration - DYNAMIC (LOCAL ou VPS)
const BROWSER_ORCHESTRATOR_URL = process.env.REACT_APP_BROWSER_ORCHESTRATOR_URL || 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/browser-proxy';
const BROWSER_MCP_API_KEY = process.env.REACT_APP_BROWSER_MCP_API_KEY || '';

// Modo DIRETO (localhost) ou via Edge Function (VPS)
const USE_DIRECT_MODE = BROWSER_ORCHESTRATOR_URL.startsWith('http://localhost');

console.log('[LiftlioBrowser] ORCHESTRATOR_URL:', BROWSER_ORCHESTRATOR_URL, 'USE_DIRECT_MODE:', USE_DIRECT_MODE, 'API_KEY:', !!BROWSER_MCP_API_KEY);

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
  apiPort?: number;      // Dynamic API port (10000 + projectId)
  vncPort?: number;      // Dynamic VNC port (16000 + projectId)
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

  /* Fullscreen styles */
  &:fullscreen {
    width: 100vw;
    height: 100vh;
    aspect-ratio: auto;
    min-height: 100vh;
    border-radius: 0;
    border: none;
    padding-top: 5px;
    box-sizing: border-box;
  }

  &:fullscreen ${() => BrowserContent} {
    flex: 1;
  }
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
  overflow: hidden;
  min-height: 0;
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

const VNCWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 10;

  /* Ensure wrapper doesn't block any events - pass everything to iframe */
  pointer-events: none;

  & > iframe {
    pointer-events: auto;
  }
`;

const VNCFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
  display: block;
  overflow: hidden;
  pointer-events: auto;

  /* Ensure iframe can receive all input events */
  &:focus {
    outline: none;
  }
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VNCToggle = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.active ? 'rgba(139, 92, 246, 0.2)' : 'transparent'};
  color: ${props => props.active ? '#8b5cf6' : props.theme.colors.text.secondary};

  &:hover {
    background: ${props => props.active ? 'rgba(139, 92, 246, 0.3)' : props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EventsLog = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'};
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const ResponsePreview = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.05)'};
  border-radius: 8px;
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  border-left: 3px solid rgba(34, 197, 94, 0.5);
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #8b5cf6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'};
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const MarkdownContent = styled.div`
  font-size: 13px;
  line-height: 1.6;
  color: ${props => props.theme.colors.text.primary};

  p {
    margin-bottom: 12px;
  }

  code {
    background: ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
  }

  pre {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
  }

  strong {
    color: ${props => props.theme.colors.text.primary};
    font-weight: 600;
  }
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
      return <Spinner size="sm" />;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BrowserTask | null>(null);
  const [isResponseExpanded, setIsResponseExpanded] = useState(true);
  // Track which task responses are expanded in the list (by task ID)
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());

  // Container & Connection state
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [dynamicApiPort, setDynamicApiPort] = useState<number | null>(null);
  const [dynamicVncPort, setDynamicVncPort] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [events, setEvents] = useState<SSEEvent[]>([]);

  // VNC state - default to TRUE so VNC shows automatically
  const [vncEnabled, setVncEnabled] = useState(() => { const saved = localStorage.getItem('liftlio-vnc-enabled'); return saved !== 'false'; });
  const [vncLoading, setVncLoading] = useState(false);
  const vncHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const vncCacheBusterRef = useRef<number>(Date.now()); // Stable cache buster - only changes on VNC restart
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const vncShouldAutoStart = useRef(localStorage.getItem('liftlio-vnc-enabled') === 'true');
  const [containerLoading, setContainerLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const browserFrameRef = useRef<HTMLDivElement>(null);
  const vncIframeRef = useRef<HTMLIFrameElement>(null);

  // VNC iframe ref for potential focus operations
  // (pointer-events now go directly to iframe via CSS)

  // Toggle real fullscreen using Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    if (!browserFrameRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await browserFrameRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes (e.g., pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Helper: Extract port from URL (e.g., "http://173.249.22.2:16001/vnc.html" -> 16001)
  const extractPortFromUrl = useCallback((url: string | undefined): number | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return parseInt(urlObj.port, 10) || null;
    } catch {
      const match = url.match(/:(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }
  }, []);

  // Get VNC port from project's browser_vnc_url (filled by orchestrator CRON)
  const getProjectVncPort = useCallback(() => {
    if (!currentProject?.id) return null;

    // PRIMARY: Use port from browser_vnc_url in Projeto table (set by orchestrator)
    const projectVncUrl = (currentProject as any).browser_vnc_url;
    if (projectVncUrl) {
      const portFromProject = extractPortFromUrl(projectVncUrl);
      if (portFromProject) {
        console.log(`[LiftlioBrowser] VNC using project port ${portFromProject} from browser_vnc_url`);
        return portFromProject;
      }
    }

    // FALLBACK: Use dynamicVncPort from orchestrator API
    if (dynamicVncPort) {
      console.log(`[LiftlioBrowser] VNC using orchestrator port ${dynamicVncPort}`);
      return dynamicVncPort;
    }

    // LAST RESORT: Calculate (may be wrong)
    const calculatedPort = 16000 + Number(currentProject.id);
    console.log(`[LiftlioBrowser] VNC using calculated port ${calculatedPort} (fallback)`);
    return calculatedPort;
  }, [currentProject, dynamicVncPort, extractPortFromUrl]);

  // Get API/MCP port from project's browser_mcp_url (filled by orchestrator CRON)
  const getContainerPort = useCallback(() => {
    if (!currentProject?.id) return null;

    // PRIMARY: Use port from browser_mcp_url in Projeto table (set by orchestrator)
    const projectMcpUrl = (currentProject as any).browser_mcp_url;
    if (projectMcpUrl) {
      const portFromProject = extractPortFromUrl(projectMcpUrl);
      if (portFromProject) {
        console.log(`[LiftlioBrowser] API using project port ${portFromProject} from browser_mcp_url`);
        return portFromProject;
      }
    }

    // FALLBACK: Use dynamicApiPort from orchestrator API
    if (dynamicApiPort) {
      console.log(`[LiftlioBrowser] API using orchestrator port ${dynamicApiPort}`);
      return dynamicApiPort;
    }

    // LAST RESORT: Calculate (may be wrong)
    const calculatedPort = 10000 + Number(currentProject.id);
    console.log(`[LiftlioBrowser] API using calculated port ${calculatedPort} (fallback)`);
    return calculatedPort;
  }, [currentProject, dynamicApiPort, extractPortFromUrl]);

  // Get full VNC URL from project's browser_vnc_url (VPS URL, not localhost)
  const getVncFullUrl = useCallback(() => {
    // PRIMARY: Use browser_vnc_url from Projeto table (includes VPS IP)
    const projectVncUrl = (currentProject as any)?.browser_vnc_url;
    if (projectVncUrl) {
      // Replace vnc.html with vnc_lite.html for better performance
      const baseUrl = projectVncUrl.replace('/vnc.html', '/vnc_lite.html');
      // Add extra params if not present
      const url = new URL(baseUrl);
      url.searchParams.set('autoconnect', 'true');
      url.searchParams.set('resize', 'scale');
      url.searchParams.set('reconnect', 'true');
      url.searchParams.set('reconnect_delay', '1000');
      url.searchParams.set('view_only', 'false');
      url.searchParams.set('_cb', String(vncCacheBusterRef.current));
      console.log(`[LiftlioBrowser] VNC using project URL: ${url.toString()}`);
      return url.toString();
    }

    // FALLBACK: Construct from VPS IP + port
    const vncPort = getProjectVncPort();
    if (vncPort) {
      const fallbackUrl = `http://173.249.22.2:${vncPort}/vnc_lite.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000&view_only=false&_cb=${vncCacheBusterRef.current}`;
      console.log(`[LiftlioBrowser] VNC using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    }

    return null;
  }, [currentProject, getProjectVncPort]);

  // Initialize browser in container
  const initializeBrowser = useCallback(async (port: number) => {
    try {
      console.log('[LiftlioBrowser] Initializing browser on port', port);
      const response = await fetch(`http://173.249.22.2:${port}/browser/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: String(currentProject?.id) })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[LiftlioBrowser] Browser initialized:', data);
        return true;
      } else {
        console.error('[LiftlioBrowser] Failed to initialize browser:', await response.text());
        return false;
      }
    } catch (err) {
      console.error('[LiftlioBrowser] Error initializing browser:', err);
      return false;
    }
  }, [currentProject?.id]);

  // Check container status using /containers/:projectId/info endpoint
  const checkContainerStatus = useCallback(async () => {
    if (!currentProject?.id) return;

    try {
      const headers: Record<string, string> = {};
      if (BROWSER_MCP_API_KEY) {
        headers['X-API-Key'] = BROWSER_MCP_API_KEY;
      }

      // Use the new /info endpoint that returns dynamic ports
      const response = await fetch(
        `${BROWSER_ORCHESTRATOR_URL}/containers/${currentProject.id}/info`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();

        console.log(`[LiftlioBrowser] Container ready - API: ${data.apiPort}, VNC: ${data.vncPort}`);

        setContainerInfo({
          projectId: data.projectId,
          port: data.apiPort,
          apiPort: data.apiPort,
          vncPort: data.vncPort,
          status: data.status || 'running',
          createdAt: data.createdAt,
          lastActivity: data.lastActivity,
        });

        setDynamicApiPort(data.apiPort);
        setDynamicVncPort(data.vncPort);
        setConnectionStatus('connected');

        // Auto-initialize browser if needed
        try {
          const healthRes = await fetch(`http://173.249.22.2:${data.apiPort}/health`);
          if (healthRes.ok) {
            const healthData = await healthRes.json();
            if (!healthData.browserRunning) {
              console.log('[LiftlioBrowser] Browser not running, initializing...');
              await initializeBrowser(data.apiPort);
            }
          }
        } catch (healthErr) {
          console.log('[LiftlioBrowser] Could not check health, trying to init browser anyway');
          await initializeBrowser(data.apiPort);
        }
      } else {
        // Container not found or error - reset state
        setContainerInfo(null);
        setDynamicApiPort(null);
        setDynamicVncPort(null);
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Error checking container status:', err);
      setConnectionStatus('disconnected');
    }
  }, [currentProject?.id, initializeBrowser]);

  // Create container for project
  const createContainer = useCallback(async () => {
    if (!currentProject?.id) return;

    setContainerLoading(true);
    setConnectionStatus('connecting');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (BROWSER_MCP_API_KEY) {
        headers['X-API-Key'] = BROWSER_MCP_API_KEY;
      }

      const response = await fetch(`${BROWSER_ORCHESTRATOR_URL}/containers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId: String(currentProject.id) })
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both container and nested container response
        const containerData = data.container || data;

        // Set dynamic ports from response
        const apiPort = containerData.apiPort || containerData.mcpPort || containerData.port;
        const vncPort = containerData.vncPort;

        console.log(`[LiftlioBrowser] Container created - API: ${apiPort}, VNC: ${vncPort}`);

        setContainerInfo({
          projectId: containerData.projectId,
          port: apiPort,
          apiPort: apiPort,
          vncPort: vncPort,
          status: 'running'
        });

        setDynamicApiPort(apiPort);
        setDynamicVncPort(vncPort);
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
      const headers: Record<string, string> = {};
      if (BROWSER_MCP_API_KEY) {
        headers['X-API-Key'] = BROWSER_MCP_API_KEY;
      }

      await fetch(`${BROWSER_ORCHESTRATOR_URL}/containers/${currentProject.id}`, {
        method: 'DELETE',
        headers
      });

      // Reset all container-related state
      setContainerInfo(null);
      setDynamicApiPort(null);
      setDynamicVncPort(null);
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
      const response = await fetch(`http://173.249.22.2:${port}/mcp/screenshot`);
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

  // Start VNC services
  const startVNC = useCallback(async () => {
    const port = getContainerPort();
    if (!port) return;

    setVncLoading(true);
    try {
      const response = await fetch(`http://173.249.22.2:${port}/vnc/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Reset cache buster so iframe gets fresh connection
        vncCacheBusterRef.current = Date.now();
        setVncEnabled(true);
        console.log('[VNC] Started successfully');

        // Stop screenshot polling when VNC is active
        if (screenshotIntervalRef.current) {
          clearInterval(screenshotIntervalRef.current);
          screenshotIntervalRef.current = null;
        }

        // Start VNC heartbeat (every 30s to keep alive)
        vncHeartbeatRef.current = setInterval(async () => {
          try {
            await fetch(`http://173.249.22.2:${port}/vnc/heartbeat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (e) { /* ignore */ }
        }, 30000);

        // Note: Browser will appear when you send a task
        // (Playwright closes browser after each task, so warmup doesn't work well)
        setCurrentUrl('Ready - send a task to start browser');
      } else {
        console.error('[VNC] Failed to start:', await response.text());
      }
    } catch (err) {
      console.error('[VNC] Error starting:', err);
    } finally {
      setVncLoading(false);
    }
  }, [getContainerPort]);

  // Stop VNC services
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopVNC = useCallback(async () => {
    const port = getContainerPort();
    if (!port) return;

    try {
      await fetch(`http://173.249.22.2:${port}/vnc/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('[VNC] Error stopping:', err);
    }

    setVncEnabled(false);

    // Clear VNC heartbeat
    if (vncHeartbeatRef.current) {
      clearInterval(vncHeartbeatRef.current);
      vncHeartbeatRef.current = null;
    }

    // Restart screenshot polling
    if (connectionStatus === 'connected' && containerInfo?.port) {
      screenshotIntervalRef.current = setInterval(captureScreenshot, 2000);
      captureScreenshot();
    }
  }, [getContainerPort, connectionStatus, containerInfo?.port, captureScreenshot]);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    const port = getContainerPort();
    if (!port) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`http://173.249.22.2:${port}/sse`);

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
      console.error('[SSE] Connection error');
      eventSource.close();
      eventSourceRef.current = null;

      // Auto-reconnect after 3 seconds if container is still running
      const port = getContainerPort();
      if (port) {
        setTimeout(() => {
          console.log('[SSE] Attempting reconnect...');
          connectSSE();
        }, 3000);
      }
    };

    eventSourceRef.current = eventSource;
  }, [getContainerPort]);

  // Sync connection status from project's browser_session_status (filled by orchestrator CRON)
  useEffect(() => {
    if (!currentProject) return;

    const status = (currentProject as any).browser_session_status;
    const vncUrl = (currentProject as any).browser_vnc_url;
    const mcpUrl = (currentProject as any).browser_mcp_url;

    console.log(`[LiftlioBrowser] Project browser status: ${status}, VNC: ${vncUrl}, MCP: ${mcpUrl}`);

    if (status === 'running' && vncUrl && mcpUrl) {
      // Container is running - extract ports from URLs
      const vncPort = vncUrl.match(/:(\d+)/)?.[1];
      const mcpPort = mcpUrl.match(/:(\d+)/)?.[1];

      if (vncPort && mcpPort) {
        console.log(`[LiftlioBrowser] Container running - VNC port: ${vncPort}, MCP port: ${mcpPort}`);
        setDynamicVncPort(parseInt(vncPort, 10));
        setDynamicApiPort(parseInt(mcpPort, 10));
        setContainerInfo({
          projectId: currentProject.id,
          port: parseInt(mcpPort, 10),
          apiPort: parseInt(mcpPort, 10),
          vncPort: parseInt(vncPort, 10),
          status: 'running',
        });
        setConnectionStatus('connected');
      }
    } else if (status === 'inactive' || !status) {
      setConnectionStatus('disconnected');
    }
  }, [currentProject]);

  // Check container status on mount (fallback to orchestrator API)
  useEffect(() => {
    // Only check orchestrator if project doesn't have status yet
    if ((currentProject as any)?.browser_session_status !== 'running') {
      checkContainerStatus();
    }

    // Poll for container status every 30 seconds
    const interval = setInterval(checkContainerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkContainerStatus, currentProject]);

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

  // Cleanup VNC on unmount or disconnect
  useEffect(() => {
    return () => {
      if (vncHeartbeatRef.current) {
        clearInterval(vncHeartbeatRef.current);
        vncHeartbeatRef.current = null;
      }
    };
  }, []);
  
  // Stop VNC when disconnected
  useEffect(() => {
    if (connectionStatus !== 'connected' && vncEnabled) {
      setVncEnabled(false);
      if (vncHeartbeatRef.current) {
        clearInterval(vncHeartbeatRef.current);
        vncHeartbeatRef.current = null;
      }
    }
  }, [connectionStatus, vncEnabled]);

  // Persist VNC state to localStorage
  useEffect(() => {
    localStorage.setItem('liftlio-vnc-enabled', String(vncEnabled));
  }, [vncEnabled]);

  // Auto-start VNC when connected (always enable interactive mode)
  useEffect(() => {
    if (connectionStatus === 'connected' && !vncEnabled && !vncLoading) {
      console.log('[VNC] Auto-starting VNC (interactive mode by default)');
      startVNC();
    }
  }, [connectionStatus, vncEnabled, vncLoading, startVNC]);

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
          // Only add if not already in the list (avoid duplicates from optimistic updates)
          setTasks(prev => {
            const exists = prev.some(t => t.id === (payload.new as BrowserTask).id);
            if (exists) return prev;
            return [payload.new as BrowserTask, ...prev];
          });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  // Send task
  const handleSendTask = async () => {
    if (!taskText.trim() || !currentProject?.id) return;

    setSending(true);
    try {
      // Insert task in Supabase for history
      const { data: insertedTask, error } = await supabase
        .from('browser_tasks')
        .insert({
          project_id: currentProject.id,
          task: taskText.trim(),
          task_type: taskType,
          priority: priority,
          status: 'running'
        })
        .select()
        .single();

      if (error) throw error;

      // Add task to UI immediately (optimistic update)
      if (insertedTask) {
        setTasks(prev => [insertedTask as BrowserTask, ...prev]);
        setSelectedTask(insertedTask as BrowserTask);
      }

      // Call browser agent directly (use dynamic port if available, otherwise orchestrator)
      if (containerInfo?.status === 'running') {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (BROWSER_MCP_API_KEY) {
            headers['X-API-Key'] = BROWSER_MCP_API_KEY;
          }

          // Use dynamic API port for direct container communication (localhost only)
          // For remote (VPS), always route through Edge Function with projectId
          const agentUrl = USE_DIRECT_MODE && dynamicApiPort
            ? `http://173.249.22.2:${dynamicApiPort}/agent/task`
            : `${BROWSER_ORCHESTRATOR_URL}/containers/${currentProject.id}/agent/task`;

          console.log(`[LiftlioBrowser] Sending task to: ${agentUrl}`);

          const agentResponse = await fetch(agentUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              task: taskText.trim(),
              taskId: insertedTask.id,
              projectId: currentProject.id.toString(),
              model: 'claude-haiku-4-5-20251001',
              maxIterations: 50,
              verbose: false
            })
          });

          if (agentResponse.ok) {
            const result = await agentResponse.json();
            const updatedTask = {
              ...insertedTask,
              status: result.success ? 'completed' : 'failed',
              completed_at: new Date().toISOString(),
              response: { result: result.result, success: result.success },
              iterations_used: result.iterations,
              actions_taken: result.actions,
              error_message: result.success ? null : result.result
            } as BrowserTask;

            // Update local state immediately
            setTasks(prev => prev.map(t => t.id === insertedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask);

            // Update in database
            await supabase
              .from('browser_tasks')
              .update({
                status: updatedTask.status,
                completed_at: updatedTask.completed_at,
                response: updatedTask.response,
                iterations_used: updatedTask.iterations_used,
                actions_taken: updatedTask.actions_taken,
                error_message: updatedTask.error_message
              })
              .eq('id', insertedTask.id);
          } else {
            const errorText = await agentResponse.text();
            const failedTask = {
              ...insertedTask,
              status: 'failed' as const,
              completed_at: new Date().toISOString(),
              error_message: `Agent error: ${errorText}`
            } as BrowserTask;

            // Update local state immediately
            setTasks(prev => prev.map(t => t.id === insertedTask.id ? failedTask : t));
            setSelectedTask(failedTask);

            await supabase
              .from('browser_tasks')
              .update({
                status: 'failed',
                completed_at: failedTask.completed_at,
                error_message: failedTask.error_message
              })
              .eq('id', insertedTask.id);
          }
        } catch (agentErr) {
          console.error('Error calling browser agent:', agentErr);
          const failedTask = {
            ...insertedTask,
            status: 'failed' as const,
            completed_at: new Date().toISOString(),
            error_message: agentErr instanceof Error ? agentErr.message : 'Unknown error'
          } as BrowserTask;

          // Update local state immediately
          setTasks(prev => prev.map(t => t.id === insertedTask.id ? failedTask : t));
          setSelectedTask(failedTask);

          // Update task as failed
          await supabase
            .from('browser_tasks')
            .update({
              status: 'failed',
              completed_at: failedTask.completed_at,
              error_message: failedTask.error_message
            })
            .eq('id', insertedTask.id);
        }
      }

      setTaskText('');
    } catch (err) {
      console.error('Error sending task:', err);
    } finally {
      setSending(false);
    }
  };

  // Force cleanup stuck task
  const handleForceCleanup = async () => {
    const port = getContainerPort();
    if (!port) {
      alert('No container port available');
      return;
    }

    try {
      const response = await fetch(`http://173.249.22.2:${port}/agent/force-cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchTasks();
      } else {
        alert('Failed to clear task: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Force cleanup failed:', error);
      alert('Force cleanup failed - container may be unavailable');
    }
  };

  // Delete task with optimistic update
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update: remove from UI immediately
    const previousTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== taskId));

    // Clear selected task if it was deleted
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    try {
      const { error } = await supabase
        .from('browser_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        // Rollback on error
        setTasks(previousTasks);
        throw error;
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Toggle response expansion for a task in the list
  const toggleResponseExpanded = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card selection
    setExpandedResponses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <IconComponent icon={FaDesktop} style={{ color: '#8b5cf6' }} />
          Computer
        </PageTitle>
        <PageDescription>
          AI Computer Use - Claude controls your computer to complete tasks automatically.
        </PageDescription>
      </PageHeader>

      <MainGrid>
        <BrowserViewSection>
          {/* Browser Frame */}
          <BrowserFrame ref={browserFrameRef} isExpanded={isExpanded}>
            <BrowserToolbar>
              <ToolbarDots>
                <Dot color="#ff5f57" />
                <Dot color="#febc2e" />
                <Dot color="#28c840" />
              </ToolbarDots>
              <UrlBar>
                <IconComponent icon={FaGlobe} />
                {currentUrl || 'Ready - send a task to begin'}
              </UrlBar>
              <ConnectionStatus status={connectionStatus}>
                <StatusDot status={connectionStatus} />
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </ConnectionStatus>
              <ToolbarButton onClick={captureScreenshot} title="Capture screenshot">
                <IconComponent icon={FaCamera} />
              </ToolbarButton>
              <ToolbarButton onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                <IconComponent icon={isFullscreen ? FaCompress : FaExpand} />
              </ToolbarButton>
            </BrowserToolbar>
            <BrowserContent>
              {/* Show VNC iframe when enabled - port calculated from projectId (16000 + id) */}
              {connectionStatus === 'connected' && vncEnabled && currentProject?.id ? (
                <VNCWrapper>
                  <VNCFrame
                    ref={vncIframeRef}
                    src={getVncFullUrl() || ''}
                    title="VNC Browser View"
                    tabIndex={0}
                    sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups"
                    allow="clipboard-read; clipboard-write; fullscreen; pointer-lock; keyboard-map"
                    allowFullScreen
                  />
                </VNCWrapper>
              ) : connectionStatus === 'connected' && screenshot ? (
                <BrowserScreenshot src={screenshot} alt="Browser view" />
              ) : connectionStatus === 'connecting' ? (
                <PlaceholderContent>
                  <Spinner size="xl" />
                  <p style={{ marginTop: '16px' }}>Starting computer...</p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>This may take a few seconds</p>
                </PlaceholderContent>
              ) : connectionStatus === 'disconnected' ? (
                <PlaceholderContent>
                  <IconComponent icon={FaDesktop} />
                  <p>Computer not connected</p>
                  <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                    Start the computer to view and interact with it
                  </p>
                  <ControlButton
                    variant="primary"
                    onClick={createContainer}
                    disabled={containerLoading}
                    style={{ margin: '0 auto' }}
                  >
                    {containerLoading ? <Spinner size="sm" /> : <IconComponent icon={FaPlay} />}
                    Start Computer
                  </ControlButton>
                </PlaceholderContent>
              ) : (
                <PlaceholderContent>
                  <IconComponent icon={FaRobot} />
                  <p>Ready to browse</p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>Send a task to get started</p>
                </PlaceholderContent>
              )}
            </BrowserContent>
            {/* Controls bar when connected */}
            {connectionStatus === 'connected' && (
              <ControlsBar>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {vncEnabled && (
                    <span style={{ fontSize: '12px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconComponent icon={FaEye} />
                      Interactive Mode
                    </span>
                  )}
                  {vncLoading && <Spinner size="sm" />}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <ControlButton
                    variant="danger"
                    onClick={stopContainer}
                    disabled={containerLoading}
                  >
                    {containerLoading ? <Spinner size="sm" /> : <IconComponent icon={FaStop} />}
                    Stop Computer
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
              placeholder="Describe what you want the computer to do...&#10;&#10;Examples:&#10;- Go to youtube.com and search for 'AI news'&#10;- Collect the titles of the first 5 videos&#10;- Login to my account and check notifications"
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
                {sending ? <Spinner size="sm" /> : <IconComponent icon={FaPaperPlane} />}
                {sending ? 'Sending...' : 'Send Task'}
              </SendButton>

              {/* Button to clear stuck tasks */}
              {tasks.some(t => t.status === 'running') && (
                <SendButton
                  onClick={handleForceCleanup}
                  style={{
                    backgroundColor: '#dc3545',
                    marginLeft: '8px'
                  }}
                  title="Clear stuck task that has been running too long"
                >
                  <IconComponent icon={FaTimes} />
                  Clear Stuck
                </SendButton>
              )}
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

          {/* Task Detail Panel - shows when a task is selected */}
          {selectedTask && (selectedTask.response || selectedTask.status === 'running') && (
            <Card style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <StatusBadge status={selectedTask.status}>
                  {getStatusIcon(selectedTask.status)}
                  {selectedTask.status}
                </StatusBadge>
                <button
                  onClick={() => setSelectedTask(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.name === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '2px 6px'
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{
                fontSize: '13px',
                color: theme.name === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                {selectedTask.task}
              </p>

              {/* Progress indicator for running tasks */}
              {selectedTask.status === 'running' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  border: `1px solid ${theme.name === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'}`
                }}>
                  <Spinner />
                  <div>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#8b5cf6',
                      marginBottom: '4px'
                    }}>
                      Processando tarefa...
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: theme.name === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
                    }}>
                      {selectedTask.started_at
                        ? `Iniciado ${formatTimeAgo(selectedTask.started_at)}`
                        : 'Aguardando início...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Response section - only show when there's a response */}
              {selectedTask.response && (
              <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isResponseExpanded ? '8px' : '0'
              }}>
                <div
                  onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: theme.colors.primary,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                  <IconComponent icon={FaRobot} />
                  Agent Response
                  <IconComponent
                    icon={isResponseExpanded ? FaChevronUp : FaChevronDown}
                    style={{ fontSize: '12px', opacity: 0.7 }}
                  />
                </div>
                {selectedTask.response?.result && (
                  <CopyButton
                    onClick={() => {
                      const text = typeof selectedTask.response?.result === 'string'
                        ? selectedTask.response.result
                        : JSON.stringify(selectedTask.response, null, 2);
                      navigator.clipboard.writeText(text);
                    }}
                  >
                    <IconComponent icon={FaCopy} style={{ fontSize: '11px' }} />
                    Copiar
                  </CopyButton>
                )}
              </div>

              {isResponseExpanded && (
                <div style={{
                  background: theme.name === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.name === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'}`,
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  <MarkdownContent>
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={theme.name === 'dark' ? vscDarkPlus : vs}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {typeof selectedTask.response?.result === 'string'
                        ? selectedTask.response.result
                        : JSON.stringify(selectedTask.response, null, 2)}
                    </ReactMarkdown>
                  </MarkdownContent>
                </div>
              )}

              {(selectedTask.iterations_used || selectedTask.actions_taken) && (
                <div style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: theme.name === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  gap: '12px'
                }}>
                  {selectedTask.iterations_used && (
                    <span>Iterations: {selectedTask.iterations_used}</span>
                  )}
                  {selectedTask.actions_taken && (
                    <span>Actions: {selectedTask.actions_taken.length}</span>
                  )}
                </div>
              )}
              </>
              )}
            </Card>
          )}

          <TasksList>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="md" />
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
                        {/* Don't show spinner in list when task is selected (detail panel already shows it) */}
                        {selectedTask?.id === task.id && task.status === 'running'
                          ? <IconComponent icon={FaClock} style={{ color: '#8b5cf6' }} />
                          : getStatusIcon(task.status)}
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

                    {/* Collapsible response preview for completed tasks */}
                    {task.status === 'completed' && task.response?.result && (
                      <ResponsePreview
                        onClick={(e) => toggleResponseExpanded(task.id, e)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            {expandedResponses.has(task.id)
                              ? (typeof task.response.result === 'string'
                                  ? task.response.result
                                  : JSON.stringify(task.response.result, null, 2))
                              : (typeof task.response.result === 'string'
                                  ? task.response.result.substring(0, 100) + (task.response.result.length > 100 ? '...' : '')
                                  : JSON.stringify(task.response.result).substring(0, 100) + '...')}
                          </div>
                          <IconComponent
                            icon={expandedResponses.has(task.id) ? FaChevronUp : FaChevronDown}
                            style={{ fontSize: '10px', opacity: 0.6, flexShrink: 0 }}
                          />
                        </div>
                      </ResponsePreview>
                    )}

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


