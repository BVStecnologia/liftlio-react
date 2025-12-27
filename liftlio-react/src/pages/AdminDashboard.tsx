import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, useTheme } from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

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
  id: number;
  project_id: number;
  task: string;
  status: string;
  result: string | null;
  created_at: string;
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
}

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_failed' | '2fa_pending' | 'new_user' | 'login_success';
  title: string;
  description: string;
  timestamp: string;
  context?: string;
}

type ViewType = 'overview' | 'users' | 'projects' | 'subscriptions' | 'payments' | 'containers' | 'tasks' | 'logins' | 'health' | 'settings' | 'user-detail' | 'project-detail';

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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#1a1a24' : '#ffffff'};
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
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled.div`
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
    background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
  background: ${props => props.theme.name === 'dark' ? '#1a1a24' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
    background: ${props => props.theme.name === 'dark' ? '#15151e' : '#fff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#1a1a24' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
    background: ${props => props.theme.name === 'dark' ? '#15151e' : '#ffffff'};
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
  background: ${props => props.theme.name === 'dark' ? '#0f0f14' : '#f8f9fa'};
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
  const [prompts, setPrompts] = useState<BrowserPrompt[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
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
    visitors: 0,
    events: 0,
    channels: 0,
    videos: 0,
    comments: 0,
    activeContainers: 0,
  });


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
    lastCheck: null,
  });

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

        // Fetch browser tasks
        const { data: tasksData } = await supabase
          .from('browser_tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        // Fetch browser logins
        const { data: loginsData } = await supabase
          .from('browser_logins')
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

        // Fetch analytics stats
        const { data: analyticsData } = await supabase
          .from('analytics')
          .select('id')
          .limit(1);

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
        setLogins(loginsData || []);
        setPrompts(promptsData || []);
        setPlatformPrompts(promptsData || []);
        setActivity(recentActivity.slice(0, 5));

        // Set maintenance config
        if (configData?.value) {
          setMaintenanceConfig(configData.value as MaintenanceConfig);
        }

        // Set admin emails
        if (adminConfigData?.value?.emails) {
          setAdminEmails(adminConfigData.value.emails);
        }

        setStats({
          totalUsers,
          activeProjects,
          mrr,
          taskSuccessRate,
          visitors: 319, // Placeholder - would come from analytics
          events: 5400,
          channels: channelsData?.length || 0,
          videos: videosData?.length || 0,
          comments: commentsData?.length || 0,
          activeContainers: runningContainers,
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


  // Health check function
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

    // 4. VPS Browser Agent - no-cors fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:10100/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, vpsBrowser: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, vpsBrowser: 'unknown' }));
    }

    // 5. Analytics Server - no-cors fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('https://track.liftlio.com', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, analyticsServer: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, analyticsServer: 'unknown' }));
    }

    // 6. Edge Functions - if Supabase DB works, Edge Functions are available
    // (actual function calls require specific params, so we infer from DB status)
    setHealthStatus(prev => ({ 
      ...prev, 
      edgeFunctions: prev.supabaseDb === 'ok' ? 'ok' : 'error' 
    }));

    // 7. Browser Orchestrator
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:8080/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, orchestrator: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, orchestrator: 'unknown' }));
    }

    // 8. Video Qualifier
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:8001/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, videoQualifier: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, videoQualifier: 'unknown' }));
    }

    // 9. Transcricao Service
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:8081/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, transcricao: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, transcricao: 'unknown' }));
    }

    // 10. YouTube Search
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:8000/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, youtubeSearch: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, youtubeSearch: 'unknown' }));
    }

    // 11. MCP Gmail
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('http://173.249.22.2:3000/health', { signal: controller.signal, mode: 'no-cors' });
      clearTimeout(timeoutId);
      setHealthStatus(prev => ({ ...prev, mcpGmail: 'ok' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, mcpGmail: 'unknown' }));
    }

    // 12. Token Refresher (inferred from VPS status - no public port)
    setHealthStatus(prev => ({
      ...prev,
      tokenRefresher: prev.vpsBrowser === 'ok' ? 'ok' : 'unknown'
    }));
    setHealthStatus(prev => ({ ...prev, lastCheck: new Date() }));
  }, [user, stats.activeContainers]);

  // Run health checks on mount and every 60 seconds
  useEffect(() => {
    setTimeout(checkHealth, 1500); // Delay to show loading spinner
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

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

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
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
          <Badge>{tasks.length}</Badge>
        </NavItem>
        <NavItem $active={currentView === 'logins'} onClick={() => setCurrentView('logins')}>
          <Icons.Key />
          Platforms
          <Badge>{platformPrompts.length}</Badge>
        </NavItem>
      </NavSection>

      <NavSection>
        <NavLabel>System</NavLabel>
        <NavItem $active={currentView === 'health'} onClick={() => setCurrentView('health')}>
          <Icons.Activity />
          Health
        </NavItem>
        <NavItem $active={currentView === 'settings'} onClick={() => setCurrentView('settings')}>
          <Icons.Settings />
          Settings
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
          <div className="value">{stats.visitors}</div>
          <div className="label">Visitors</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.events >= 1000 ? `${(stats.events/1000).toFixed(1)}K` : stats.events}</div>
          <div className="label">Events</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.channels}</div>
          <div className="label">YT Channels</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.videos}</div>
          <div className="label">Videos</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.comments}</div>
          <div className="label">Comments</div>
        </StatItem>
        <StatItem>
          <div className="value">{stats.activeContainers}</div>
          <div className="label">Container</div>
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
        </CardHeader>
        <div style={{ padding: '16px' }}>
          <HealthGrid>
            <HealthCard $status="ok">
              <div className="indicator" />
              <div className="info">
                <div className="name">Supabase</div>
                <div className="detail">Operational</div>
              </div>
            </HealthCard>
            <HealthCard $status="ok">
              <div className="indicator" />
              <div className="info">
                <div className="name">Fly.io Frontend</div>
                <div className="detail">Operational</div>
              </div>
            </HealthCard>
            <HealthCard $status="ok">
              <div className="indicator" />
              <div className="info">
                <div className="name">VPS Browser Agent</div>
                <div className="detail">173.249.22.2 · Online</div>
              </div>
            </HealthCard>
            <HealthCard $status={stats.activeContainers > 0 ? 'ok' : 'warning'}>
              <div className="indicator" />
              <div className="info">
                <div className="name">Containers</div>
                <div className="detail">{stats.activeContainers} running</div>
              </div>
            </HealthCard>
            <HealthCard $status="warning">
              <div className="indicator" />
              <div className="info">
                <div className="name">Google Login</div>
                <div className="detail">Offline · Needs auth</div>
              </div>
            </HealthCard>
            <HealthCard $status="ok">
              <div className="indicator" />
              <div className="info">
                <div className="name">Analytics Server</div>
                <div className="detail">track.liftlio.com · OK</div>
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
                <Button $variant="primary" onClick={() => window.open(`http://${container.vnc_url}/vnc.html`, '_blank')}>
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
                <a href={`http://${container.vnc_url}/vnc.html`} target="_blank" rel="noopener noreferrer">
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
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: theme.colors.text.muted }}>
                      {task.result || 'N/A'}
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
          twofa_code_prompt: prompt.twofa_code_prompt
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
                        {prompt.twofa_phone_prompt ? '✓ 2FA' : '○ 2FA'}
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
              <p>Docker containers running browser automation</p>
            </PageHeader>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Container</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th>MCP URL</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map(c => (
                    <tr key={c.id}>
                      <td>{c.container_name}</td>
                      <td>#{c.project_id}</td>
                      <td>
                        <StatusBadge $status={c.status}>{c.status}</StatusBadge>
                      </td>
                      <td>
                        <a href={`http://${c.mcp_url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6' }}>
                          {c.mcp_url}
                        </a>
                      </td>
                      <td>
                        <Button $variant="primary" onClick={() => window.open(`http://${c.vnc_url}/vnc.html`, '_blank')}>
                          VNC
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Content>
        )}
        {currentView === 'tasks' && (
          <Content>
            <PageHeader>
              <h1>Browser Tasks</h1>
              <p>All automation tasks</p>
            </PageHeader>
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Task</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 50).map(t => (
                    <tr key={t.id}>
                      <td>{formatDate(t.created_at)}</td>
                      <td>#{t.project_id}</td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.task}
                      </td>
                      <td>
                        <StatusBadge $status={t.status}>{t.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
                    <div className="name">YouTube Search</div>
                    <div className="detail">:8000 · {healthStatus.youtubeSearch === 'ok' ? 'Running' : healthStatus.youtubeSearch === 'checking' ? 'Checking...' : healthStatus.youtubeSearch === 'unknown' ? 'Unknown (CORS)' : 'Offline'}</div>
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
            )}
          </Content>
        )}
        {currentView === 'settings' && renderSettings()}
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
