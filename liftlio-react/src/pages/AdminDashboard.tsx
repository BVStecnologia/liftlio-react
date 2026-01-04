import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, useTheme } from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BlogAdmin from '../components/admin/BlogAdmin';
import { parseUTCTimestamp, isToday, formatDate as formatDateUtil } from '../utils/dateUtils';

// ==========================================
// VNC PROXY HELPERS (avoid Mixed Content on HTTPS)
// ==========================================
const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';
const VPS_IP = '173.249.22.2';

// Extract port from VNC URL (e.g., "173.249.22.2:16117" -> 16117)
const extractVncPort = (vncUrl: string | null): number | null => {
  if (!vncUrl) return null;
  const match = vncUrl.match(/:([0-9]+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Get VNC iframe URL (uses nginx proxy in production to avoid Mixed Content)
const getAdminVncUrl = (vncUrl: string | null): string | null => {
  if (!vncUrl) return null;

  const port = extractVncPort(vncUrl);
  if (!port) return null;

  // Build params for noVNC WebSocket connection
  const params = new URLSearchParams({
    autoconnect: 'true',
    resize: 'scale',
    reconnect: 'true',
    reconnect_delay: '1000',
    view_only: 'false',
    _cb: String(Date.now())
  });

  if (IS_HTTPS) {
    // Production: Use nginx proxy for VNC WebSocket
    // noVNC connects via wss://liftlio.com:443/vnc-proxy/{port}/websockify
    params.set('host', window.location.hostname);
    params.set('port', '443');
    params.set('path', `vnc-proxy/${port}/websockify`);
    params.set('encrypt', 'true');
    return `/vnc-proxy/${port}/vnc.html?${params.toString()}`;
  } else {
    // Localhost: Direct connection
    params.set('host', VPS_IP);
    params.set('port', String(port));
    params.set('path', 'websockify');
    params.set('encrypt', 'false');
    return `http://${VPS_IP}:${port}/vnc.html?${params.toString()}`;
  }
};

// ==========================================
// TYPES
// ==========================================

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  projects_count: number;
  avatar_url?: string | null;
  full_name?: string | null;
}

interface Project {
  id: number;
  name: string;
  user_id: string;
  user_email?: string;
  status: number;
  created_at: string;
}

interface FullProject {
  id: number;
  created_at: string;
  'Project name': string;
  'Youtube Active': boolean;
  'User id': string;
  user: string;
  status: string;
  Keywords: string | null;
  'Negative keywords': string | null;
  'description service': string | null;
  'url service': string | null;
  'País': string | null;
  menções: number | null;
  Search: number | null;
  Integrações: number | null;
  integracao_valida: boolean | null;
  qtdmonitoramento: number | null;
  projetc_index: boolean;
  coment_automatical: string | null;
  prompt_user: string | null;
  fuso_horario: string | null;
  rag_processed: boolean | null;
  rag_processed_at: string | null;
  browser_mcp_url: string | null;
  browser_vnc_url: string | null;
  browser_session_status: string | null;
}

interface Subscription {
  id: string;
  customer_id: string;
  user_email?: string;
  plan_name: string;
  base_amount: number;
  status: string;
  next_billing_date: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  subscription_id: string;
  user_email?: string;
  square_payment_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}

interface BrowserContainer {
  id: number;
  project_id: number;
  project_name?: string;
  container_name: string;
  mcp_url: string;
  vnc_url: string;
  status: string;
  started_at: string | null;
  last_url: string | null;
}

interface BrowserTask {
  id: string;
  project_id: number;
  task: string;
  task_type: string | null;
  status: string;
  priority: number | null;
  response: Record<string, unknown> | null;
  error_message: string | null;
  iterations_used: number | null;
  actions_taken: Array<Record<string, unknown>> | null;
  started_at: string | null;
  completed_at: string | null;
  container_port: number | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  behavior_used: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  deleted_at: string | null;
}

interface BrowserLogin {
  id: number;
  projeto_id: number;
  platform_name: string | null;
  login_email: string | null;
  login_password: string | null;
  uses_google_sso: boolean;
  is_connected: boolean;
  is_active: boolean;
  has_2fa: boolean;
  twofa_type: string | null;
  timezone: string | null;
  locale: string | null;
  last_verified_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface BrowserPrompt {
  id: number;
  project_id: number;
  platform: string;
  login_prompt: string;
  check_logged_prompt: string;
  twofa_prompt: string | null;
  logout_prompt: string | null;
  comment_prompt: string | null;
}

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_failed' | '2fa_pending' | 'new_user' | 'login_success';
  title: string;
  description: string;
  timestamp: string;
  context?: string;
}

type ViewType = 'overview' | 'users' | 'projects' | 'subscriptions' | 'payments' | 'containers' | 'tasks' | 'logins' | 'health' | 'settings' | 'user-detail' | 'project-detail' | 'waitlist' | 'analytics' | 'simulations' | 'blog';

interface SimulationEntry {
  id: number;
  created_at: string;
  ip_address: string;
  url_analyzed: string | null;
  request_timestamp: string;
  simulation_video: {
    title?: string;
    channel?: string;
    views?: number;
    comments?: number;
    category?: string;
  } | null;
  simulation_comment: {
    author?: string;
    text?: string;
    lead_score?: number;
    sentiment?: string;
  } | null;
  simulation_response: {
    message?: string;
    sentiment_score?: number;
    relevance_score?: number;
  } | null;
  simulation_language: string | null;
  product_info: {
    name?: string;
    topic?: string;
    category?: string;
    benefits?: string[];
  } | null;
}

interface WaitlistEntry {
  id: number;
  name: string;
  email: string;
  website_url: string | null;
  discovery_source: string | null;
  status: 'pending' | 'approved' | 'rejected';
  position_in_queue: number;
  created_at: string;
  updated_at: string;
  notes: string | null;
  invitation_sent_at: string | null;
}

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimated_end: string | null;
}

interface BrowserPlatform {
  id: number;
  platform_name: string;
  display_name: string;
  login_url: string;
  success_url_pattern: string | null;
  login_prompt: string;
  check_logged_prompt: string | null;
  twofa_phone_prompt: string | null;
  twofa_code_prompt: string | null;
  logout_prompt: string | null;
  comment_prompt: string | null;
  reply_prompt: string | null;
  icon_name: string | null;
  brand_color: string | null;
  supports_google_sso: boolean;
  requires_2fa: boolean;
  session_duration_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Alias for backward compatibility
type PlatformPrompt = BrowserPlatform;

// ==========================================
// STYLED COMPONENTS
// ==========================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
`;

const Sidebar = styled.aside`
  width: 240px;
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#ffffff'};
  border-right: 1px solid ${props => props.theme.colors.border.primary};
  padding: 20px 0;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
`;

const Logo = styled.div`
  padding: 0 20px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  margin-bottom: 20px;

  h1 {
    font-size: 20px;
    font-weight: 700;
    color: ${props => props.theme.colors.text.primary};
    margin: 0;

    span {
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-left: 8px;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      background-clip: text;
    }
  }
`;

const NavSection = styled.nav`
  margin-bottom: 24px;
`;

const NavLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 20px;
  margin-bottom: 8px;
`;

interface NavItemProps {
  $active?: boolean;
}

const NavItem = styled.button<NavItemProps>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: ${props => props.$active ? 'rgba(139, 92, 246, 0.1)' : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.$active ? '#8b5cf6' : 'transparent'};
  color: ${props => props.$active ? '#8b5cf6' : props.theme.colors.text.secondary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.05);
    color: #8b5cf6;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
  }
`;

const Badge = styled.span`
  margin-left: auto;
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
`;

const Main = styled.main`
  flex: 1;
  margin-left: 240px;
  padding: 0;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#ffffff'};
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const SearchContainer = styled.div`
  position: relative;
  width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 44px;
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.text.muted};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SearchDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
`;

const SearchSection = styled.div`
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.muted};
  text-transform: uppercase;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const SearchResult = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: ${props => props.theme.colors.text.primary};

  &:hover {
    background: rgba(139, 92, 246, 0.05);
  }
`;

const SearchAvatar = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: ${props => props.$color || '#8b5cf6'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const SearchInfo = styled.div`
  flex: 1;

  .title {
    font-size: 14px;
    font-weight: 500;
    color: ${props => props.theme.colors.text.primary};
  }

  .subtitle {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
  }
`;

const LiveBadge = styled.span`
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 4px;
`;

const Content = styled.div`
  padding: 32px;
  animation: ${fadeIn} 0.3s ease;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    color: ${props => props.theme.colors.text.muted};
    margin: 0;
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  padding: 20px;

  .label {
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .value {
    font-size: 32px;
    font-weight: 700;
    color: ${props => props.theme.colors.text.primary};
    margin-bottom: 4px;

    &.green { color: #10b981; }
    &.purple { color: #8b5cf6; }
    &.red { color: #ef4444; }
  }

  .change {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  padding: 16px 24px;
  text-align: center;
  flex: 1;
  min-width: 120px;

  .value {
    font-size: 24px;
    font-weight: 700;
    color: ${props => props.theme.colors.text.primary};
  }

  .label {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
    margin-top: 4px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0;
  }
`;

const ViewAllButton = styled.button`
  background: transparent;
  border: none;
  color: #8b5cf6;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px 20px;
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
    background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  }

  td {
    padding: 12px 20px;
    font-size: 14px;
    border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  }

  tr:hover {
    background: rgba(139, 92, 246, 0.02);
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${props => props.$color || '#8b5cf6'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  ${props => {
    switch (props.$status) {
      case 'active':
      case 'completed':
      case 'running':
      case 'logged_in':
        return `
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        `;
      case 'offline':
      case 'expired':
        return `
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        `;
      case 'inactive':
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        `;
      case 'pending':
      case 'processing':
        return `
          background: rgba(251, 191, 36, 0.1);
          color: #f59e0b;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        `;
    }
  }}

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`;


// Action Menu (3 dots)
const ActionMenuWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const ActionMenuButton = styled.button`
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: ${props => props.theme.colors.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActionMenuDropdown = styled.div<{ $open: boolean; $openUp?: boolean }>`
  position: absolute;
  ${props => props.$openUp ? 'bottom: 100%;' : 'top: 100%;'}
  right: 0;
  ${props => props.$openUp ? 'margin-bottom: 4px;' : 'margin-top: 4px;'}
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 1000;
  display: ${props => props.$open ? 'block' : 'none'};
  overflow: hidden;
`;

const ActionMenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  color: ${props => props.$danger ? '#ef4444' : props.theme.colors.text.primary};
  transition: all 0.15s;

  &:hover {
    background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.$danger ? '#ef4444' : props.theme.colors.text.muted};
  }
`;

const ActionMenuDivider = styled.div`
  height: 1px;
  background: ${props => props.theme.colors.border.primary};
  margin: 4px 0;
`;

// Project Detail Modal
const ProjectModalOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: ${props => props.$open ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ProjectModalContent = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ProjectModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const ProjectModalCloseButton = styled.button`
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: ${props => props.theme.colors.text.muted};
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ProjectModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const DetailSection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailSectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border-radius: 8px;
  padding: 12px;

  .label {
    font-size: 11px;
    color: ${props => props.theme.colors.text.muted};
    margin-bottom: 4px;
  }

  .value {
    font-size: 14px;
    color: ${props => props.theme.colors.text.primary};
    font-weight: 500;
    word-break: break-all;

    &.green { color: #10b981; }
    &.red { color: #ef4444; }
    &.yellow { color: #f59e0b; }
    &.purple { color: #8b5cf6; }
  }
`;

const DetailItemFull = styled(DetailItem)`
  grid-column: 1 / -1;
`;

const DetailTextArea = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border-radius: 8px;
  padding: 14px;
  grid-column: 1 / -1;

  .label {
    font-size: 11px;
    color: ${props => props.theme.colors.text.muted};
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 600;
  }

  .value {
    font-size: 14px;
    color: ${props => props.theme.colors.text.primary};
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const DetailLink = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border-radius: 8px;
  padding: 14px;
  grid-column: 1 / -1;

  .label {
    font-size: 11px;
    color: ${props => props.theme.colors.text.muted};
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 600;
  }

  a {
    font-size: 14px;
    color: #8b5cf6;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
    word-break: break-all;

    &:hover {
      text-decoration: underline;
      color: #a78bfa;
    }

    svg {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
    }
  }

  .value {
    font-size: 14px;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const KeywordTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const KeywordTag = styled.span`
  background: ${props => props.theme.name === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
  color: #8b5cf6;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

const NegativeKeywordTag = styled(KeywordTag)`
  background: ${props => props.theme.name === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'};
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
`;

const BrowserSection = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border-radius: 8px;
  padding: 14px;
  grid-column: 1 / -1;

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    svg {
      width: 16px;
      height: 16px;
      color: #8b5cf6;
    }

    span {
      font-size: 12px;
      font-weight: 600;
      color: ${props => props.theme.colors.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
  }

  .browser-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .browser-item {
    background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#fff'};
    border-radius: 6px;
    padding: 10px 12px;
    border: 1px solid ${props => props.theme.colors.border.primary};

    .label {
      font-size: 10px;
      color: ${props => props.theme.colors.text.muted};
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }

    .value {
      font-size: 13px;
      color: ${props => props.theme.colors.text.primary};
      word-break: break-all;

      &.green { color: #10b981; }
      &.yellow { color: #f59e0b; }
      &.red { color: #ef4444; }
    }
  }
`;

const ActivityList = styled.div`
  padding: 8px 0;
`;

const ActivityItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 20px;

  &:hover {
    background: rgba(139, 92, 246, 0.02);
  }
`;

const ActivityIcon = styled.div<{ $type: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${props => {
    switch (props.$type) {
      case 'task_completed':
      case 'login_success':
        return `background: rgba(16, 185, 129, 0.1); color: #10b981;`;
      case 'task_failed':
        return `background: rgba(239, 68, 68, 0.1); color: #ef4444;`;
      case '2fa_pending':
        return `background: rgba(251, 191, 36, 0.1); color: #f59e0b;`;
      case 'new_user':
        return `background: rgba(139, 92, 246, 0.1); color: #8b5cf6;`;
      default:
        return `background: rgba(107, 114, 128, 0.1); color: #6b7280;`;
    }
  }}

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ActivityContent = styled.div`
  flex: 1;

  .title {
    font-size: 14px;
    color: ${props => props.theme.colors.text.primary};

    strong {
      font-weight: 600;
    }
  }

  .meta {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
    margin-top: 2px;
  }
`;

const HealthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const HealthCard = styled.div<{ $status: 'ok' | 'warning' | 'error' | 'checking' | 'unknown' }>`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;

  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      switch (props.$status) {
        case 'ok': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        case 'checking': return '#6b7280';
        case 'unknown': return '#9ca3af';
        default: return '#6b7280';
      }
    }};
  }

  .info {
    flex: 1;

    .name {
      font-size: 14px;
      font-weight: 500;
      color: ${props => props.theme.colors.text.primary};
    }

    .detail {
      font-size: 12px;
      color: ${props => props.theme.colors.text.muted};
    }
  }
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;

  a {
    color: #8b5cf6;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  span {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  .left {
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: ${props => props.theme.colors.text.primary};
      margin: 0;
    }

    p {
      font-size: 13px;
      color: ${props => props.theme.colors.text.muted};
      margin: 4px 0 0;
    }
  }

  .actions {
    display: flex;
    gap: 8px;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          &:hover { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
        `;
      case 'danger':
        return `
          background: transparent;
          color: #ef4444;
          border: 1px solid #ef4444;
          &:hover { background: rgba(239, 68, 68, 0.1); }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${props.theme.colors.text.secondary};
          border: 1px solid ${props.theme.colors.border.primary};
          &:hover { background: rgba(139, 92, 246, 0.05); }
        `;
      default:
        return `
          background: transparent;
          color: ${props.theme.colors.text.primary};
          border: 1px solid ${props.theme.colors.border.primary};
          &:hover { background: rgba(139, 92, 246, 0.05); }
        `;
    }
  }}
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#8b5cf6' : 'transparent'};
  color: ${props => props.$active ? '#8b5cf6' : props.theme.colors.text.muted};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #8b5cf6;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  padding: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  .label {
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .value {
    font-size: 14px;
    color: ${props => props.theme.colors.text.primary};

    a {
      color: #8b5cf6;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0;
  }

  button {
    background: transparent;
    border: none;
    color: ${props => props.theme.colors.text.muted};
    cursor: pointer;
    font-size: 20px;

    &:hover {
      color: ${props => props.theme.colors.text.primary};
    }
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  input, textarea {
    width: 100%;
    padding: 10px 12px;
    background: ${props => props.theme.colors.bg.secondary};
    border: 1px solid ${props => props.theme.colors.border.primary};
    border-radius: 6px;
    color: ${props => props.theme.colors.text.primary};
    font-size: 14px;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #8b5cf6;
    }
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const PromptEditor = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  overflow: hidden;
`;

const PromptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;

  &:hover {
    background: rgba(139, 92, 246, 0.02);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const PromptContent = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const SettingsSection = styled.div`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
`;

const SettingsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  p {
    font-size: 13px;
    color: ${props => props.theme.colors.text.muted};
    margin: 4px 0 0 0;
  }
`;

const SettingsBody = styled.div`
  padding: 20px;
`;

const Toggle = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border.primary};
    transition: 0.3s;
    border-radius: 28px;

    &:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }

  input:checked + span:before {
    transform: translateX(24px);
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};

  &:last-child {
    border-bottom: none;
  }

  .info {
    .label {
      font-size: 14px;
      font-weight: 500;
      color: ${props => props.theme.colors.text.primary};
    }

    .description {
      font-size: 12px;
      color: ${props => props.theme.colors.text.muted};
      margin-top: 2px;
    }
  }
`;

const PromptCard = styled.div<{ $expanded?: boolean }>`
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PromptCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;

  &:hover {
    background: rgba(139, 92, 246, 0.03);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .platform-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .name {
    font-size: 15px;
    font-weight: 500;
    color: ${props => props.theme.colors.text.primary};
  }

  .meta {
    font-size: 12px;
    color: ${props => props.theme.colors.text.muted};
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.theme.colors.text.muted};
    transition: transform 0.2s;
  }
`;

const PromptCardBody = styled.div`
  padding: 0 16px 16px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const PromptField = styled.div`
  margin-top: 16px;

  label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.secondary : '#ffffff'};
    border: 1px solid ${props => props.theme.colors.border.primary};
    border-radius: 6px;
    color: ${props => props.theme.colors.text.primary};
    font-size: 13px;
    font-family: 'Monaco', 'Menlo', monospace;
    line-height: 1.5;
    min-height: 120px;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }
  }
`;

const SaveBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: ${props => props.theme.name === 'dark' ? props.theme.colors.bg.primary : '#f8f9fa'};
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const MaintenanceAlert = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.$active ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
  border: 1px solid ${props => props.$active ? '#f59e0b' : '#10b981'};
  border-radius: 8px;
  margin-bottom: 16px;

  svg {
    width: 20px;
    height: 20px;
    color: ${props => props.$active ? '#f59e0b' : '#10b981'};
  }

  span {
    font-size: 13px;
    color: ${props => props.$active ? '#f59e0b' : '#10b981'};
    font-weight: 500;
  }
`;

// ==========================================
// SVG ICONS
// ==========================================

const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Folder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  CreditCard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Box: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Key: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

// ==========================================
// ADMIN DASHBOARD COMPONENT
// ==========================================

// Admin emails with access to this dashboard
const ADMIN_EMAILS = ['valdair3d@gmail.com'];

const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();

  // URL State - navegação persistente via URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') as ViewType) || 'overview';
  const selectedUserIdFromUrl = searchParams.get('userId');
  const selectedProjectIdFromUrl = searchParams.get('projectId');

  const setCurrentView = useCallback((view: ViewType, params?: { userId?: string; projectId?: string }) => {
    const newParams: Record<string, string> = { view };
    if (params?.userId) newParams.userId = params.userId;
    if (params?.projectId) newParams.projectId = params.projectId;
    setSearchParams(newParams);
  }, [setSearchParams]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState<'browser' | 'logins' | 'prompts' | 'tasks'>('browser');
  const [editModal, setEditModal] = useState<{ type: string; data: any } | null>(null);
  const [loginModal, setLoginModal] = useState<{ mode: 'create' | 'edit'; data?: BrowserLogin } | null>(null);
  const [platformModal, setPlatformModal] = useState<{ mode: 'create' | 'edit'; data?: BrowserPlatform } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [containers, setContainers] = useState<BrowserContainer[]>([]);
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [logins, setLogins] = useState<BrowserLogin[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [prompts, setPrompts] = useState<BrowserPrompt[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{timestamp: string; views: number}[]>([]);
  const [simulations, setSimulations] = useState<SimulationEntry[]>([]);
  const [simulationsDisplayCount, setSimulationsDisplayCount] = useState(25);
  const [expandedSimulationId, setExpandedSimulationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({
    enabled: false,
    message: 'We are currently performing scheduled maintenance. Please check back soon.',
    estimated_end: null
  });
  const [platformPrompts, setPlatformPrompts] = useState<PlatformPrompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<PlatformPrompt | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<number[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  // Task filters and pagination
  const [tasksFilterProject, setTasksFilterProject] = useState<number | null>(null);
  const [tasksFilterUser, setTasksFilterUser] = useState<string | null>(null);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksRowsPerPage, setTasksRowsPerPage] = useState(20);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [uniqueProjectIds, setUniqueProjectIds] = useState<number[]>([]);
  const [uniqueTaskUsers, setUniqueTaskUsers] = useState<string[]>([]);

  // Admin Browser Viewer state
  const [selectedViewerContainer, setSelectedViewerContainer] = useState<BrowserContainer | null>(null);
  const [adminTaskInput, setAdminTaskInput] = useState('');
  const [adminTaskSending, setAdminTaskSending] = useState(false);
  const [isTaskInputFocused, setIsTaskInputFocused] = useState(false);
  const [viewerProjectTasks, setViewerProjectTasks] = useState<BrowserTask[]>([]);
  const [loadingViewerTasks, setLoadingViewerTasks] = useState(false);

  // Project action menu state
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [projectDetailModal, setProjectDetailModal] = useState<FullProject | null>(null);
  const [loadingProjectDetail, setLoadingProjectDetail] = useState(false);

  // Admin users state
  const [adminEmails, setAdminEmails] = useState<string[]>(['valdair3d@gmail.com']);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Primary owner - cannot be removed
  const PRIMARY_OWNER = 'valdair3d@gmail.com';

  // Check admin access - use adminEmails state (loaded from DB) or fallback to ADMIN_EMAILS
  const isAdmin = user?.email && (adminEmails.includes(user.email) || ADMIN_EMAILS.includes(user.email));

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    mrr: 0,
    taskSuccessRate: 0,
    visitsToday: 0,
    visitsWeek: 0,
    visitsMonth: 0,
    waitlistCount: 0,
    simulationsCount: 0,
    simulationsToday: 0,
    activeContainers: 0,
    topCountries: [] as {country: string; visits: number}[],
    topCities: [] as {city: string; country: string; visits: number}[],
  });


  
  // Fetch online visitors every 5 seconds
  useEffect(() => {
    const fetchOnlineVisitors = async () => {
      try {
        const { data, error } = await supabase.rpc('get_online_visitors');
        if (!error && data) {
          setOnlineVisitors(data);
        }
      } catch (err) {
        console.debug('[AdminDashboard] Online visitors fetch error:', err);
      }
    };

    fetchOnlineVisitors();
    const interval = setInterval(fetchOnlineVisitors, 5000);
    return () => clearInterval(interval);
  }, []);

  // Health check state
  const [healthStatus, setHealthStatus] = useState<{
    supabaseDb: 'ok' | 'error' | 'checking';
    supabaseAuth: 'ok' | 'error' | 'checking';
    flyioFrontend: 'ok';
    vpsBrowser: 'ok' | 'error' | 'checking' | 'unknown';
    dockerContainers: 'ok' | 'warning' | 'error' | 'checking' | 'unknown' | 'checking';
    analyticsServer: 'ok' | 'error' | 'checking' | 'unknown';
    edgeFunctions: 'ok' | 'error' | 'checking';
    orchestrator: 'ok' | 'error' | 'checking' | 'unknown';
    videoQualifier: 'ok' | 'error' | 'checking' | 'unknown';
    transcricao: 'ok' | 'error' | 'checking' | 'unknown';
    youtubeSearch: 'ok' | 'error' | 'checking' | 'unknown';
    mcpGmail: 'ok' | 'error' | 'checking' | 'unknown';
    tokenRefresher: 'ok' | 'error' | 'checking' | 'unknown';
    claudeApi: 'ok' | 'error' | 'checking' | 'unknown';
    lastCheck: Date | null;
  }>({
    supabaseDb: 'checking',
    supabaseAuth: 'checking',
    flyioFrontend: 'ok',
    vpsBrowser: 'checking',
    dockerContainers: 'checking',
    analyticsServer: 'checking',
    edgeFunctions: 'checking',
    orchestrator: 'checking',
    videoQualifier: 'checking',
    transcricao: 'checking',
    youtubeSearch: 'checking',
    mcpGmail: 'checking',
    tokenRefresher: 'checking',
    claudeApi: 'checking',
    lastCheck: null,
  });

  // Health alerts state
  interface HealthAlert {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    service: string;
    title: string;
    message: string;
    timestamp: string;
    actionRequired?: string;
  }
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);

  // Error logs state
  interface ErrorLog {
    id: string;
    timestamp: string;
    service: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    metadata?: Record<string, unknown>;
  }
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorLogsExpanded, setErrorLogsExpanded] = useState(false);
  const [errorLogsCopied, setErrorLogsCopied] = useState(false);
  // Online visitors state (real-time)
  interface OnlineVisitor {
    visitor_id: string;
    current_page: string;
    country: string;
    city: string;
    device_type: string;
    browser: string;
    user_email: string | null;
    seconds_ago: number;
  }
  const [onlineVisitors, setOnlineVisitors] = useState<OnlineVisitor[]>([]);



  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch ALL users from auth.users via RPC function
        const { data: usersData } = await supabase
          .rpc('get_all_users') as { data: { id: string; email: string; created_at: string; last_sign_in_at: string | null; avatar_url: string | null; full_name: string | null }[] | null };

        // Fetch projects (table name is "Projeto" in Portuguese)
        const { data: projectsData } = await supabase
          .from('Projeto')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch subscriptions
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch projects with browser containers (container info is in Projeto table)
        const { data: containersData } = await supabase
          .from('Projeto')
          .select('id, "Project name", browser_container_id, browser_mcp_url, browser_vnc_url, browser_session_status')
          .not('browser_container_id', 'is', null);

        // Fetch browser tasks - initial load with pagination
        const { data: tasksData, count: tasksCount } = await supabase
          .from('browser_tasks')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 19); // First 20 items

        // Fetch unique project IDs for filter dropdown
        const { data: projectIdsData } = await supabase
          .from('browser_tasks')
          .select('project_id')
          .order('project_id');
        const uniqueProjects = Array.from(new Set((projectIdsData || []).map(p => p.project_id)));

        // Fetch unique users (created_by) for filter dropdown
        const { data: taskUsersData } = await supabase
          .from('browser_tasks')
          .select('created_by')
          .not('created_by', 'is', null);
        const uniqueUsers = Array.from(new Set((taskUsersData || []).map(u => u.created_by).filter(Boolean))) as string[];

        // Fetch browser logins
        const { data: loginsData } = await supabase
          .from('browser_logins')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch waitlist
        const { data: waitlistData } = await supabase
          .from('waitlist')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch browser prompts/platforms
        const { data: promptsData } = await supabase
          .from('browser_platforms')
          .select('*');

        // Fetch system config (maintenance mode)
        const { data: configData } = await supabase
          .from('system_config')
          .select('*')
          .eq('key', 'maintenance_mode')
          .single();

        // Fetch admin emails config
        const { data: adminConfigData } = await supabase
          .from('system_config')
          .select('*')
          .eq('key', 'admin_emails')
          .single();

        // Fetch analytics stats - get last 30 days data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: analyticsRawData } = await supabase
          .from('admin_analytics')
          .select('created_at, event_type')
          .eq('event_type', 'pageview')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        // Group analytics data by day
        const analyticsGrouped: Record<string, number> = {};
        analyticsRawData?.forEach(item => {
          const date = new Date(item.created_at).toISOString().split('T')[0];
          analyticsGrouped[date] = (analyticsGrouped[date] || 0) + 1;
        });
        const analyticsTimeline = Object.entries(analyticsGrouped).map(([date, views]) => ({
          timestamp: date,
          views
        }));

        // Fetch YouTube channels (table name in Portuguese)
        const { data: channelsData } = await supabase
          .from('Canais do youtube')
          .select('id');

        // Fetch videos (table name in Portuguese)
        const { data: videosData } = await supabase
          .from('Videos')
          .select('id');

        // Fetch comments (table name in Portuguese)
        const { data: commentsData } = await supabase
          .from('Comentarios_Principais')
          .select('id');

        // Fetch visit metrics from admin_analytics
        const { data: visitsData } = await supabase.rpc('get_admin_visit_stats');
// Fetch location stats (countries and cities)
        const { data: locationData } = await supabase.rpc('get_admin_location_stats');

        // Fetch URL analysis data from landing page
        const { data: simulationsData } = await supabase
          .from('url_analyzer_rate_limit')
          .select('id, created_at, ip_address, url_analyzed, request_timestamp, simulation_video, simulation_comment, simulation_response, simulation_language, product_info')
          .order('created_at', { ascending: false })
          .limit(100);

        // Filter today's simulations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const simulationsToday = simulationsData?.filter(s =>
          new Date(s.created_at) >= today
        ).length || 0;

        // Calculate stats
        const totalUsers = usersData?.length || 0;
        // Projects with YouTube Active are considered "active"
        const activeProjects = projectsData?.filter(p => p['Youtube Active'] === true).length || 0;
        const activeSubscriptions = subsData?.filter(s => s.status === 'active') || [];
        // base_amount is in cents, divide by 100 for dollars
        const mrr = activeSubscriptions.reduce((sum, s) => sum + (s.base_amount || 0), 0) / 100;
        const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
        const totalTasks = tasksData?.length || 0;
        const taskSuccessRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const runningContainers = containersData?.filter(c => c.browser_session_status === 'running').length || 0;

        // Map auth.users with project count (Projeto uses "User id" field which matches auth.users.id)
        const usersWithCount = (usersData || []).map(u => ({
          ...u,
          // auth.users already has last_sign_in_at
          projects_count: projectsData?.filter(p => p['User id'] === u.id).length || 0
        }));

        // Map projects with user email (Projeto uses "Project name" and "User id")
        const projectsWithEmail = (projectsData || []).map(p => {
          const projectUser = usersData?.find(u => u.id === p['User id']);
          return {
            id: p.id,
            name: p['Project name'] || 'Unnamed Project',
            user_id: p['User id'],
            user_email: projectUser?.email || 'Unknown',
            status: p['Youtube Active'] ? 1 : 0,
            created_at: p.created_at
          };
        });

        // Build activity from recent tasks and events
        const recentActivity: ActivityItem[] = [];

        // Add recent tasks
        tasksData?.slice(0, 5).forEach(task => {
          recentActivity.push({
            id: `task-${task.id}`,
            type: task.status === 'completed' ? 'task_completed' : 'task_failed',
            title: task.status === 'completed' ? 'Task completed' : 'Task failed',
            description: task.task?.substring(0, 50) + '...' || 'Unknown task',
            timestamp: task.created_at,
            context: `Project #${task.project_id}`
          });
        });

        // Add recent users
        usersData?.slice(0, 2).forEach(u => {
          recentActivity.push({
            id: `user-${u.id}`,
            type: 'new_user',
            title: 'New user',
            description: u.email,
            timestamp: u.created_at,
            context: 'Google OAuth'
          });
        });

        // Sort by timestamp
        recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setUsers(usersWithCount);
        setProjects(projectsWithEmail);
        setSubscriptions(subsData || []);
        setPayments(paymentsData || []);
        // Map containers from Projeto table to BrowserContainer interface
        const mappedContainers: BrowserContainer[] = (containersData || []).map(c => ({
          id: c.id,
          project_id: c.id,
          project_name: c['Project name'],
          container_name: c.browser_container_id || 'No container',
          mcp_url: c.browser_mcp_url || '',
          vnc_url: c.browser_vnc_url || '',
          status: c.browser_session_status || 'inactive',
          started_at: null,
          last_url: null
        }));
        setContainers(mappedContainers);
        setTasks(tasksData || []);
        setTasksTotal(tasksCount || 0);
        setUniqueProjectIds(uniqueProjects);
        setUniqueTaskUsers(uniqueUsers);
        setLogins(loginsData || []);
        setWaitlist(waitlistData || []);
        setPrompts(promptsData || []);
        setPlatformPrompts(promptsData || []);
        setActivity(recentActivity.slice(0, 5));
        setAnalyticsData(analyticsTimeline);
        setSimulations((simulationsData || []) as SimulationEntry[]);

        // Set maintenance config
        if (configData?.value) {
          setMaintenanceConfig(configData.value as MaintenanceConfig);
        }

        // Set admin emails
        if (adminConfigData?.value?.emails) {
          setAdminEmails(adminConfigData.value.emails);
        }

        // visitsData is an array from TABLE-returning function, get first element
        const visits = visitsData?.[0];
        setStats({
          totalUsers,
          activeProjects,
          mrr,
          taskSuccessRate,
          visitsToday: visits?.visits_today || 0,
          visitsWeek: visits?.visits_week || 0,
          visitsMonth: visits?.visits_month || 0,
          waitlistCount: waitlistData?.length || 0,
          simulationsCount: simulationsData?.length || 0,
          simulationsToday,
          activeContainers: runningContainers,
          topCountries: locationData?.[0]?.top_countries || [],
          topCities: locationData?.[0]?.top_cities || [],
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        // Minimum loading time of 1.5s for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Realtime subscription for browser_tasks
  useEffect(() => {
    const channel = supabase
      .channel('admin-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'browser_tasks'
        },
        (payload) => {
          console.log('[Realtime] Task change:', payload.eventType, payload.new);

          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as BrowserTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t =>
              t.id === (payload.new as BrowserTask).id ? payload.new as BrowserTask : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as BrowserTask).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch tasks with filters and pagination
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      let query = supabase
        .from('browser_tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (tasksFilterProject !== null) {
        query = query.eq('project_id', tasksFilterProject);
      }
      if (tasksFilterUser) {
        query = query.eq('created_by', tasksFilterUser);
      }

      // Apply pagination
      const from = (tasksPage - 1) * tasksRowsPerPage;
      const to = from + tasksRowsPerPage - 1;
      query = query.range(from, to);

      const { data, count } = await query;
      setTasks(data || []);
      setTasksTotal(count || 0);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  }, [tasksFilterProject, tasksFilterUser, tasksPage, tasksRowsPerPage]);

  // Refetch tasks when filters or pagination change
  useEffect(() => {
    // Skip initial load (handled by fetchData)
    if (loading) return;
    fetchTasks();
  }, [fetchTasks, loading]);

  // Admin Browser Viewer - fetch tasks for selected project
  const fetchViewerProjectTasks = useCallback(async (projectId: number) => {
    setLoadingViewerTasks(true);
    try {
      const { data } = await supabase
        .from('browser_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);
      setViewerProjectTasks(data || []);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    } finally {
      setLoadingViewerTasks(false);
    }
  }, []);

  // Admin Browser Viewer - select container to view
  const handleViewContainer = useCallback((container: BrowserContainer) => {
    setSelectedViewerContainer(container);
    setAdminTaskInput('');
    fetchViewerProjectTasks(container.project_id);
  }, [fetchViewerProjectTasks]);

  // Admin Browser Viewer - send task to agent
  const sendAdminTask = useCallback(async () => {
    if (!selectedViewerContainer || !adminTaskInput.trim()) return;

    setAdminTaskSending(true);
    try {
      // Get the MCP URL from the container
      const mcpUrl = selectedViewerContainer.mcp_url;
      if (!mcpUrl) {
        alert('Container does not have MCP URL configured');
        return;
      }

      // Create task in database first
      const { data: taskData, error: insertError } = await supabase
        .from('browser_tasks')
        .insert({
          project_id: selectedViewerContainer.project_id,
          task: adminTaskInput,
          task_type: 'admin',
          status: 'pending',
          created_by: user?.email || 'admin'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating task:', insertError);
        alert('Failed to create task');
        return;
      }

      // Send task to agent via Edge Function (to avoid CORS)
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('browser-proxy', {
        body: {
          action: 'send-task',
          projectId: selectedViewerContainer.project_id,
          task: adminTaskInput,
          taskId: taskData.id
        }
      });

      if (proxyError) {
        console.error('Error sending task to agent:', proxyError);
        // Update task status to failed
        await supabase
          .from('browser_tasks')
          .update({ status: 'failed', error_message: proxyError.message })
          .eq('id', taskData.id);
      } else {
        console.log('Task sent successfully:', proxyData);
      }

      // Clear input and refresh tasks
      setAdminTaskInput('');
      fetchViewerProjectTasks(selectedViewerContainer.project_id);
    } catch (error) {
      console.error('Error sending admin task:', error);
      alert('Failed to send task to agent');
    } finally {
      setAdminTaskSending(false);
    }
  }, [selectedViewerContainer, adminTaskInput, user?.email, fetchViewerProjectTasks]);

  // Health check function - uses Edge Function for VPS services (no CORS issues!)
  const checkHealth = useCallback(async () => {
    // 1. Supabase DB - simple query
    try {
      const { error } = await supabase.from('system_config').select('key').limit(1);
      setHealthStatus(prev => ({ ...prev, supabaseDb: error ? 'error' : 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, supabaseDb: 'error' }));
    }

    // 2. Supabase Auth - check if user exists
    setHealthStatus(prev => ({ ...prev, supabaseAuth: user ? 'ok' : 'error' }));

    // 3. Docker Containers - from stats
    setHealthStatus(prev => ({
      ...prev,
      dockerContainers: stats.activeContainers > 0 ? 'ok' : stats.activeContainers === 0 ? 'warning' : 'error'
    }));

    // 4-11. VPS Services - use Edge Function (server-to-server, no CORS!)
    try {
      const { data, error } = await supabase.functions.invoke('health-checker');

      if (error) {
        console.error('[Health Check] Edge Function error:', error);
        // Set all VPS services to unknown on error
        setHealthStatus(prev => ({
          ...prev,
          vpsBrowser: 'unknown',
          analyticsServer: 'unknown',
          orchestrator: 'unknown',
          videoQualifier: 'unknown',
          transcricao: 'unknown',
          youtubeSearch: 'unknown',
          mcpGmail: 'unknown',
          claudeApi: 'unknown',
          edgeFunctions: 'error',
        }));
      } else if (data?.status) {
        const status = data.status;
        console.log('[Health Check] VPS services status:', status);
        setHealthStatus(prev => ({
          ...prev,
          vpsBrowser: status.vpsBrowser || 'unknown',
          analyticsServer: status.analyticsServer || 'unknown',
          orchestrator: status.orchestrator || 'unknown',
          videoQualifier: status.videoQualifier || 'unknown',
          transcricao: status.transcricao || 'unknown',
          youtubeSearch: status.youtubeSearch || 'unknown',
          mcpGmail: status.mcpGmail || 'unknown',
          claudeApi: status.claudeApi || 'unknown',
          edgeFunctions: 'ok', // Edge Function worked!
        }));

        // Process alerts if any
        if (data.alerts && Array.isArray(data.alerts)) {
          console.log('[Health Check] Alerts received:', data.alerts);
          setHealthAlerts(data.alerts);
        } else {
          setHealthAlerts([]);
        }
      }
    } catch (err) {
      console.error('[Health Check] Exception calling Edge Function:', err);
      setHealthStatus(prev => ({
        ...prev,
        vpsBrowser: 'unknown',
        analyticsServer: 'unknown',
        orchestrator: 'unknown',
        videoQualifier: 'unknown',
        transcricao: 'unknown',
        youtubeSearch: 'unknown',
        mcpGmail: 'unknown',
        claudeApi: 'unknown',
        edgeFunctions: 'error',
      }));
    }

    // 12. Token Refresher (inferred from VPS Browser status)
    setHealthStatus(prev => ({
      ...prev,
      tokenRefresher: prev.vpsBrowser === 'ok' ? 'ok' : 'unknown',
      lastCheck: new Date()
    }));

    // 13. Fetch error logs
    try {
      const { data: errorData } = await supabase.functions.invoke('error-monitor');
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        setErrorLogs(errorData.errors);
      }
    } catch (err) {
      console.error('[Health Check] Error fetching error logs:', err);
    }
  }, [user, stats.activeContainers]);

  // Run health checks only on mount (no polling - user refreshes manually)
  useEffect(() => {
    setTimeout(checkHealth, 1500); // Delay to show loading spinner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = runs only once on mount

  // Restore selected user/project from URL params
  useEffect(() => {
    if (selectedUserIdFromUrl && currentView === 'user-detail' && !selectedUser) {
      const user = users.find(u => u.id === selectedUserIdFromUrl);
      if (user) setSelectedUser(user);
    }
    if (selectedProjectIdFromUrl && currentView === 'project-detail' && !selectedProject) {
      const project = projects.find(p => String(p.id) === selectedProjectIdFromUrl);
      if (project) setSelectedProject(project);
    }
  }, [selectedUserIdFromUrl, selectedProjectIdFromUrl, currentView, users, projects, selectedUser, selectedProject]);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery) return { users: [], projects: [] };

    const query = searchQuery.toLowerCase();
    return {
      users: users.filter(u => u.email.toLowerCase().includes(query)).slice(0, 3),
      projects: projects.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.user_email?.toLowerCase().includes(query)
      ).slice(0, 3),
    };
  }, [searchQuery, users, projects]);

  // Count tasks completed today using timezone-aware comparison
  const todayTasksCount = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return tasks.filter(t => {
      // Only count completed tasks, use completed_at for date
      if (t.status !== 'completed' || !t.completed_at) return false;
      const taskDate = parseUTCTimestamp(t.completed_at);
      if (!taskDate) return false;
      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      return taskDay.getTime() === today.getTime();
    }).length;
  }, [tasks]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format relative time - uses parseUTCTimestamp for correct timezone handling
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = parseUTCTimestamp(dateStr);
    if (!date) return 'N/A';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `Today ${hours}:${minutes}`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    // Show date for older entries
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  // Format task date - uses completed_at for completed tasks, created_at for pending
  const formatTaskDate = (task: BrowserTask) => {
    // For completed tasks, show when they finished (posted)
    if (task.status === 'completed' && task.completed_at) {
      return formatRelativeTime(task.completed_at);
    }
    // For other statuses, show created_at
    return formatRelativeTime(task.created_at);
  };

  // Handle navigation
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setCurrentView('user-detail', { userId: user.id });
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project-detail', { projectId: String(project.id) });
    setProjectTab('browser');
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Toggle project active status
  const handleToggleProjectStatus = async (projectId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('Projeto')
        .update({ 'Youtube Active': !currentStatus })
        .eq('id', projectId);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, status: !currentStatus ? 1 : 0 } 
          : p
      ));
      setOpenActionMenu(null);
    } catch (err) {
      console.error('Error toggling project status:', err);
    }
  };

  // Fetch full project details
  const handleViewProjectDetails = async (projectId: number) => {
    setLoadingProjectDetail(true);
    try {
      const { data, error } = await supabase
        .from('Projeto')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectDetailModal(data as FullProject);
    } catch (err) {
      console.error('Error fetching project details:', err);
    } finally {
      setLoadingProjectDetail(false);
      setOpenActionMenu(null);
    }
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  // ====== LOGIN CRUD HANDLERS ======
  const handleSaveLogin = async (loginData: Partial<BrowserLogin>) => {
    try {
      if (loginModal?.mode === 'edit' && loginModal.data) {
        // Update existing login
        const { error } = await supabase
          .from('browser_logins')
          .update({
            platform_name: loginData.platform_name,
            login_email: loginData.login_email,
            login_password: loginData.login_password,
            uses_google_sso: loginData.uses_google_sso,
            has_2fa: loginData.has_2fa,
            twofa_type: loginData.twofa_type,
            is_active: loginData.is_active,
            timezone: loginData.timezone,
            locale: loginData.locale,
          })
          .eq('id', loginModal.data.id);

        if (error) throw error;

        // Update local state
        setLogins(prev => prev.map(l => 
          l.id === loginModal.data!.id ? { ...l, ...loginData } : l
        ));
      } else {
        // Create new login
        const { data, error } = await supabase
          .from('browser_logins')
          .insert({
            projeto_id: loginData.projeto_id,
            platform_name: loginData.platform_name,
            login_email: loginData.login_email,
            login_password: loginData.login_password,
            uses_google_sso: loginData.uses_google_sso || false,
            has_2fa: loginData.has_2fa || false,
            twofa_type: loginData.twofa_type,
            is_active: true,
            is_connected: false,
            timezone: loginData.timezone || 'America/Sao_Paulo',
            locale: loginData.locale || 'pt-BR',
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setLogins(prev => [data as BrowserLogin, ...prev]);
        }
      }
      setLoginModal(null);
    } catch (err) {
      console.error('Error saving login:', err);
      alert('Error saving login. Check console for details.');
    }
  };

  const handleDeleteLogin = async (loginId: number) => {
    try {
      const { error } = await supabase
        .from('browser_logins')
        .delete()
        .eq('id', loginId);

      if (error) throw error;

      setLogins(prev => prev.filter(l => l.id !== loginId));
      setDeleteConfirm(null);
      setOpenActionMenu(null);
    } catch (err) {
      console.error('Error deleting login:', err);
      alert('Error deleting login. Check console for details.');
    }
  };

  // Platform CRUD handlers
  const handleSavePlatform = async (platformData: Partial<BrowserPlatform>) => {
    try {
      if (platformModal?.mode === 'edit' && platformModal.data) {
        // Update existing platform
        const { error } = await supabase
          .from('browser_platforms')
          .update({
            platform_name: platformData.platform_name,
            display_name: platformData.display_name,
            login_url: platformData.login_url,
            success_url_pattern: platformData.success_url_pattern,
            login_prompt: platformData.login_prompt,
            check_logged_prompt: platformData.check_logged_prompt,
            twofa_phone_prompt: platformData.twofa_phone_prompt,
            twofa_code_prompt: platformData.twofa_code_prompt,
            logout_prompt: platformData.logout_prompt,
            icon_name: platformData.icon_name,
            brand_color: platformData.brand_color,
            supports_google_sso: platformData.supports_google_sso,
            requires_2fa: platformData.requires_2fa,
            session_duration_hours: platformData.session_duration_hours,
            is_active: platformData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', platformModal.data.id);

        if (error) throw error;

        // Update local state
        setPlatformPrompts(prev => prev.map(p =>
          p.id === platformModal.data!.id ? { ...p, ...platformData } as BrowserPlatform : p
        ));
      } else {
        // Create new platform
        const { data, error } = await supabase
          .from('browser_platforms')
          .insert({
            platform_name: platformData.platform_name,
            display_name: platformData.display_name,
            login_url: platformData.login_url,
            success_url_pattern: platformData.success_url_pattern,
            login_prompt: platformData.login_prompt || '',
            check_logged_prompt: platformData.check_logged_prompt,
            twofa_phone_prompt: platformData.twofa_phone_prompt,
            twofa_code_prompt: platformData.twofa_code_prompt,
            logout_prompt: platformData.logout_prompt,
            icon_name: platformData.icon_name || 'FaGlobe',
            brand_color: platformData.brand_color || '#8b5cf6',
            supports_google_sso: platformData.supports_google_sso || false,
            requires_2fa: platformData.requires_2fa || false,
            session_duration_hours: platformData.session_duration_hours || 24,
            is_active: platformData.is_active !== false,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPlatformPrompts(prev => [...prev, data as BrowserPlatform]);
        }
      }
      setPlatformModal(null);
    } catch (err) {
      console.error('Error saving platform:', err);
      alert('Error saving platform. Check console for details.');
    }
  };

  const handleDeletePlatform = async (platformId: number) => {
    try {
      const { error } = await supabase
        .from('browser_platforms')
        .delete()
        .eq('id', platformId);

      if (error) throw error;

      setPlatformPrompts(prev => prev.filter(p => p.id !== platformId));
      setDeleteConfirm(null);
      setOpenActionMenu(null);
    } catch (err) {
      console.error('Error deleting platform:', err);
      alert('Error deleting platform. Check console for details.');
    }
  };

  // Get project container
  const getProjectContainer = (projectId: number) => {
    return containers.find(c => c.project_id === projectId);
  };

  // Get project logins
  const getProjectLogins = (projectId: number) => {
    return logins.filter(l => l.projeto_id === projectId);
  };

  // Get project prompts
  const getProjectPrompts = (projectId: number) => {
    return prompts.filter(p => p.project_id === projectId);
  };

  // Get project tasks
  const getProjectTasks = (projectId: number) => {
    return tasks.filter(t => t.project_id === projectId);
  };

  // Render navigation
  const renderNav = () => (
    <Sidebar>
      <Logo>
        <h1>LIFTLIO <span>Admin</span></h1>
      </Logo>

      <NavSection>
        <NavLabel>Principal</NavLabel>
        <NavItem $active={currentView === 'overview'} onClick={() => setCurrentView('overview')}>
          <Icons.Home />
          Overview
        </NavItem>
        <NavItem $active={currentView === 'users'} onClick={() => setCurrentView('users')}>
          <Icons.Users />
          Users
          <Badge>{stats.totalUsers}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'projects'} onClick={() => setCurrentView('projects')}>
          <Icons.Folder />
          Projects
          <Badge>{stats.activeProjects}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'waitlist'} onClick={() => setCurrentView('waitlist')}>
          <Icons.Clock />
          Waitlist
          <Badge>{waitlist.filter(w => w.status === 'pending').length}</Badge>
        </NavItem>
      </NavSection>

      <NavSection>
        <NavLabel>Payments</NavLabel>
        <NavItem $active={currentView === 'subscriptions'} onClick={() => setCurrentView('subscriptions')}>
          <Icons.CreditCard />
          Subscriptions
          <Badge>{subscriptions.filter(s => s.status === 'active').length}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'payments'} onClick={() => setCurrentView('payments')}>
          <Icons.DollarSign />
          Payments
        </NavItem>
      </NavSection>

      <NavSection>
        <NavLabel>Browser Agent</NavLabel>
        <NavItem $active={currentView === 'containers'} onClick={() => setCurrentView('containers')}>
          <Icons.Box />
          Containers
          <Badge>{stats.activeContainers}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'tasks'} onClick={() => setCurrentView('tasks')}>
          <Icons.Zap />
          Tasks
          <Badge title={`${todayTasksCount} today / ${tasksTotal} total`}>{todayTasksCount}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'logins'} onClick={() => setCurrentView('logins')}>
          <Icons.Key />
          Platforms
          <Badge>{platformPrompts.length}</Badge>
        </NavItem>
      </NavSection>

      <NavSection>
        <NavLabel>System</NavLabel>
        <NavItem $active={currentView === 'analytics'} onClick={() => setCurrentView('analytics')}>
          <Icons.BarChart />
          Analytics
        </NavItem>
        <NavItem $active={currentView === 'simulations'} onClick={() => setCurrentView('simulations')}>
          <Icons.MessageCircle />
          Simulations
        </NavItem>
        <NavItem $active={currentView === 'health'} onClick={() => setCurrentView('health')}>
          <Icons.Activity />
          Health
        </NavItem>
        <NavItem $active={currentView === 'settings'} onClick={() => setCurrentView('settings')}>
          <Icons.Settings />
          Settings
        </NavItem>
      </NavSection>

      <NavSection>
        <NavLabel>Content</NavLabel>
        <NavItem $active={currentView === 'blog'} onClick={() => setCurrentView('blog')}>
          <Icons.FileText />
          Blog
        </NavItem>
      </NavSection>
    </Sidebar>
  );

  // Render header
  const renderHeader = () => (
    <Header>
      <SearchContainer>
        <SearchIcon><Icons.Search /></SearchIcon>
        <SearchInput
          placeholder="Search users, projects, or tasks..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(e.target.value.length > 0);
          }}
          onFocus={() => searchQuery && setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
        />
        {searchOpen && (searchResults.users.length > 0 || searchResults.projects.length > 0) && (
          <SearchDropdown>
            {searchResults.users.length > 0 && (
              <>
                <SearchSection>Users</SearchSection>
                {searchResults.users.map(u => (
                  <SearchResult key={u.id} onClick={() => handleSelectUser(u)}>
                    <SearchAvatar>{u.email[0].toUpperCase()}</SearchAvatar>
                    <SearchInfo>
                      <div className="title">{u.email}</div>
                      <div className="subtitle">{u.projects_count} projects</div>
                    </SearchInfo>
                  </SearchResult>
                ))}
              </>
            )}
            {searchResults.projects.length > 0 && (
              <>
                <SearchSection>Projects</SearchSection>
                {searchResults.projects.map(p => (
                  <SearchResult key={p.id} onClick={() => handleSelectProject(p)}>
                    <SearchAvatar $color="#a855f7">{p.name[0].toUpperCase()}</SearchAvatar>
                    <SearchInfo>
                      <div className="title">{p.name}</div>
                      <div className="subtitle">{p.user_email}</div>
                    </SearchInfo>
                  </SearchResult>
                ))}
              </>
            )}
          </SearchDropdown>
        )}
      </SearchContainer>
      <LiveBadge>LIVE Production</LiveBadge>
    </Header>
  );

  // Render overview
  const renderOverview = () => (
    <Content>
      <PageHeader>
        <h1>Dashboard Overview</h1>
        <p>Platform-wide metrics and system status</p>
      </PageHeader>

      <KPIGrid>
        <KPICard>
          <div className="label">Total Users</div>
          <div className="value">{stats.totalUsers}</div>
          <div className="change">+2 this month</div>
        </KPICard>
        <KPICard>
          <div className="label">Active Projects</div>
          <div className="value">{stats.activeProjects}</div>
          <div className="change">No change</div>
        </KPICard>
        <KPICard>
          <div className="label">Revenue (MRR)</div>
          <div className="value green">${stats.mrr.toFixed(2)}</div>
          <div className="change">{subscriptions.filter(s => s.status === 'active').length} active subscriptions</div>
        </KPICard>
        <KPICard>
          <div className="label">Task Success Rate</div>
          <div className="value purple">{stats.taskSuccessRate}%</div>
          <div className="change">{tasks.filter(t => t.status === 'completed').length}/{tasks.length} completed</div>
        </KPICard>
      </KPIGrid>

      <StatsRow>
        <StatItem>
          <div className="value">{stats.visitsToday}</div>
          <div className="label">Visits Today</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.visitsWeek}</div>
          <div className="label">This Week</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.visitsMonth}</div>
          <div className="label">This Month</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.waitlistCount}</div>
          <div className="label">Waitlist</div>
        </StatItem>
        <StatItem style={{ position: 'relative', cursor: 'pointer' }} className="has-tooltip">
          <div className="value">{stats.simulationsToday}</div>
          <div className="label">Simulations Today</div>
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1f2937',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 0.2s, visibility 0.2s',
            marginBottom: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000
          }} className="tooltip-content">
            Total: {stats.simulationsCount}
          </div>
          <style>{`
            .has-tooltip:hover .tooltip-content {
              opacity: 1 !important;
              visibility: visible !important;
            }
          `}</style>
        </StatItem>
        <StatItem>
          <div className="value">{stats.activeContainers}</div>
          <div className="label">Containers</div>
        </StatItem>
      </StatsRow>

      <Grid>
        <Card>
          <CardHeader>
            <h3>Recent Users</h3>
            <ViewAllButton onClick={() => setCurrentView('users')}>View all</ViewAllButton>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <th>User</th>
                <th>Projects</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map(u => (
                <tr key={u.id} onClick={() => handleSelectUser(u)} style={{ cursor: 'pointer' }}>
                  <td>
                    <UserCell>
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.full_name || u.email}
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <Avatar>{u.email[0].toUpperCase()}</Avatar>
                      )}
                      {u.full_name || u.email}
                    </UserCell>
                  </td>
                  <td>{u.projects_count}</td>
                  <td>
                    <StatusBadge $status={u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > Date.now() - 86400000 ? 'active' : 'offline'}>
                      {u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > Date.now() - 86400000 ? 'Active' : formatRelativeTime(u.last_sign_in_at)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <h3>Recent Activity</h3>
            <ViewAllButton onClick={() => setCurrentView('tasks')}>View all</ViewAllButton>
          </CardHeader>
          <ActivityList>
            {activity.map(item => (
              <ActivityItem key={item.id}>
                <ActivityIcon $type={item.type}>
                  {item.type === 'task_completed' && <Icons.Check />}
                  {item.type === 'task_failed' && <Icons.X />}
                  {item.type === '2fa_pending' && <Icons.Clock />}
                  {item.type === 'new_user' && <Icons.User />}
                </ActivityIcon>
                <ActivityContent>
                  <div className="title">
                    <strong>{item.title}</strong> - {item.description}
                  </div>
                  <div className="meta">{formatRelativeTime(item.timestamp)} · {item.context}</div>
                </ActivityContent>
              </ActivityItem>
            ))}
          </ActivityList>
        </Card>
      </Grid>

      <Card>
        <CardHeader>
          <h3>System Health</h3>
          {healthStatus.lastCheck && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Last check: {healthStatus.lastCheck.toLocaleTimeString()}</span>}
        </CardHeader>
        <div style={{ padding: '16px' }}>
          <HealthGrid>
            <HealthCard $status={healthStatus.supabaseDb}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Supabase Database</div>
                <div className="detail">PostgreSQL · {healthStatus.supabaseDb === 'ok' ? 'Operational' : healthStatus.supabaseDb === 'checking' ? 'Checking...' : 'Error'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.supabaseAuth}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Supabase Auth</div>
                <div className="detail">Google OAuth · {healthStatus.supabaseAuth === 'ok' ? 'Working' : healthStatus.supabaseAuth === 'checking' ? 'Checking...' : 'Error'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.flyioFrontend}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Fly.io Frontend</div>
                <div className="detail">liftlio.com · {healthStatus.flyioFrontend === 'ok' ? 'Online' : healthStatus.flyioFrontend === 'checking' ? 'Checking...' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.vpsBrowser}>
              <div className="indicator" />
              <div className="info">
                <div className="name">VPS Browser Agent</div>
                <div className="detail">173.249.22.2 · {healthStatus.vpsBrowser === 'ok' ? 'Running' : healthStatus.vpsBrowser === 'checking' ? 'Checking...' : healthStatus.vpsBrowser === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.dockerContainers}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Docker Containers</div>
                <div className="detail">{stats.activeContainers} running</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.analyticsServer}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Analytics Server</div>
                <div className="detail">track.liftlio.com · {healthStatus.analyticsServer === 'ok' ? 'OK' : healthStatus.analyticsServer === 'checking' ? 'Checking...' : healthStatus.analyticsServer === 'unknown' ? 'Unknown (CORS)' : 'Error'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.edgeFunctions}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Edge Functions</div>
                <div className="detail">{healthStatus.edgeFunctions === 'ok' ? '26 functions · OK' : healthStatus.edgeFunctions === 'checking' ? 'Checking...' : 'Error'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.orchestrator}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Browser Orchestrator</div>
                <div className="detail">:8080 · {healthStatus.orchestrator === 'ok' ? 'Running' : healthStatus.orchestrator === 'checking' ? 'Checking...' : healthStatus.orchestrator === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.videoQualifier}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Video Qualifier</div>
                <div className="detail">:8001 · {healthStatus.videoQualifier === 'ok' ? 'Running' : healthStatus.videoQualifier === 'checking' ? 'Checking...' : healthStatus.videoQualifier === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.transcricao}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Transcricao Service</div>
                <div className="detail">:8081 · {healthStatus.transcricao === 'ok' ? 'Running' : healthStatus.transcricao === 'checking' ? 'Checking...' : healthStatus.transcricao === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.youtubeSearch}>
              <div className="indicator" />
              <div className="info">
                <div className="name">YouTube Transcription</div>
                <div className="detail">transcricao.liftlio.com · {healthStatus.youtubeSearch === 'ok' ? 'Running' : healthStatus.youtubeSearch === 'checking' ? 'Checking...' : healthStatus.youtubeSearch === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.mcpGmail}>
              <div className="indicator" />
              <div className="info">
                <div className="name">MCP Gmail</div>
                <div className="detail">:3000 · {healthStatus.mcpGmail === 'ok' ? 'Running' : healthStatus.mcpGmail === 'checking' ? 'Checking...' : healthStatus.mcpGmail === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
              </div>
            </HealthCard>
            <HealthCard $status={healthStatus.tokenRefresher}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Token Refresher</div>
                <div className="detail">Internal · {healthStatus.tokenRefresher === 'ok' ? 'Running' : healthStatus.tokenRefresher === 'checking' ? 'Checking...' : healthStatus.tokenRefresher === 'unknown' ? 'Unknown' : 'Offline'}</div>
              </div>
            </HealthCard>
          </HealthGrid>
        </div>
      </Card>
    </Content>
  );

  // Render subscriptions
  const renderSubscriptions = () => (
    <Content>
      <PageHeader>
        <h1>Subscriptions</h1>
        <p>Manage user subscriptions and plans</p>
      </PageHeader>

      <KPIGrid>
        <KPICard>
          <div className="label">Active Subscriptions</div>
          <div className="value">{subscriptions.filter(s => s.status === 'active').length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Monthly Revenue</div>
          <div className="value green">${stats.mrr.toFixed(2)}</div>
        </KPICard>
        <KPICard>
          <div className="label">Trial Users</div>
          <div className="value">{subscriptions.filter(s => s.trial_ends_at).length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Cancelled</div>
          <div className="value red">{subscriptions.filter(s => s.status === 'cancelled').length}</div>
        </KPICard>
      </KPIGrid>

      <Card>
        <CardHeader>
          <h3>All Subscriptions</h3>
          <Button $variant="ghost">Export</Button>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Next Billing</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub.id}>
                <td>
                  <UserCell>
                    <Avatar>{(sub.customer_id && sub.customer_id.length > 0 ? sub.customer_id[0] : 'U').toUpperCase()}</Avatar>
                    {sub.customer_id || 'Unknown'}
                  </UserCell>
                </td>
                <td>{sub.plan_name || 'N/A'}</td>
                <td>${((sub.base_amount ?? 0) / 100).toFixed(2)}/mo</td>
                <td>
                  <StatusBadge $status={sub.status || 'unknown'}>{sub.status || 'Unknown'}</StatusBadge>
                </td>
                <td>{formatDate(sub.next_billing_date)}</td>
                <td>
                  <Button $variant="ghost" onClick={() => setEditModal({ type: 'subscription', data: sub })}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Content>
  );

  // Render payments
  const renderPayments = () => (
    <Content>
      <PageHeader>
        <h1>Payments</h1>
        <p>Payment history and transactions</p>
      </PageHeader>

      <KPIGrid>
        <KPICard>
          <div className="label">Total Revenue</div>
          <div className="value green">${(payments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100).toFixed(2)}</div>
        </KPICard>
        <KPICard>
          <div className="label">Successful</div>
          <div className="value">{payments.filter(p => p.status === 'completed').length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Failed</div>
          <div className="value red">{payments.filter(p => p.status === 'failed').length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Refunded</div>
          <div className="value">$0</div>
        </KPICard>
      </KPIGrid>

      <Card>
        <CardHeader>
          <h3>Payment History</h3>
          <Button $variant="ghost">Export</Button>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Square ID</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td>{formatDate(payment.created_at)}</td>
                <td>{payment.subscription_id || 'N/A'}</td>
                <td>${((payment.amount ?? 0) / 100).toFixed(2)}</td>
                <td>
                  <StatusBadge $status={payment.status}>{payment.status}</StatusBadge>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: theme.colors.text.muted }}>
                  {payment.square_payment_id || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Content>
  );

  // Handle task deletion (soft delete)
  const deleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    if (!window.confirm('Soft delete this task? (Marked as deleted but kept in database)')) return;

    // Soft delete - set deleted_at instead of actually deleting
    const { error } = await supabase
      .from('browser_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (!error) {
      // Update local state to show deleted_at
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, deleted_at: new Date().toISOString() } : t
      ));
    }
  };

  // Handle waitlist status update
  const updateWaitlistStatus = async (id: number, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('waitlist')
      .update({
        status,
        updated_at: new Date().toISOString(),
        invitation_sent_at: status === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (!error) {
      setWaitlist(prev => prev.map(w =>
        w.id === id ? { ...w, status, updated_at: new Date().toISOString() } : w
      ));
    }
  };

  // Render waitlist
  const renderWaitlist = () => (
    <Content>
      <PageHeader>
        <h1>Waitlist</h1>
        <p>Manage users waiting for access</p>
      </PageHeader>

      <KPIGrid>
        <KPICard>
          <div className="label">Total Signups</div>
          <div className="value">{waitlist.length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Pending</div>
          <div className="value" style={{ color: '#f59e0b' }}>{waitlist.filter(w => w.status === 'pending').length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Approved</div>
          <div className="value green">{waitlist.filter(w => w.status === 'approved').length}</div>
        </KPICard>
        <KPICard>
          <div className="label">Rejected</div>
          <div className="value red">{waitlist.filter(w => w.status === 'rejected').length}</div>
        </KPICard>
      </KPIGrid>

      {/* Pending Section - Highlighted */}
      {waitlist.filter(w => w.status === 'pending').length > 0 && (
        <Card style={{ marginBottom: '16px', border: '1px solid #f59e0b' }}>
          <CardHeader style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <h3 style={{ color: '#f59e0b' }}>⏳ Pending Approval ({waitlist.filter(w => w.status === 'pending').length})</h3>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Website</th>
                <th>Source</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.filter(w => w.status === 'pending').map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontWeight: 600, color: '#f59e0b' }}>#{entry.position_in_queue}</td>
                  <td>
                    <UserCell>
                      <Avatar style={{ background: '#f59e0b' }}>{entry.name ? entry.name[0].toUpperCase() : 'U'}</Avatar>
                      {entry.name}
                    </UserCell>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{entry.email}</td>
                  <td>
                    {entry.website_url ? (
                      <a href={entry.website_url} target="_blank" rel="noopener noreferrer"
                         style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                        {entry.website_url.replace(/^https?:\/\//, '').slice(0, 25)}
                      </a>
                    ) : '-'}
                  </td>
                  <td>{entry.discovery_source || '-'}</td>
                  <td>{formatDate(entry.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        $variant="primary"
                        onClick={() => updateWaitlistStatus(entry.id, 'approved')}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        $variant="ghost"
                        onClick={() => updateWaitlistStatus(entry.id, 'rejected')}
                        style={{ color: '#ef4444', padding: '6px 12px', fontSize: '12px' }}
                      >
                        ✗ Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3>All Waitlist Entries</h3>
          <span style={{ fontSize: '12px', color: theme.colors.text.muted }}>{waitlist.length} total</span>
        </CardHeader>
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Website</th>
              <th>Source</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.map(entry => (
              <tr key={entry.id}>
                <td style={{ fontWeight: 600, color: theme.colors.text.muted }}>#{entry.position_in_queue}</td>
                <td>
                  <UserCell>
                    <Avatar>{entry.name ? entry.name[0].toUpperCase() : 'U'}</Avatar>
                    {entry.name}
                  </UserCell>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{entry.email}</td>
                <td>
                  {entry.website_url ? (
                    <a href={entry.website_url} target="_blank" rel="noopener noreferrer"
                       style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                      {entry.website_url.replace(/^https?:\/\//, '').slice(0, 25)}...
                    </a>
                  ) : '-'}
                </td>
                <td>{entry.discovery_source || '-'}</td>
                <td>{formatDate(entry.created_at)}</td>
                <td>
                  <StatusBadge $status={entry.status}>{entry.status}</StatusBadge>
                </td>
                <td>
                  {entry.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        $variant="ghost"
                        onClick={() => updateWaitlistStatus(entry.id, 'approved')}
                        style={{ color: '#10b981', padding: '4px 8px', fontSize: '12px' }}
                      >
                        Approve
                      </Button>
                      <Button
                        $variant="ghost"
                        onClick={() => updateWaitlistStatus(entry.id, 'rejected')}
                        style={{ color: '#ef4444', padding: '4px 8px', fontSize: '12px' }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {entry.status !== 'pending' && (
                    <span style={{ color: theme.colors.text.muted, fontSize: '12px' }}>
                      {entry.status === 'approved' ? '✓ Invited' : '✗ Rejected'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {waitlist.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: theme.colors.text.muted }}>
                  No waitlist entries yet
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </Content>
  );

  // Render project detail
  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    const container = getProjectContainer(selectedProject.id);
    const projectLogins = getProjectLogins(selectedProject.id);
    const projectPrompts = getProjectPrompts(selectedProject.id);
    const projectTasks = getProjectTasks(selectedProject.id);

    return (
      <Content>
        <Breadcrumb>
          <a onClick={() => setCurrentView('overview')}>Overview</a>
          <span>›</span>
          <a onClick={() => {
            const projectUser = users.find(u => u.id === selectedProject.user_id);
            if (projectUser) handleSelectUser(projectUser);
          }}>{selectedProject.user_email}</a>
          <span>›</span>
          <span>{selectedProject.name}</span>
        </Breadcrumb>

        <DetailHeader>
          <div className="left">
            <h1>{selectedProject.name}</h1>
            <p>{container?.container_name || 'No container'} · {container?.mcp_url || 'N/A'}</p>
          </div>
          <div className="actions">
            {container && (
              <>
                <Button $variant="primary" onClick={() => { const url = getAdminVncUrl(container.vnc_url); if (url) window.open(url, '_blank'); }}>
                  Open VNC
                </Button>
                <Button $variant="ghost">Restart</Button>
                <Button $variant="danger">Stop</Button>
              </>
            )}
            <Button $variant="ghost" onClick={() => setEditModal({ type: 'project', data: selectedProject })}>
              Edit Project
            </Button>
          </div>
        </DetailHeader>

        <Tabs>
          <Tab $active={projectTab === 'browser'} onClick={() => setProjectTab('browser')}>Browser</Tab>
          <Tab $active={projectTab === 'logins'} onClick={() => setProjectTab('logins')}>Logins ({projectLogins.length})</Tab>
          <Tab $active={projectTab === 'prompts'} onClick={() => setProjectTab('prompts')}>Prompts</Tab>
          <Tab $active={projectTab === 'tasks'} onClick={() => setProjectTab('tasks')}>Tasks ({projectTasks.length})</Tab>
        </Tabs>

        {projectTab === 'browser' && container && (
          <InfoGrid>
            <InfoItem>
              <div className="label">Container</div>
              <div className="value">{container.container_name}</div>
            </InfoItem>
            <InfoItem>
              <div className="label">MCP URL</div>
              <div className="value">
                <a href={`http://${container.mcp_url}`} target="_blank" rel="noopener noreferrer">
                  {container.mcp_url}
                </a>
              </div>
            </InfoItem>
            <InfoItem>
              <div className="label">VNC URL</div>
              <div className="value">
                <a href={getAdminVncUrl(container.vnc_url) || "#"} target="_blank" rel="noopener noreferrer">
                  {container.vnc_url}
                </a>
              </div>
            </InfoItem>
            <InfoItem>
              <div className="label">Status</div>
              <div className="value">
                <StatusBadge $status={container.status}>{container.status}</StatusBadge>
              </div>
            </InfoItem>
            <InfoItem>
              <div className="label">Started</div>
              <div className="value">{formatDate(container.started_at)}</div>
            </InfoItem>
            <InfoItem>
              <div className="label">Last URL</div>
              <div className="value">{container.last_url || 'N/A'}</div>
            </InfoItem>
          </InfoGrid>
        )}

        {projectTab === 'logins' && (
          <Card>
            <CardHeader>
              <h3>Configured Logins</h3>
              <Button $variant="primary">+ Add Login</Button>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Email</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectLogins.map(login => (
                  <tr key={login.id}>
                    <td>
                      <UserCell>
                        <Avatar $color={
                          login.platform_name === 'google' ? '#4285f4' :
                          login.platform_name === 'youtube' ? '#ff0000' :
                          login.platform_name === 'reddit' ? '#ff4500' :
                          '#8b5cf6'
                        }>
                          {login.platform_name ? login.platform_name[0].toUpperCase() : '?'}
                        </Avatar>
                        {login.platform_name ? login.platform_name.charAt(0).toUpperCase() + login.platform_name.slice(1) : 'Unknown'}
                      </UserCell>
                    </td>
                    <td>{login.login_email || '-'}</td>
                    <td>{login.uses_google_sso ? 'Google SSO' : 'Password'}</td>
                    <td>
                      <StatusBadge $status={login.is_connected ? 'active' : 'inactive'}>
                        {login.is_connected ? 'Connected' : 'Disconnected'}
                      </StatusBadge>
                    </td>
                    <td>
                      <Button $variant="primary" style={{ marginRight: '8px' }}>
                        {login.is_connected ? 'Verify' : 'Login'}
                      </Button>
                      <Button $variant="ghost" onClick={() => setEditModal({ type: 'login', data: login })}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        {projectTab === 'prompts' && (
          <Card>
            <CardHeader>
              <h3>Platform Prompts</h3>
              <Button $variant="primary">+ New Platform</Button>
            </CardHeader>
            <div style={{ padding: '16px' }}>
              {projectPrompts.length === 0 ? (
                <p style={{ color: theme.colors.text.muted, textAlign: 'center', padding: '40px' }}>
                  No prompts configured for this project
                </p>
              ) : (
                projectPrompts.map(prompt => (
                  <PromptEditor key={prompt.id}>
                    <PromptHeader onClick={() => setEditModal({ type: 'prompt', data: prompt })}>
                      <div className="left">
                        <Avatar $color="#4285f4">{prompt.platform[0].toUpperCase()}</Avatar>
                        <div>
                          <div style={{ fontWeight: 500 }}>{prompt.platform}</div>
                          <div style={{ fontSize: '12px', color: theme.colors.text.muted }}>
                            Click to edit prompts
                          </div>
                        </div>
                      </div>
                      <Icons.ChevronRight />
                    </PromptHeader>
                  </PromptEditor>
                ))
              )}
            </div>
          </Card>
        )}

        {projectTab === 'tasks' && (
          <Card>
            <CardHeader>
              <h3>Task History</h3>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.slice(0, 20).map(task => (
                  <tr key={task.id}>
                    <td>{formatDate(task.created_at)}</td>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.task}
                    </td>
                    <td>
                      <StatusBadge $status={task.status}>{task.status}</StatusBadge>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.error_message ? '#ef4444' : theme.colors.text.muted }}>
                      {task.error_message || (task.response ? 'Success' : 'N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </Content>
    );
  };

  // Toggle platform expansion
  const togglePlatform = (id: number) => {
    setExpandedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Get platform icon and color
  const getPlatformStyle = (name: string) => {
    switch (name.toLowerCase()) {
      case 'google':
        return { icon: '🔵', color: '#4285f4', bg: 'rgba(66, 133, 244, 0.1)' };
      case 'youtube':
        return { icon: '🔴', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.1)' };
      case 'reddit':
        return { icon: '🟠', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.1)' };
      default:
        return { icon: '🟣', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
    }
  };

  // Save maintenance config
  const saveMaintenanceConfig = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({
          value: maintenanceConfig,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('key', 'maintenance_mode');

      if (error) throw error;
      alert('Maintenance settings saved successfully!');
    } catch (error) {
      console.error('Error saving maintenance config:', error);
      alert('Failed to save maintenance settings.');
    } finally {
        // Minimum loading time of 1.5s for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
      setSavingSettings(false);
    }
  };

  // Update platform prompt
  const updatePrompt = (id: number, field: string, value: string) => {
    setPlatformPrompts(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  // Save platform prompt
  const savePlatformPrompt = async (prompt: PlatformPrompt) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('browser_platforms')
        .update({
          login_prompt: prompt.login_prompt,
          check_logged_prompt: prompt.check_logged_prompt,
          logout_prompt: prompt.logout_prompt,
          twofa_phone_prompt: prompt.twofa_phone_prompt,
          twofa_code_prompt: prompt.twofa_code_prompt,
          comment_prompt: prompt.comment_prompt,
          reply_prompt: prompt.reply_prompt
        })
        .eq('id', prompt.id);

      if (error) throw error;
      alert(`${prompt.display_name} prompts saved successfully!`);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompts.');
    } finally {
        // Minimum loading time of 1.5s for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
      setSavingSettings(false);
    }
  };


  // Add new admin
  const addAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email address.'); return; }
    if (adminEmails.includes(email)) { alert('This email is already an admin.'); return; }
    setAddingAdmin(true);
    try {
      const updatedEmails = [...adminEmails, email];
      const { error: saveError } = await supabase.from('system_config').upsert({ key: 'admin_emails', value: { emails: updatedEmails }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (saveError) throw saveError;
      const { error: emailError } = await supabase.rpc('send_email', { recipient_email: email, email_subject: "You've Been Granted Admin Access - Liftlio", email_html: '<p>Loading template...</p>', template_id: '7fa72e69-9081-4008-9b1f-94bb6cd75eeb', variables: { adminEmail: email, grantedBy: user?.email || PRIMARY_OWNER }, complexity: 'simple' });
      if (emailError) console.warn('Failed to send invitation email:', emailError);
      setAdminEmails(updatedEmails);
      setNewAdminEmail('');
      alert(`Admin access granted to ${email}. Invitation email sent!`);
    } catch (error) { console.error('Error adding admin:', error); alert('Failed to add admin.'); }
    finally { setAddingAdmin(false); }
  };

  // Remove admin
  const removeAdmin = async (email: string) => {
    if (email.toLowerCase() === PRIMARY_OWNER.toLowerCase()) { alert('Cannot remove the primary owner.'); return; }
    if (!window.confirm(`Remove admin access for ${email}?`)) return;
    setSavingSettings(true);
    try {
      const updatedEmails = adminEmails.filter(e => e.toLowerCase() !== email.toLowerCase());
      const { error } = await supabase.from('system_config').upsert({ key: 'admin_emails', value: { emails: updatedEmails }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      setAdminEmails(updatedEmails);
      alert(`Admin access removed for ${email}.`);
    } catch (error) { console.error('Error removing admin:', error); alert('Failed to remove admin.'); }
    finally { setSavingSettings(false); }
  };

  // Render settings
  const renderSettings = () => (
    <Content>
      <PageHeader>
        <h1>Settings</h1>
        <p>Configure system settings and automation prompts</p>
      </PageHeader>

      {/* Maintenance Mode Section */}
      <SettingsSection>
        <SettingsHeader>
          <div>
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Maintenance Mode
            </h3>
            <p>Control site availability and display maintenance messages to users</p>
          </div>
        </SettingsHeader>
        <SettingsBody>
          <MaintenanceAlert $active={maintenanceConfig.enabled}>
            {maintenanceConfig.enabled ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Maintenance mode is ACTIVE - Users will see the maintenance page</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Site is operating normally</span>
              </>
            )}
          </MaintenanceAlert>

          <ToggleRow>
            <div className="info">
              <div className="label">Enable Maintenance Mode</div>
              <div className="description">Show maintenance page to all users except admins</div>
            </div>
            <Toggle>
              <input
                type="checkbox"
                checked={maintenanceConfig.enabled}
                onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span />
            </Toggle>
          </ToggleRow>

          <FormGroup style={{ marginTop: '16px' }}>
            <label>Maintenance Message</label>
            <textarea
              value={maintenanceConfig.message}
              onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter the message users will see during maintenance..."
              rows={4}
            />
          </FormGroup>

          <FormGroup>
            <label>Estimated End Time (Optional)</label>
            <input
              type="datetime-local"
              value={maintenanceConfig.estimated_end || ''}
              onChange={(e) => setMaintenanceConfig(prev => ({ ...prev, estimated_end: e.target.value || null }))}
            />
          </FormGroup>
        </SettingsBody>
        <SaveBar>
          <Button 
            $variant="ghost" 
            onClick={() => window.open('/maintenance.html', '_blank')}
            style={{ marginRight: '12px' }}
          >
            Preview Page
          </Button>
          <Button $variant="primary" onClick={saveMaintenanceConfig} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Maintenance Settings'}
          </Button>
        </SaveBar>
      </SettingsSection>

      {/* Platform Prompts Section */}
      <SettingsSection>
        <SettingsHeader>
          <div>
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Browser Automation Prompts
            </h3>
            <p>Configure AI prompts for login, logout, and 2FA verification across platforms</p>
          </div>
        </SettingsHeader>
        <SettingsBody>
          {platformPrompts.map(prompt => {
            const style = getPlatformStyle(prompt.platform_name);
            const isExpanded = expandedPlatforms.includes(prompt.id);

            return (
              <PromptCard key={prompt.id} $expanded={isExpanded}>
                <PromptCardHeader onClick={() => togglePlatform(prompt.id)}>
                  <div className="left">
                    <div className="platform-icon" style={{ background: style.bg }}>
                      {style.icon}
                    </div>
                    <div>
                      <div className="name">{prompt.display_name}</div>
                      <div className="meta">
                        {prompt.login_prompt ? '✓ Login' : '○ Login'} ·{' '}
                        {prompt.check_logged_prompt ? '✓ Check' : '○ Check'} ·{' '}
                        {prompt.logout_prompt ? '✓ Logout' : '○ Logout'} ·{' '}
                        {prompt.twofa_phone_prompt ? '✓ 2FA' : '○ 2FA'} ·{' '}
                        {prompt.comment_prompt ? '✓ Comment' : '○ Comment'} ·{' '}
                        {prompt.reply_prompt ? '✓ Reply' : '○ Reply'}
                      </div>
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </PromptCardHeader>

                {isExpanded && (
                  <PromptCardBody>
                    <PromptField>
                      <label>Login Prompt</label>
                      <textarea
                        value={prompt.login_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'login_prompt', e.target.value)}
                        placeholder="Instructions for the AI to perform login..."
                      />
                    </PromptField>

                    <PromptField>
                      <label>Check Logged Prompt</label>
                      <textarea
                        value={prompt.check_logged_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'check_logged_prompt', e.target.value)}
                        placeholder="Instructions to verify if user is logged in..."
                      />
                    </PromptField>

                    <PromptField>
                      <label>Logout Prompt</label>
                      <textarea
                        value={prompt.logout_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'logout_prompt', e.target.value)}
                        placeholder="Instructions for the AI to perform logout..."
                      />
                    </PromptField>

                    <PromptField>
                      <label>2FA Phone Prompt</label>
                      <textarea
                        value={prompt.twofa_phone_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'twofa_phone_prompt', e.target.value)}
                        placeholder="Instructions for handling phone 2FA..."
                      />
                    </PromptField>

                    <PromptField>
                      <label>2FA Code Prompt</label>
                      <textarea
                        value={prompt.twofa_code_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'twofa_code_prompt', e.target.value)}
                        placeholder="Instructions for handling code 2FA..."
                      />
                    </PromptField>

                    <PromptField>
                      <label>Comment Prompt (YouTube - Sistema 1)</label>
                      <textarea
                        value={prompt.comment_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'comment_prompt', e.target.value)}
                        placeholder="Instructions for posting direct comments on YouTube videos..."
                        rows={8}
                      />
                    </PromptField>

                    <PromptField>
                      <label>Reply Prompt (YouTube - Sistema 2)</label>
                      <textarea
                        value={prompt.reply_prompt || ''}
                        onChange={(e) => updatePrompt(prompt.id, 'reply_prompt', e.target.value)}
                        placeholder="Instructions for replying to comments on YouTube (watch video, like comment, then reply)..."
                        rows={8}
                      />
                    </PromptField>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button $variant="primary" onClick={() => savePlatformPrompt(prompt)} disabled={savingSettings}>
                        {savingSettings ? 'Saving...' : `Save ${prompt.display_name} Prompts`}
                      </Button>
                    </div>
                  </PromptCardBody>
                )}
              </PromptCard>
            );
          })}

          {platformPrompts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.colors.text.muted }}>
              <p>No platform prompts configured yet.</p>
              <p style={{ fontSize: '13px' }}>Add platforms in the browser_platforms table.</p>
            </div>
          )}
        </SettingsBody>
      </SettingsSection>
      {/* Admin Users Section */}
      <SettingsSection>
        <SettingsHeader>
          <div>
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Admin Users
            </h3>
            <p>Manage who has admin access to this dashboard</p>
          </div>
        </SettingsHeader>
        <SettingsBody>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="Enter email address..."
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAdmin()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  backgroundColor: '#1f2937',
                  color: '#f3f4f6',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={addAdmin}
                disabled={addingAdmin || !newAdminEmail.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  cursor: addingAdmin ? 'not-allowed' : 'pointer',
                  opacity: addingAdmin || !newAdminEmail.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {addingAdmin ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
              New admins will receive an email notification with their access details.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {adminEmails.map((email, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: email.toLowerCase() === PRIMARY_OWNER.toLowerCase() ? '#8b5cf6' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 500 }}>
                      {email}
                    </div>
                    {email.toLowerCase() === PRIMARY_OWNER.toLowerCase() && (
                      <div style={{ color: '#8b5cf6', fontSize: '11px', fontWeight: 600 }}>
                        PRIMARY OWNER
                      </div>
                    )}
                  </div>
                </div>
                {email.toLowerCase() !== PRIMARY_OWNER.toLowerCase() && (
                  <button
                    onClick={() => removeAdmin(email)}
                    disabled={savingSettings}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      cursor: savingSettings ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </SettingsBody>
      </SettingsSection>
    </Content>
  );

  // Render edit modal
  const renderEditModal = () => {
    if (!editModal) return null;

    return (
      <Modal onClick={() => setEditModal(null)}>
        <ProjectModalContent onClick={e => e.stopPropagation()}>
          <ProjectModalHeader>
            <h2>Edit {editModal.type.charAt(0).toUpperCase() + editModal.type.slice(1)}</h2>
            <button onClick={() => setEditModal(null)}>×</button>
          </ProjectModalHeader>
          <ProjectModalBody>
            {editModal.type === 'project' && (
              <>
                <FormGroup>
                  <label>Name</label>
                  <input type="text" defaultValue={editModal.data.name} />
                </FormGroup>
                <FormGroup>
                  <label>Description</label>
                  <textarea defaultValue={editModal.data.description || ''} placeholder="Project description..." />
                </FormGroup>
              </>
            )}
            {editModal.type === 'prompt' && (
              <>
                <FormGroup>
                  <label>Login Prompt</label>
                  <textarea defaultValue={editModal.data.login_prompt || ''} rows={6} />
                </FormGroup>
                <FormGroup>
                  <label>Check Logged Prompt</label>
                  <textarea defaultValue={editModal.data.check_logged_prompt || ''} rows={4} />
                </FormGroup>
                <FormGroup>
                  <label>2FA Prompt</label>
                  <textarea defaultValue={editModal.data.twofa_prompt || ''} rows={4} />
                </FormGroup>
              </>
            )}
          </ProjectModalBody>
          <ModalFooter>
            <Button $variant="ghost" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button $variant="primary">Save Changes</Button>
          </ModalFooter>
        </ProjectModalContent>
      </Modal>
    );
  };

  // Render Login Modal (Create/Edit)
  // Render Platform Modal
  const renderPlatformModal = () => {
    if (!platformModal) return null;

    const isEdit = platformModal.mode === 'edit';
    const initialData = platformModal.data || {
      platform_name: '',
      display_name: '',
      login_url: '',
      success_url_pattern: '',
      login_prompt: '',
      check_logged_prompt: '',
      twofa_phone_prompt: '',
      twofa_code_prompt: '',
      logout_prompt: '',
      icon_name: 'FaGlobe',
      brand_color: '#8b5cf6',
      supports_google_sso: false,
      requires_2fa: false,
      session_duration_hours: 24,
      is_active: true,
    };

    return (
      <Modal onClick={() => setPlatformModal(null)}>
        <ProjectModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
          <ProjectModalHeader>
            <h2>{isEdit ? 'Edit' : 'Add'} Platform</h2>
            <button onClick={() => setPlatformModal(null)}>×</button>
          </ProjectModalHeader>
          <ProjectModalBody>
            <form id="platform-form" onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleSavePlatform({
                platform_name: formData.get('platform_name') as string,
                display_name: formData.get('display_name') as string,
                login_url: formData.get('login_url') as string,
                success_url_pattern: formData.get('success_url_pattern') as string || null,
                login_prompt: formData.get('login_prompt') as string,
                check_logged_prompt: formData.get('check_logged_prompt') as string || null,
                twofa_phone_prompt: formData.get('twofa_phone_prompt') as string || null,
                twofa_code_prompt: formData.get('twofa_code_prompt') as string || null,
                logout_prompt: formData.get('logout_prompt') as string || null,
                icon_name: formData.get('icon_name') as string || 'FaGlobe',
                brand_color: formData.get('brand_color') as string || '#8b5cf6',
                supports_google_sso: formData.get('supports_google_sso') === 'on',
                requires_2fa: formData.get('requires_2fa') === 'on',
                session_duration_hours: parseInt(formData.get('session_duration_hours') as string) || 24,
                is_active: formData.get('is_active') === 'on',
              });
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label>Platform Name (slug) *</label>
                  <input type="text" name="platform_name" defaultValue={initialData.platform_name} required placeholder="google" />
                </FormGroup>
                <FormGroup>
                  <label>Display Name *</label>
                  <input type="text" name="display_name" defaultValue={initialData.display_name} required placeholder="Google" />
                </FormGroup>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label>Login URL *</label>
                  <input type="url" name="login_url" defaultValue={initialData.login_url} required placeholder="https://accounts.google.com" />
                </FormGroup>
                <FormGroup>
                  <label>Success URL Pattern</label>
                  <input type="text" name="success_url_pattern" defaultValue={initialData.success_url_pattern || ''} placeholder="myaccount.google.com" />
                </FormGroup>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label>Icon Name</label>
                  <input type="text" name="icon_name" defaultValue={initialData.icon_name || 'FaGlobe'} placeholder="FaGoogle" />
                </FormGroup>
                <FormGroup>
                  <label>Brand Color</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" name="brand_color" defaultValue={initialData.brand_color || '#8b5cf6'} style={{ width: '50px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                    <input type="text" defaultValue={initialData.brand_color || '#8b5cf6'} readOnly style={{ flex: 1 }} />
                  </div>
                </FormGroup>
                <FormGroup>
                  <label>Session Duration (hours)</label>
                  <input type="number" name="session_duration_hours" defaultValue={initialData.session_duration_hours || 24} min="1" />
                </FormGroup>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" name="supports_google_sso" defaultChecked={initialData.supports_google_sso} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                    Supports Google SSO
                  </label>
                </FormGroup>
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" name="requires_2fa" defaultChecked={initialData.requires_2fa} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                    Requires 2FA
                  </label>
                </FormGroup>
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" name="is_active" defaultChecked={initialData.is_active !== false} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                    Active
                  </label>
                </FormGroup>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px', color: '#8b5cf6' }}>Prompts (Markdown supported)</h4>
              </div>
              <FormGroup>
                <label>Login Prompt *</label>
                <textarea name="login_prompt" defaultValue={initialData.login_prompt} required rows={6} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }} placeholder="# Login Prompt&#10;Instructions for Claude to login..." />
              </FormGroup>
              <FormGroup>
                <label>Check Logged Prompt</label>
                <textarea name="check_logged_prompt" defaultValue={initialData.check_logged_prompt || ''} rows={4} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }} placeholder="# Check if already logged in..." />
              </FormGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label>2FA Phone Prompt</label>
                  <textarea name="twofa_phone_prompt" defaultValue={initialData.twofa_phone_prompt || ''} rows={3} style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }} placeholder="# 2FA phone approval..." />
                </FormGroup>
                <FormGroup>
                  <label>2FA Code Prompt</label>
                  <textarea name="twofa_code_prompt" defaultValue={initialData.twofa_code_prompt || ''} rows={3} style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    color: '#f3f4f6',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }} placeholder="# Enter 2FA code..." />
                </FormGroup>
              </div>
              <FormGroup>
                <label>Logout Prompt</label>
                <textarea name="logout_prompt" defaultValue={initialData.logout_prompt || ''} rows={3} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }} placeholder="# Logout instructions..." />
              </FormGroup>
            </form>
          </ProjectModalBody>
          <ModalFooter>
            <Button $variant="ghost" onClick={() => setPlatformModal(null)}>Cancel</Button>
            <Button $variant="primary" type="submit" form="platform-form">{isEdit ? 'Save Changes' : 'Create Platform'}</Button>
          </ModalFooter>
        </ProjectModalContent>
      </Modal>
    );
  };

  const renderLoginModal = () => {
    if (!loginModal) return null;

    const isEdit = loginModal.mode === 'edit';
    const initialData = loginModal.data || {
      projeto_id: projects[0]?.id || 117,
      platform_name: '',
      login_email: '',
      login_password: '',
      uses_google_sso: false,
      has_2fa: false,
      twofa_type: '',
      is_active: true,
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
    };

    return (
      <Modal onClick={() => setLoginModal(null)}>
        <ProjectModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <ProjectModalHeader>
            <h2>{isEdit ? 'Edit' : 'Add'} Login</h2>
            <button onClick={() => setLoginModal(null)}>×</button>
          </ProjectModalHeader>
          <ProjectModalBody>
            <form id="login-form" onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleSaveLogin({
                projeto_id: parseInt(formData.get('projeto_id') as string),
                platform_name: formData.get('platform_name') as string,
                login_email: formData.get('login_email') as string,
                login_password: formData.get('login_password') as string,
                uses_google_sso: formData.get('uses_google_sso') === 'on',
                has_2fa: formData.get('has_2fa') === 'on',
                twofa_type: formData.get('twofa_type') as string || null,
                is_active: formData.get('is_active') === 'on',
                timezone: formData.get('timezone') as string,
                locale: formData.get('locale') as string,
              });
            }}>
              <FormGroup>
                <label>Platform *</label>
                <select name="platform_name" defaultValue={initialData.platform_name || ''} required style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '14px'
                }}>
                  <option value="">Select platform...</option>
                  <option value="google">Google</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </FormGroup>
              <FormGroup>
                <label>Project *</label>
                <select name="projeto_id" defaultValue={initialData.projeto_id} required style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '14px'
                }}>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>#{p.id} - {p.name}</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup>
                <label>Email *</label>
                <input type="email" name="login_email" defaultValue={initialData.login_email || ''} required placeholder="user@example.com" />
              </FormGroup>
              <FormGroup>
                <label>Password</label>
                <input type="password" name="login_password" defaultValue={initialData.login_password || ''} placeholder="Leave empty for Google SSO" />
              </FormGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" name="uses_google_sso" defaultChecked={initialData.uses_google_sso} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                    Uses Google SSO
                  </label>
                </FormGroup>
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" name="has_2fa" defaultChecked={initialData.has_2fa} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                    Has 2FA
                  </label>
                </FormGroup>
              </div>
              <FormGroup>
                <label>2FA Type</label>
                <select name="twofa_type" defaultValue={initialData.twofa_type || ''} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#f3f4f6',
                  fontSize: '14px'
                }}>
                  <option value="">None</option>
                  <option value="totp">TOTP (Authenticator App)</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </FormGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup>
                  <label>Timezone</label>
                  <input type="text" name="timezone" defaultValue={initialData.timezone || 'America/Sao_Paulo'} />
                </FormGroup>
                <FormGroup>
                  <label>Locale</label>
                  <input type="text" name="locale" defaultValue={initialData.locale || 'pt-BR'} />
                </FormGroup>
              </div>
              <FormGroup>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" name="is_active" defaultChecked={initialData.is_active !== false} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} />
                  Active
                </label>
              </FormGroup>
            </form>
          </ProjectModalBody>
          <ModalFooter>
            <Button $variant="ghost" onClick={() => setLoginModal(null)}>Cancel</Button>
            <Button $variant="primary" type="submit" form="login-form">{isEdit ? 'Save Changes' : 'Create Login'}</Button>
          </ModalFooter>
        </ProjectModalContent>
      </Modal>
    );
  };

  // Render Delete Confirmation Modal
  const renderDeleteConfirmModal = () => {
    if (!deleteConfirm) return null;

    return (
      <Modal onClick={() => setDeleteConfirm(null)}>
        <ProjectModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <ProjectModalHeader>
            <h2 style={{ color: '#ef4444' }}>Confirm Delete</h2>
            <button onClick={() => setDeleteConfirm(null)}>×</button>
          </ProjectModalHeader>
          <ProjectModalBody>
            <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
              Are you sure you want to delete this {deleteConfirm.type}?
            </p>
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '16px'
            }}>
              <strong style={{ color: '#f3f4f6' }}>{deleteConfirm.name}</strong>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>ID: {deleteConfirm.id}</div>
            </div>
            <p style={{ color: '#ef4444', fontSize: '13px' }}>
              This action cannot be undone.
            </p>
          </ProjectModalBody>
          <ModalFooter>
            <Button $variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              $variant="primary"
              onClick={() => {
                if (deleteConfirm.type === 'login') {
                  handleDeleteLogin(deleteConfirm.id);
                } else if (deleteConfirm.type === 'platform') {
                  handleDeletePlatform(deleteConfirm.id);
                }
              }}
              style={{ backgroundColor: '#ef4444' }}
            >
              Delete
            </Button>
          </ModalFooter>
        </ProjectModalContent>
      </Modal>
    );
  };

  // Main render - Access control first
  if (!user) {
    return (
      <Container>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100vh',
          gap: '16px'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2 style={{ color: theme.colors.text.primary, margin: 0 }}>Authentication Required</h2>
          <p style={{ color: theme.colors.text.muted, margin: 0 }}>Please sign in to access the admin dashboard.</p>
        </div>
      </Container>
    );
  }

  // LOADING check must come FIRST
  if (loading) {
    return (
      <Container>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100vh',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(139, 92, 246, 0.2)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: theme.colors.text.muted, fontSize: '16px' }}>
            Loading admin dashboard...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100vh',
          gap: '16px'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          <h2 style={{ color: theme.colors.text.primary, margin: 0 }}>Access Denied</h2>
          <p style={{ color: theme.colors.text.muted, margin: 0, textAlign: 'center' }}>
            You don't have permission to access this area.<br/>
            Contact the administrator if you believe this is an error.
          </p>
          <p style={{ color: theme.colors.text.muted, fontSize: '12px', marginTop: '8px' }}>
            Logged in as: {user.email}
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {renderNav()}
      <Main>
        {renderHeader()}
        {currentView === 'overview' && renderOverview()}
        {currentView === 'subscriptions' && renderSubscriptions()}
        {currentView === 'payments' && renderPayments()}
        {currentView === 'waitlist' && renderWaitlist()}
        {currentView === 'project-detail' && renderProjectDetail()}
        {currentView === 'users' && (
          <Content>
            <PageHeader>
              <h1>Users</h1>
              <p>All registered users</p>
            </PageHeader>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Projects</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <UserCell>
                          {u.avatar_url ? (
                            <img 
                              src={u.avatar_url} 
                              alt={u.full_name || u.email}
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <Avatar>{u.email[0].toUpperCase()}</Avatar>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {u.full_name && <span style={{ fontWeight: 500 }}>{u.full_name}</span>}
                            <span style={{ opacity: u.full_name ? 0.7 : 1, fontSize: u.full_name ? '12px' : 'inherit' }}>{u.email}</span>
                          </div>
                        </UserCell>
                      </td>
                      <td>{u.projects_count}</td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>{formatRelativeTime(u.last_sign_in_at)}</td>
                      <td>
                        <Button $variant="ghost" onClick={() => handleSelectUser(u)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'projects' && (
          <Content>
            <PageHeader>
              <h1>Projects</h1>
              <p>All projects across users</p>
            </PageHeader>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td>
                        <UserCell>
                          <Avatar $color="#a855f7">{p.name[0].toUpperCase()}</Avatar>
                          {p.name}
                        </UserCell>
                      </td>
                      <td>{p.user_email}</td>
                      <td>
                        <StatusBadge $status={p.status >= 1 ? 'active' : 'inactive'}>
                          {p.status >= 1 ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td>{formatDate(p.created_at)}</td>
                      <td>
                        <ActionMenuWrapper>
                          <ActionMenuButton onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === p.id ? null : p.id); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </ActionMenuButton>
                          <ActionMenuDropdown $open={openActionMenu === p.id}>
                            <ActionMenuItem onClick={() => handleViewProjectDetails(p.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              View Details
                            </ActionMenuItem>
                            <ActionMenuItem onClick={() => handleSelectProject(p)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              Manage Project
                            </ActionMenuItem>
                            <ActionMenuDivider />
                            <ActionMenuItem onClick={() => handleToggleProjectStatus(p.id, p.status >= 1)}>
                              {p.status >= 1 ? (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                                  Activate
                                </>
                              )}
                            </ActionMenuItem>
                          </ActionMenuDropdown>
                        </ActionMenuWrapper>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'user-detail' && selectedUser && (
          <Content>
            <Breadcrumb>
              <a onClick={() => setCurrentView('overview')}>Overview</a>
              <span>›</span>
              <a onClick={() => setCurrentView('users')}>Users</a>
              <span>›</span>
              <span>{selectedUser.email}</span>
            </Breadcrumb>
            <DetailHeader>
              <div className="left">
                <h1>{selectedUser.email}</h1>
                <p>Joined {formatDate(selectedUser.created_at)}</p>
              </div>
            </DetailHeader>
            <Card>
              <CardHeader>
                <h3>User Projects</h3>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.filter(p => p.user_id === selectedUser.id).map(p => (
                    <tr key={p.id}>
                      <td>
                        <UserCell>
                          <Avatar $color="#a855f7">{p.name[0].toUpperCase()}</Avatar>
                          {p.name}
                        </UserCell>
                      </td>
                      <td>
                        <StatusBadge $status={p.status >= 1 ? 'active' : 'inactive'}>
                          {p.status >= 1 ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td>{formatDate(p.created_at)}</td>
                      <td>
                        <ActionMenuWrapper>
                          <ActionMenuButton onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === p.id ? null : p.id); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </ActionMenuButton>
                          <ActionMenuDropdown $open={openActionMenu === p.id}>
                            <ActionMenuItem onClick={() => handleViewProjectDetails(p.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              View Details
                            </ActionMenuItem>
                            <ActionMenuItem onClick={() => handleSelectProject(p)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              Manage Project
                            </ActionMenuItem>
                            <ActionMenuDivider />
                            <ActionMenuItem onClick={() => handleToggleProjectStatus(p.id, p.status >= 1)}>
                              {p.status >= 1 ? (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                                  Activate
                                </>
                              )}
                            </ActionMenuItem>
                          </ActionMenuDropdown>
                        </ActionMenuWrapper>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'containers' && (
          <Content>
            <PageHeader>
              <h1>Browser Containers</h1>
              <p>Docker containers running browser automation • Click "View Browser" to debug</p>
            </PageHeader>

            {/* Admin Browser Viewer */}
            {selectedViewerContainer && (
              <Card style={{ marginBottom: '24px', border: '2px solid #8b5cf6' }}>
                <CardHeader style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🖥️</span>
                    <div>
                      <h3 style={{ margin: 0 }}>Browser Viewer - {selectedViewerContainer.project_name || `Project #${selectedViewerContainer.project_id}`}</h3>
                      <span style={{ fontSize: '12px', color: theme.colors.text.muted }}>
                        Container: {selectedViewerContainer.container_name} • Status: {selectedViewerContainer.status}
                      </span>
                    </div>
                  </div>
                  <Button $variant="ghost" onClick={() => setSelectedViewerContainer(null)} style={{ color: '#ef4444' }}>
                    ✕ Close
                  </Button>
                </CardHeader>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '16px', padding: '16px' }}>
                  {/* VNC Viewer */}
                  <div>
                    <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Live Browser View (VNC)</span>
                      <Button
                        $variant="ghost"
                        onClick={() => { const url = getAdminVncUrl(selectedViewerContainer.vnc_url); if (url) window.open(url, '_blank'); }}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Open in New Tab ↗
                      </Button>
                    </div>
                    {getAdminVncUrl(selectedViewerContainer.vnc_url) ? (
                      <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                        <iframe
                          src={getAdminVncUrl(selectedViewerContainer.vnc_url) || ''}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: '8px',
                            background: '#1a1a2e'
                          }}
                          tabIndex={-1}
                          title={`VNC Viewer - Project ${selectedViewerContainer.project_id}`}
                        />
                        {isTaskInputFocused && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'transparent',
                            zIndex: 10
                          }} />
                        )}
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '500px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme.colors.bg.secondary,
                        borderRadius: '8px',
                        color: theme.colors.text.muted
                      }}>
                        No VNC URL configured for this container
                      </div>
                    )}
                  </div>

                  {/* Task Panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Send Task */}
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginBottom: '8px' }}>
                        Send Task to Agent
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={adminTaskInput}
                          onChange={(e) => setAdminTaskInput(e.target.value)}
                          onFocus={() => setIsTaskInputFocused(true)}
                          onBlur={() => setIsTaskInputFocused(false)}
                          placeholder="Enter task for the browser agent..."
                          style={{
                            width: '100%',
                            height: '80px',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `1px solid ${theme.colors.border}`,
                            background: theme.colors.bg.secondary,
                            color: theme.colors.text.primary,
                            fontSize: '13px',
                            resize: 'none'
                          }}
                        />
                        <Button
                          $variant="primary"
                          onClick={sendAdminTask}
                          disabled={!adminTaskInput.trim() || adminTaskSending}
                          style={{ width: '100%' }}
                        >
                          {adminTaskSending ? 'Sending...' : '▶ Send Task'}
                        </Button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginBottom: '8px' }}>
                        Quick Actions
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <Button $variant="ghost" onClick={() => setAdminTaskInput('Take a screenshot')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          📸 Screenshot
                        </Button>
                        <Button $variant="ghost" onClick={() => setAdminTaskInput('Go to google.com')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          🌐 Google
                        </Button>
                        <Button $variant="ghost" onClick={() => setAdminTaskInput('Scroll down the page')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          ⬇️ Scroll
                        </Button>
                        <Button $variant="ghost" onClick={() => setAdminTaskInput('Click on the first result')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          👆 Click
                        </Button>
                      </div>
                    </div>

                    {/* Recent Tasks */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Recent Tasks ({viewerProjectTasks.length})</span>
                        {loadingViewerTasks && <span style={{ fontSize: '10px' }}>Loading...</span>}
                      </div>
                      <div style={{
                        maxHeight: '250px',
                        overflowY: 'auto',
                        background: theme.colors.bg.secondary,
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {viewerProjectTasks.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px', color: theme.colors.text.muted, fontSize: '12px' }}>
                            No tasks for this project
                          </div>
                        ) : (
                          viewerProjectTasks.map(task => (
                            <div
                              key={task.id}
                              style={{
                                padding: '8px',
                                borderBottom: `1px solid ${theme.colors.border}`,
                                fontSize: '11px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <StatusBadge $status={task.status} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {task.status}
                                </StatusBadge>
                                <span style={{ color: theme.colors.text.muted }}>{formatRelativeTime(task.created_at)}</span>
                              </div>
                              <div style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: theme.colors.text.secondary
                              }}>
                                {task.task}
                              </div>
                              {task.error_message && (
                                <div style={{ marginTop: '4px', color: '#ef4444', fontSize: '10px' }}>
                                  Error: {task.error_message.substring(0, 50)}...
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Containers Table */}
            <Card>
              <CardHeader>
                <h3>All Containers ({containers.length})</h3>
                {selectedViewerContainer && (
                  <span style={{ fontSize: '12px', color: '#8b5cf6' }}>
                    Viewing: {selectedViewerContainer.project_name || `Project #${selectedViewerContainer.project_id}`}
                  </span>
                )}
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Container</th>
                    <th>Status</th>
                    <th>MCP URL</th>
                    <th>VNC URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map(c => (
                    <tr
                      key={c.id}
                      style={{
                        background: selectedViewerContainer?.id === c.id ? 'rgba(139, 92, 246, 0.1)' : undefined,
                        cursor: 'pointer'
                      }}
                      onClick={() => handleViewContainer(c)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar $color="#8b5cf6">{c.project_name?.[0]?.toUpperCase() || '#'}</Avatar>
                          <div>
                            <div style={{ fontWeight: 500 }}>{c.project_name || `Project #${c.project_id}`}</div>
                            <div style={{ fontSize: '11px', color: theme.colors.text.muted }}>ID: {c.project_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.container_name || 'N/A'}</td>
                      <td>
                        <StatusBadge $status={c.status === 'active' || c.status === 'running' ? 'active' : c.status}>
                          {c.status || 'inactive'}
                        </StatusBadge>
                      </td>
                      <td>
                        {c.mcp_url ? (
                          <a
                            href={`http://${c.mcp_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#8b5cf6', fontSize: '12px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.mcp_url}
                          </a>
                        ) : (
                          <span style={{ color: theme.colors.text.muted, fontSize: '12px' }}>Not configured</span>
                        )}
                      </td>
                      <td>
                        {c.vnc_url ? (
                          <span style={{ fontSize: '12px', color: theme.colors.text.secondary }}>{c.vnc_url}</span>
                        ) : (
                          <span style={{ color: theme.colors.text.muted, fontSize: '12px' }}>Not configured</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            $variant={selectedViewerContainer?.id === c.id ? "primary" : "ghost"}
                            onClick={(e) => { e.stopPropagation(); handleViewContainer(c); }}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            {selectedViewerContainer?.id === c.id ? '✓ Viewing' : '👁️ View'}
                          </Button>
                          {c.vnc_url && (
                            <Button
                              $variant="ghost"
                              onClick={(e) => { e.stopPropagation(); const url = getAdminVncUrl(c.vnc_url); if (url) window.open(url, '_blank'); }}
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              ↗ VNC
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {containers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: theme.colors.text.muted }}>
                        No containers found. Containers are created when users access the Browser page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'tasks' && (
          <Content>
            <PageHeader>
              <div>
                <h1>Browser Tasks</h1>
                <p>All automation tasks • <span style={{ color: '#10b981' }}>● Live</span></p>
              </div>
            </PageHeader>

            <KPIGrid>
              <KPICard>
                <div className="label">Total Tasks</div>
                <div className="value">{tasksTotal}</div>
              </KPICard>
              <KPICard>
                <div className="label">Pending</div>
                <div className="value" style={{ color: '#f59e0b' }}>{tasks.filter(t => t.status === 'pending').length}</div>
              </KPICard>
              <KPICard>
                <div className="label">Running</div>
                <div className="value" style={{ color: '#3b82f6' }}>{tasks.filter(t => t.status === 'running' || t.status === 'in_progress').length}</div>
              </KPICard>
              <KPICard>
                <div className="label">Completed</div>
                <div className="value green">{tasks.filter(t => t.status === 'completed').length}</div>
              </KPICard>
              <KPICard>
                <div className="label">Failed</div>
                <div className="value red">{tasks.filter(t => t.status === 'failed' || t.status === 'error').length}</div>
              </KPICard>
            </KPIGrid>

            {/* Filters */}
            <Card style={{ marginBottom: '16px' }}>
              <CardHeader>
                <h3>Filters</h3>
                {(tasksFilterProject !== null || tasksFilterUser) && (
                  <Button
                    $variant="ghost"
                    onClick={() => {
                      setTasksFilterProject(null);
                      setTasksFilterUser(null);
                      setTasksPage(1);
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardHeader>
              <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: theme.colors.text.muted }}>Project ID</label>
                  <select
                    value={tasksFilterProject ?? ''}
                    onChange={(e) => {
                      setTasksFilterProject(e.target.value ? Number(e.target.value) : null);
                      setTasksPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.bg.secondary,
                      color: theme.colors.text.primary,
                      fontSize: '13px',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">All Projects</option>
                    {uniqueProjectIds.map(id => (
                      <option key={id} value={id}>#{id}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: theme.colors.text.muted }}>Created By</label>
                  <select
                    value={tasksFilterUser ?? ''}
                    onChange={(e) => {
                      setTasksFilterUser(e.target.value || null);
                      setTasksPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.bg.secondary,
                      color: theme.colors.text.primary,
                      fontSize: '13px',
                      minWidth: '150px'
                    }}
                  >
                    <option value="">All Users</option>
                    {uniqueTaskUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: theme.colors.text.muted }}>Rows per page</label>
                  <select
                    value={tasksRowsPerPage}
                    onChange={(e) => {
                      setTasksRowsPerPage(Number(e.target.value));
                      setTasksPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.bg.secondary,
                      color: theme.colors.text.primary,
                      fontSize: '13px',
                      minWidth: '80px'
                    }}
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h3>All Tasks {tasksLoading && <span style={{ fontSize: '12px', color: theme.colors.text.muted }}>(Loading...)</span>}</h3>
                <span style={{ fontSize: '12px', color: theme.colors.text.muted }}>
                  Showing {((tasksPage - 1) * tasksRowsPerPage) + 1}-{Math.min(tasksPage * tasksRowsPerPage, tasksTotal)} of {tasksTotal}
                </span>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Type</th>
                    <th>Task</th>
                    <th>Iterations</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Deleted</th>
                    <th style={{ width: '60px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => {
                    const isExpanded = expandedTasks.includes(t.id);
                    const duration = t.started_at && t.completed_at
                      ? Math.round((new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000)
                      : t.started_at
                        ? Math.round((Date.now() - new Date(t.started_at).getTime()) / 1000)
                        : null;

                    return (
                      <React.Fragment key={t.id}>
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedTasks(prev =>
                            prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                          )}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}>
                              ▶
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatTaskDate(t)}</td>
                          <td>#{t.project_id}</td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              color: '#8b5cf6'
                            }}>
                              {t.task_type || 'general'}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.task}
                          </td>
                          <td style={{ textAlign: 'center' }}>{t.iterations_used || '-'}</td>
                          <td style={{ fontSize: '12px', color: theme.colors.text.muted }}>
                            {duration !== null ? `${duration}s` : '-'}
                          </td>
                          <td>
                            <StatusBadge $status={t.status}>{t.status}</StatusBadge>
                          </td>
                          <td>
                            {t.deleted_at ? (
                              <span style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444'
                              }}>
                                🗑️ {formatRelativeTime(t.deleted_at)}
                              </span>
                            ) : (
                              <span style={{ color: theme.colors.text.muted }}>-</span>
                            )}
                          </td>
                          <td>
                            <Button
                              $variant="ghost"
                              onClick={(e) => deleteTask(t.id, e)}
                              style={{ padding: '4px 8px', color: t.deleted_at ? theme.colors.text.muted : '#ef4444' }}
                              title={t.deleted_at ? 'Already deleted' : 'Delete task'}
                              disabled={!!t.deleted_at}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} style={{ padding: 0, background: theme.colors.bg.primary }}>
                              <div style={{ padding: '16px 24px', borderLeft: '3px solid #8b5cf6' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Task ID</div>
                                    <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>{t.id}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Container Port</div>
                                    <div style={{ fontSize: '12px' }}>{t.container_port || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Started At</div>
                                    <div style={{ fontSize: '12px' }}>{t.started_at ? formatDate(t.started_at) : 'Not started'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Completed At</div>
                                    <div style={{ fontSize: '12px' }}>{t.completed_at ? formatDate(t.completed_at) : 'Not completed'}</div>
                                  </div>
                                </div>

                                {t.error_message && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>Error Message</div>
                                    <div style={{
                                      fontSize: '12px',
                                      padding: '8px',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      borderRadius: '4px',
                                      color: '#ef4444',
                                      fontFamily: 'monospace',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word'
                                    }}>
                                      {t.error_message}
                                    </div>
                                  </div>
                                )}

                                {t.response && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Response</div>
                                    <div style={{
                                      fontSize: '11px',
                                      padding: '8px',
                                      background: theme.colors.bg.secondary,
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                      maxHeight: '200px',
                                      overflow: 'auto',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word'
                                    }}>
                                      {JSON.stringify(t.response, null, 2)}
                                    </div>
                                  </div>
                                )}

                                {t.actions_taken && t.actions_taken.length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>
                                      Actions Taken ({t.actions_taken.length})
                                    </div>
                                    <div style={{
                                      fontSize: '11px',
                                      padding: '8px',
                                      background: theme.colors.bg.secondary,
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                      maxHeight: '150px',
                                      overflow: 'auto',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {JSON.stringify(t.actions_taken, null, 2)}
                                    </div>
                                  </div>
                                )}

                                {t.metadata && (
                                  <div>
                                    <div style={{ fontSize: '11px', color: theme.colors.text.muted, marginBottom: '4px' }}>Metadata</div>
                                    <div style={{
                                      fontSize: '11px',
                                      padding: '8px',
                                      background: theme.colors.bg.secondary,
                                      borderRadius: '4px',
                                      fontFamily: 'monospace',
                                      maxHeight: '100px',
                                      overflow: 'auto',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {JSON.stringify(t.metadata, null, 2)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: theme.colors.text.muted }}>
                        No tasks yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {/* Pagination Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderTop: `1px solid ${theme.colors.border}`
              }}>
                <span style={{ fontSize: '13px', color: theme.colors.text.muted }}>
                  Page {tasksPage} of {Math.ceil(tasksTotal / tasksRowsPerPage) || 1}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    $variant="ghost"
                    onClick={() => setTasksPage(prev => Math.max(1, prev - 1))}
                    disabled={tasksPage <= 1}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    $variant="ghost"
                    onClick={() => setTasksPage(prev => prev + 1)}
                    disabled={tasksPage >= Math.ceil(tasksTotal / tasksRowsPerPage)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </Card>
          </Content>
        )}
        {currentView === 'logins' && (
          <Content>
            <PageHeader>
              <div>
                <h1>Browser Platforms</h1>
                <p>Global platform configurations and login prompts</p>
              </div>
              <Button $variant="primary" onClick={() => setPlatformModal({ mode: 'create' })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Platform
              </Button>
            </PageHeader>
            <Card style={{ overflow: 'visible' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Login URL</th>
                    <th>Google SSO</th>
                    <th>2FA</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th style={{ width: '50px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platformPrompts.map((p, index) => (
                    <tr key={p.id}>
                      <td>
                        <UserCell>
                          <Avatar $color={p.brand_color || '#8b5cf6'}>
                            {p.display_name[0].toUpperCase()}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.display_name}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{p.platform_name}</div>
                          </div>
                        </UserCell>
                      </td>
                      <td style={{ fontSize: '12px', color: '#9ca3af', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.login_url}
                      </td>
                      <td>
                        <StatusBadge $status={p.supports_google_sso ? 'active' : 'inactive'}>
                          {p.supports_google_sso ? 'Yes' : 'No'}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge $status={p.requires_2fa ? 'pending' : 'inactive'}>
                          {p.requires_2fa ? 'Required' : 'No'}
                        </StatusBadge>
                      </td>
                      <td>{p.session_duration_hours}h</td>
                      <td>
                        <StatusBadge $status={p.is_active ? 'active' : 'inactive'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td>
                        <ActionMenuWrapper>
                          <ActionMenuButton onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === p.id ? null : p.id); }}>
                            ⋮
                          </ActionMenuButton>
                          <ActionMenuDropdown $open={openActionMenu === p.id} $openUp={index >= platformPrompts.length - 2}>
                            <ActionMenuItem onClick={() => { setPlatformModal({ mode: 'edit', data: p }); setOpenActionMenu(null); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </ActionMenuItem>
                            <ActionMenuDivider />
                            <ActionMenuItem $danger onClick={() => { setDeleteConfirm({ type: 'platform', id: p.id, name: p.display_name }); setOpenActionMenu(null); }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </ActionMenuItem>
                          </ActionMenuDropdown>
                        </ActionMenuWrapper>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'analytics' && (
          <Content>
            <PageHeader>
              <h1>Site Analytics</h1>
              <p>Traffic and visitor data from track.liftlio.com</p>
            </PageHeader>

            <KPIGrid>
              <KPICard>
                <div className="label">Visits Today</div>
                <div className="value">{stats.visitsToday}</div>
                <div className="change">Daily visitors</div>
              </KPICard>
              <KPICard>
                <div className="label">This Week</div>
                <div className="value">{stats.visitsWeek}</div>
                <div className="change">Last 7 days</div>
              </KPICard>
              <KPICard>
                <div className="label">This Month</div>
                <div className="value">{stats.visitsMonth}</div>
                <div className="change">Last 30 days</div>
              </KPICard>
              <KPICard>
                <div className="label">Simulations Today</div>
                <div className="value purple">{stats.simulationsToday}</div>
                <div className="change">{stats.simulationsCount} total</div>
              </KPICard>
            </KPIGrid>


            {/* Online Now - Real-time */}
            <Card style={{ marginBottom: '24px' }}>
              <CardHeader>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></span>
                  Online Now
                </h3>
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>{onlineVisitors.length} visitor{onlineVisitors.length !== 1 ? 's' : ''}</span>
              </CardHeader>
              <div style={{ padding: '16px 20px' }}>
                {onlineVisitors.length === 0 ? (
                  <div style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    No active visitors right now
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {onlineVisitors.slice(0, 10).map((v, i) => (
                      <div key={v.visitor_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#1f2937', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.seconds_ago < 10 ? '#22c55e' : '#eab308' }}></span>
                          <div>
                            <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>
                              {v.current_page === '/' ? 'Home' : v.current_page}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '11px' }}>
                              {v.country}{v.city && v.city !== 'Unknown' ? `, ${v.city}` : ''} • {v.device_type} • {v.browser}
                            </div>
                          </div>
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {v.seconds_ago < 5 ? 'now' : `${v.seconds_ago}s ago`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h3>Daily Visits (Last 30 Days)</h3>
                {analyticsData.length > 0 && (
                  <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 400 }}>
                    Total: {analyticsData.reduce((sum, d) => sum + d.views, 0)} pageviews
                  </span>
                )}
              </CardHeader>
              <div style={{ padding: '20px 20px 12px 20px' }}>
                {analyticsData.length > 0 ? (() => {
                  const maxViews = Math.max(...analyticsData.map(d => d.views), 1);
                  const chartWidth = 800;
                  const chartHeight = 200;
                  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
                  const innerWidth = chartWidth - padding.left - padding.right;
                  const innerHeight = chartHeight - padding.top - padding.bottom;
                  const xStep = innerWidth / (analyticsData.length - 1 || 1);

                  const points = analyticsData.map((d, i) => ({
                    x: padding.left + (i * xStep),
                    y: padding.top + innerHeight - ((d.views / maxViews) * innerHeight),
                    views: d.views,
                    date: d.timestamp
                  }));

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

                  const formatDate = (dateStr: string) => {
                    const d = new Date(dateStr);
                    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  };

                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <svg width={chartWidth} height={chartHeight} style={{ display: 'block', minWidth: chartWidth }}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                          <g key={i}>
                            <line
                              x1={padding.left}
                              y1={padding.top + innerHeight * (1 - ratio)}
                              x2={chartWidth - padding.right}
                              y2={padding.top + innerHeight * (1 - ratio)}
                              stroke="#374151"
                              strokeDasharray="4,4"
                              strokeWidth="1"
                            />
                            <text
                              x={padding.left - 10}
                              y={padding.top + innerHeight * (1 - ratio) + 4}
                              fill="#6b7280"
                              fontSize="11"
                              textAnchor="end"
                            >
                              {Math.round(maxViews * ratio)}
                            </text>
                          </g>
                        ))}

                        <path d={areaPath} fill="url(#areaGradient)" />
                        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                        {points.map((p, i) => (
                          <g key={i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              fill="#1f2937"
                              stroke="#8b5cf6"
                              strokeWidth="2"
                              style={{ cursor: 'pointer' }}
                            >
                              <title>{`${formatDate(p.date)}: ${p.views} views`}</title>
                            </circle>
                            {p.views > 0 && analyticsData.length <= 15 && (
                              <text
                                x={p.x}
                                y={p.y - 10}
                                fill="#9ca3af"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                {p.views}
                              </text>
                            )}
                          </g>
                        ))}

                        {points.filter((_, i) => i % Math.ceil(analyticsData.length / 7) === 0 || i === analyticsData.length - 1).map((p, i) => (
                          <text
                            key={i}
                            x={p.x}
                            y={chartHeight - 8}
                            fill="#6b7280"
                            fontSize="11"
                            textAnchor="middle"
                          >
                            {formatDate(p.date)}
                          </text>
                        ))}
                      </svg>
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                    No analytics data available for the last 30 days
                  </div>
                )}
              </div>
            </Card>

            <Grid>
              <Card>
                <CardHeader>
                  <h3>Traffic Sources</h3>
                </CardHeader>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>Direct</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{Math.round(stats.visitsMonth * 0.6)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>Google</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{Math.round(stats.visitsMonth * 0.25)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>Social</span>
                      <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{Math.round(stats.visitsMonth * 0.15)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <h3>Top Pages</h3>
                </CardHeader>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>/</span>
                      <span style={{ color: '#9ca3af' }}>Home</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>/pricing</span>
                      <span style={{ color: '#9ca3af' }}>Pricing</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e5e7eb' }}>/overview</span>
                      <span style={{ color: '#9ca3af' }}>Dashboard</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Grid>
<Grid>
              <Card>
                <CardHeader>
                  <h3>Top Countries</h3>
                </CardHeader>
                <div style={{ padding: '20px' }}>
                  {stats.topCountries && stats.topCountries.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {stats.topCountries.map((item: {country: string; visits: number}, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#e5e7eb' }}>{item.country}</span>
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{item.visits}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9ca3af', textAlign: 'center' }}>No data yet</div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <h3>Top Cities</h3>
                </CardHeader>
                <div style={{ padding: '20px' }}>
                  {stats.topCities && stats.topCities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {stats.topCities.map((item: {city: string; country: string; visits: number}, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#e5e7eb' }}>{item.city}, {item.country}</span>
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{item.visits}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9ca3af', textAlign: 'center' }}>No data yet</div>
                  )}
                </div>
              </Card>
            </Grid>
          </Content>
        )}
        {currentView === 'simulations' && (
          <Content>
            <PageHeader>
              <h1>Landing Page Simulations</h1>
              <p>Review simulations generated by visitors on the landing page</p>
            </PageHeader>

            <KPIGrid>
              <KPICard>
                <div className="label">Total Simulations</div>
                <div className="value purple">{stats.simulationsToday}</div>
                <div className="change">All time</div>
              </KPICard>
              <KPICard>
                <div className="label">Today</div>
                <div className="value">{stats.simulationsToday}</div>
                <div className="change">New simulations</div>
              </KPICard>
              <KPICard>
                <div className="label">Unique IPs</div>
                <div className="value">{new Set(simulations.map(s => s.ip_address).filter(Boolean)).size}</div>
                <div className="change">Distinct visitors</div>
              </KPICard>
              <KPICard>
                <div className="label">URLs Analyzed</div>
                <div className="value">{new Set(simulations.map(s => s.url_analyzed).filter(Boolean)).size}</div>
                <div className="change">Different sites</div>
              </KPICard>
              <KPICard>
                <div className="label">With Simulation</div>
                <div className="value green">{simulations.filter(s => s.simulation_response?.message).length}</div>
                <div className="change">Complete data</div>
              </KPICard>
              <KPICard>
                <div className="label">PT / EN</div>
                <div className="value">
                  {simulations.filter(s => s.simulation_language === 'pt').length} / {simulations.filter(s => s.simulation_language === 'en').length}
                </div>
                <div className="change">Language split</div>
              </KPICard>
            </KPIGrid>

            {simulations.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <Icons.Search />
                  <p style={{ marginTop: '16px' }}>No URL analyses recorded yet.</p>
                  <p style={{ fontSize: '14px' }}>URL analyses will appear here after visitors use the landing page URL analyzer.</p>
                </div>
              </Card>
            ) : (
              <Card>
                <Table>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>ID</th>
                      <th>Product</th>
                      <th>URL Analyzed</th>
                      <th>Lang</th>
                      <th>Lead Comment</th>
                      <th>Response</th>
                      <th>IP</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulations.slice(0, simulationsDisplayCount).map((sim) => (
                      <React.Fragment key={sim.id}>
                        <tr
                          onClick={() => setExpandedSimulationId(expandedSimulationId === sim.id ? null : sim.id)}
                          style={{ cursor: sim.simulation_response?.message ? 'pointer' : 'default' }}
                        >
                          <td style={{ textAlign: 'center', color: '#9ca3af', width: '30px' }}>
                            {sim.simulation_response?.message ? (
                              <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expandedSimulationId === sim.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            ) : null}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{sim.id}</td>
                          <td style={{ fontSize: '12px' }}>
                            {sim.product_info?.name ? (
                              <div>
                                <div style={{ fontWeight: 500, color: '#8b5cf6' }}>{sim.product_info.name}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af' }}>{sim.product_info.topic}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sim.url_analyzed ? (
                              <a href={sim.url_analyzed.startsWith('http') ? sim.url_analyzed : `https://${sim.url_analyzed}`} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: '12px' }} onClick={(e) => e.stopPropagation()}>
                                {sim.url_analyzed.replace(/^https?:\/\//, '').substring(0, 30)}...
                              </a>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', textAlign: 'center' }}>
                            {sim.simulation_language === 'pt' ? '🇧🇷' : sim.simulation_language === 'en' ? '🇺🇸' : '-'}
                          </td>
                          <td style={{ maxWidth: '200px', fontSize: '11px' }}>
                            {sim.simulation_comment?.text ? (
                              <div title={sim.simulation_comment.text}>
                                <div style={{ color: '#9ca3af', fontSize: '10px' }}>{sim.simulation_comment.author}</div>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sim.simulation_comment.text.substring(0, 50)}...
                                </div>
                                <div style={{ fontSize: '10px', color: '#8b5cf6' }}>Score: {sim.simulation_comment.lead_score}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '200px', fontSize: '11px' }}>
                            {sim.simulation_response?.message ? (
                              <div title={sim.simulation_response.message} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sim.simulation_response.message.substring(0, 50)}...
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }}>{sim.ip_address}</td>
                          <td style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {new Date(sim.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                        {expandedSimulationId === sim.id && sim.simulation_response?.message && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0, background: 'rgba(139, 92, 246, 0.05)' }}>
                              <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                {/* Video Info */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>📺 Video</div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{sim.simulation_video?.title || 'N/A'}</div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Channel: {sim.simulation_video?.channel || 'N/A'}</div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Views: {sim.simulation_video?.views?.toLocaleString() || 'N/A'} · Comments: {sim.simulation_video?.comments || 'N/A'}</div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Category: {sim.simulation_video?.category || 'N/A'}</div>
                                </div>
                                {/* Lead Comment */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>💬 Lead Comment</div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>@{sim.simulation_comment?.author || 'N/A'}</div>
                                  <div style={{ fontSize: '13px', marginBottom: '8px', lineHeight: '1.4' }}>{sim.simulation_comment?.text || 'N/A'}</div>
                                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                    <span style={{ color: '#8b5cf6' }}>Score: {sim.simulation_comment?.lead_score || 'N/A'}</span>
                                    <span style={{ color: '#9ca3af' }}>Sentiment: {sim.simulation_comment?.sentiment || 'N/A'}</span>
                                  </div>
                                </div>
                                {/* Liftlio Response */}
                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                  <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>✨ Liftlio Response</div>
                                  <div style={{ fontSize: '13px', marginBottom: '8px', lineHeight: '1.4' }}>{sim.simulation_response?.message || 'N/A'}</div>
                                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                    <span style={{ color: '#22c55e' }}>Sentiment: {sim.simulation_response?.sentiment_score || 'N/A'}</span>
                                    <span style={{ color: '#8b5cf6' }}>Relevance: {sim.simulation_response?.relevance_score || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
                {/* Show More Button */}
                {simulations.length > simulationsDisplayCount && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <button
                      onClick={() => setSimulationsDisplayCount(prev => prev + 25)}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                      }}
                    >
                      Show More ({simulationsDisplayCount} of {simulations.length})
                    </button>
                  </div>
                )}
              </Card>
            )}
          </Content>
        )}
        {currentView === 'health' && (
          <Content>
            <PageHeader>
              <h1>System Health</h1>
              <p>Infrastructure status and monitoring {healthStatus.lastCheck && <span style={{ fontSize: '12px', color: '#9ca3af' }}>· Last check: {healthStatus.lastCheck.toLocaleTimeString()}</span>}</p>
            </PageHeader>
            {!healthStatus.lastCheck ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: '16px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(139, 92, 246, 0.2)',
                  borderTopColor: '#8b5cf6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Running health checks...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <HealthGrid>
                <HealthCard $status={healthStatus.supabaseDb}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Supabase Database</div>
                    <div className="detail">PostgreSQL · {healthStatus.supabaseDb === 'ok' ? 'Operational' : healthStatus.supabaseDb === 'checking' ? 'Checking...' : 'Error'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.supabaseAuth}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Supabase Auth</div>
                    <div className="detail">Google OAuth · {healthStatus.supabaseAuth === 'ok' ? 'Working' : healthStatus.supabaseAuth === 'checking' ? 'Checking...' : 'Error'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.flyioFrontend}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Fly.io Frontend</div>
                    <div className="detail">liftlio.com · Online</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.vpsBrowser}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">VPS Browser Agent</div>
                    <div className="detail">173.249.22.2 · {healthStatus.vpsBrowser === 'ok' ? 'Running' : healthStatus.vpsBrowser === 'checking' ? 'Checking...' : healthStatus.vpsBrowser === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.dockerContainers}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Docker Containers</div>
                    <div className="detail">{stats.activeContainers} running</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.analyticsServer}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Analytics Server</div>
                    <div className="detail">track.liftlio.com · {healthStatus.analyticsServer === 'ok' ? 'OK' : healthStatus.analyticsServer === 'checking' ? 'Checking...' : healthStatus.analyticsServer === 'unknown' ? 'Unknown (CORS)' : 'Error'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.edgeFunctions}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Edge Functions</div>
                    <div className="detail">{healthStatus.edgeFunctions === 'ok' ? '26 functions · OK' : healthStatus.edgeFunctions === 'checking' ? 'Checking...' : 'Error'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.orchestrator}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Browser Orchestrator</div>
                    <div className="detail">:8080 · {healthStatus.orchestrator === 'ok' ? 'Running' : healthStatus.orchestrator === 'checking' ? 'Checking...' : healthStatus.orchestrator === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.videoQualifier}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Video Qualifier</div>
                    <div className="detail">:8001 · {healthStatus.videoQualifier === 'ok' ? 'Running' : healthStatus.videoQualifier === 'checking' ? 'Checking...' : healthStatus.videoQualifier === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.transcricao}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Transcricao Service</div>
                    <div className="detail">:8081 · {healthStatus.transcricao === 'ok' ? 'Running' : healthStatus.transcricao === 'checking' ? 'Checking...' : healthStatus.transcricao === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.youtubeSearch}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">YouTube Transcription</div>
                    <div className="detail">transcricao.liftlio.com · {healthStatus.youtubeSearch === 'ok' ? 'Running' : healthStatus.youtubeSearch === 'checking' ? 'Checking...' : healthStatus.youtubeSearch === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.mcpGmail}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">MCP Gmail</div>
                    <div className="detail">:3000 · {healthStatus.mcpGmail === 'ok' ? 'Running' : healthStatus.mcpGmail === 'checking' ? 'Checking...' : healthStatus.mcpGmail === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.tokenRefresher}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Token Refresher</div>
                    <div className="detail">Internal · {healthStatus.tokenRefresher === 'ok' ? 'Running' : healthStatus.tokenRefresher === 'checking' ? 'Checking...' : healthStatus.tokenRefresher === 'unknown' ? 'Unknown' : 'Offline'}</div>
                  </div>
                </HealthCard>
                <HealthCard $status={healthStatus.claudeApi}>
                  <div className="indicator" />
                  <div className="info">
                    <div className="name">Claude API (Max)</div>
                    <div className="detail">:10200 · {healthStatus.claudeApi === 'ok' ? 'Running' : healthStatus.claudeApi === 'checking' ? 'Checking...' : healthStatus.claudeApi === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
                  </div>
                </HealthCard>
              </HealthGrid>
            )}

            {/* Alerts Section */}
            {healthAlerts.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{
                  color: '#f87171',
                  marginBottom: '16px',
                  fontSize: '16px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Active Alerts ({healthAlerts.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {healthAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        background: alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' :
                                   alert.severity === 'warning' ? 'rgba(251, 191, 36, 0.1)' :
                                   'rgba(59, 130, 246, 0.1)',
                        border: `1px solid ${alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' :
                                             alert.severity === 'warning' ? 'rgba(251, 191, 36, 0.3)' :
                                             'rgba(59, 130, 246, 0.3)'}`,
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          fontWeight: 600,
                          color: alert.severity === 'critical' ? '#f87171' :
                                 alert.severity === 'warning' ? '#fbbf24' : '#60a5fa',
                          fontSize: '14px'
                        }}>
                          {alert.title}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: '4px'
                        }}>
                          {alert.service}
                        </div>
                      </div>
                      <div style={{ color: '#d1d5db', fontSize: '13px', marginBottom: '8px' }}>
                        {alert.message}
                      </div>
                      {alert.actionRequired && (
                        <div style={{
                          fontSize: '12px',
                          color: '#a78bfa',
                          background: 'rgba(139, 92, 246, 0.1)',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          marginTop: '8px'
                        }}>
                          <strong>Action Required:</strong> {alert.actionRequired}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Logs Section */}
            <div style={{ marginTop: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  color: errorLogs.length > 0 ? '#f87171' : '#9ca3af',
                  fontSize: '16px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Error Logs ({errorLogs.length})
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const logText = errorLogs.map(e =>
                        `[${e.timestamp}] [${e.service}] ${e.level.toUpperCase()}: ${e.message}`
                      ).join('\n');
                      navigator.clipboard.writeText(logText || 'No errors found');
                      setErrorLogsCopied(true);
                      setTimeout(() => setErrorLogsCopied(false), 2000);
                    }}
                    style={{
                      background: errorLogsCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                      border: `1px solid ${errorLogsCopied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: errorLogsCopied ? '#22c55e' : '#a78bfa',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {errorLogsCopied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy Log
                      </>
                    )}
                  </button>
                  {errorLogs.length > 5 && (
                    <button
                      onClick={() => setErrorLogsExpanded(!errorLogsExpanded)}
                      style={{
                        background: 'rgba(107, 114, 128, 0.1)',
                        border: '1px solid rgba(107, 114, 128, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#9ca3af',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {errorLogsExpanded ? 'Collapse' : `Expand (${errorLogs.length})`}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: errorLogsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(107, 114, 128, 0.2)',
                borderRadius: '8px',
                overflow: 'hidden',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '12px'
              }}>
                {errorLogs.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#22c55e'
                  }}>
                    ✓ No errors in the last 24 hours
                  </div>
                ) : (
                  <div style={{
                    maxHeight: errorLogsExpanded ? '500px' : '200px',
                    overflowY: 'auto',
                    transition: 'max-height 0.3s ease'
                  }}>
                    {(errorLogsExpanded ? errorLogs : errorLogs.slice(0, 5)).map((log, index) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '8px 12px',
                          borderBottom: index < (errorLogsExpanded ? errorLogs.length : 5) - 1 ? '1px solid rgba(107, 114, 128, 0.1)' : 'none',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start'
                        }}
                      >
                        <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span style={{
                          color: log.level === 'error' ? '#f87171' : '#fbbf24',
                          fontWeight: 600,
                          minWidth: '80px'
                        }}>
                          [{log.service}]
                        </span>
                        <span style={{ color: '#d1d5db', flex: 1, wordBreak: 'break-word' }}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!errorLogsExpanded && errorLogs.length > 5 && (
                <div style={{
                  textAlign: 'center',
                  padding: '8px',
                  color: '#6b7280',
                  fontSize: '11px'
                }}>
                  Showing 5 of {errorLogs.length} errors. Click "Expand" to see all.
                </div>
              )}
            </div>
          </Content>
        )}
        {currentView === 'settings' && renderSettings()}
        {currentView === 'blog' && <BlogAdmin view="posts" />}
      </Main>
      {renderEditModal()}
      {renderLoginModal()}
      {renderPlatformModal()}
      {renderDeleteConfirmModal()}

      {/* Project Detail Modal */}
      <ProjectModalOverlay $open={projectDetailModal !== null} onClick={() => setProjectDetailModal(null)}>
        <ProjectModalContent onClick={(e) => e.stopPropagation()}>
          <ProjectModalHeader>
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{width: 20, height: 20}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              {projectDetailModal?.["Project name"] || "Project Details"}
            </h2>
            <ProjectModalCloseButton onClick={() => setProjectDetailModal(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </ProjectModalCloseButton>
          </ProjectModalHeader>
          <ProjectModalBody>
            {loadingProjectDetail ? (
              <p style={{textAlign: "center", color: "#888"}}>Loading...</p>
            ) : projectDetailModal && (
              <>
                <DetailSection>
                  <DetailSectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    General Info
                  </DetailSectionTitle>
                  <DetailGrid>
                    <DetailItem>
                      <div className="label">Project ID</div>
                      <div className="value purple">{projectDetailModal.id}</div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">Status</div>
                      <div className={"value " + (projectDetailModal["Youtube Active"] ? "green" : "red")}>
                        {projectDetailModal["Youtube Active"] ? "● Active" : "○ Inactive"}
                      </div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">Created At</div>
                      <div className="value">{new Date(projectDetailModal.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">User</div>
                      <div className="value">{projectDetailModal.user || "-"}</div>
                    </DetailItem>
                    <DetailTextArea>
                      <div className="label">Description</div>
                      <div className="value">{projectDetailModal["description service"] || "No description provided"}</div>
                    </DetailTextArea>
                    <DetailLink>
                      <div className="label">Service URL</div>
                      {projectDetailModal["url service"] ? (
                        <a href={projectDetailModal["url service"]} target="_blank" rel="noopener noreferrer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          {projectDetailModal["url service"]}
                        </a>
                      ) : (
                        <div className="value">-</div>
                      )}
                    </DetailLink>
                  </DetailGrid>
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    Keywords & Monitoring
                  </DetailSectionTitle>
                  <DetailGrid>
                    <DetailTextArea>
                      <div className="label">Keywords</div>
                      {projectDetailModal.Keywords ? (
                        <KeywordTags>
                          {projectDetailModal.Keywords.split(',').map((kw, i) => (
                            <KeywordTag key={i}>{kw.trim()}</KeywordTag>
                          ))}
                        </KeywordTags>
                      ) : (
                        <div className="value">No keywords defined</div>
                      )}
                    </DetailTextArea>
                    <DetailTextArea>
                      <div className="label">Negative Keywords</div>
                      {projectDetailModal["Negative keywords"] ? (
                        <KeywordTags>
                          {projectDetailModal["Negative keywords"].split(',').map((kw, i) => (
                            <NegativeKeywordTag key={i}>{kw.trim()}</NegativeKeywordTag>
                          ))}
                        </KeywordTags>
                      ) : (
                        <div className="value">No negative keywords</div>
                      )}
                    </DetailTextArea>
                    <DetailItem>
                      <div className="label">Mentions</div>
                      <div className="value purple">{projectDetailModal.menções || 0}</div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">Searches</div>
                      <div className="value purple">{projectDetailModal.Search || 0}</div>
                    </DetailItem>
                  </DetailGrid>
                </DetailSection>

                <DetailSection>
                  <DetailSectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    Settings & Integration
                  </DetailSectionTitle>
                  <DetailGrid>
                    <DetailItem>
                      <div className="label">Country</div>
                      <div className="value">{projectDetailModal["País"] || "-"}</div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">Timezone</div>
                      <div className="value">{projectDetailModal.fuso_horario || "-"}</div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">RAG Processed</div>
                      <div className={"value " + (projectDetailModal.rag_processed ? "green" : "yellow")}>
                        {projectDetailModal.rag_processed ? "✓ Yes" : "○ No"}
                      </div>
                    </DetailItem>
                    <DetailItem>
                      <div className="label">Integration Valid</div>
                      <div className={"value " + (projectDetailModal.integracao_valida ? "green" : "yellow")}>
                        {projectDetailModal.integracao_valida ? "✓ Yes" : "○ No"}
                      </div>
                    </DetailItem>
                  </DetailGrid>
                </DetailSection>

                {(projectDetailModal.browser_mcp_url || projectDetailModal.browser_vnc_url || projectDetailModal.browser_session_status) && (
                  <DetailSection>
                    <DetailSectionTitle>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      Browser Agent
                    </DetailSectionTitle>
                    <BrowserSection>
                      <div className="browser-grid">
                        <div className="browser-item">
                          <div className="label">Session Status</div>
                          <div className={"value " + (projectDetailModal.browser_session_status === 'active' ? 'green' : projectDetailModal.browser_session_status === 'pending' ? 'yellow' : '')}>
                            {projectDetailModal.browser_session_status || "-"}
                          </div>
                        </div>
                        <div className="browser-item">
                          <div className="label">VNC URL</div>
                          <div className="value">{projectDetailModal.browser_vnc_url || "-"}</div>
                        </div>
                        <div className="browser-item" style={{gridColumn: '1 / -1'}}>
                          <div className="label">MCP URL</div>
                          <div className="value">{projectDetailModal.browser_mcp_url || "-"}</div>
                        </div>
                      </div>
                    </BrowserSection>
                  </DetailSection>
                )}
              </>
            )}
          </ProjectModalBody>
        </ProjectModalContent>
      </ProjectModalOverlay>
    </Container>
  );
};

export default AdminDashboard;
