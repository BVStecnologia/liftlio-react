import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { BlogPostDetail, RelatedPost, BlogComment, TableOfContentsItem } from '../types/blog';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bg.primary};
`;

const Header = styled.header`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 100px 24px 80px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238b5cf6' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.5;
  }

  @media (max-width: 768px) {
    padding: 80px 16px 60px;
  }
`;

const HeaderContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 24px;

  a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #8b5cf6;
    }
  }

  span {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const CategoryBadge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.$color || '#8b5cf6'};
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
  line-height: 1.2;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 24px;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .info {
    .name {
      font-size: 16px;
      font-weight: 600;
      color: white;
    }

    .date {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
  }
`;

const MetaStats = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);

  span {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 48px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    padding: 32px 16px;
  }
`;

const ArticleContainer = styled.article`
  max-width: 100%;
`;

const CoverImage = styled.img`
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: cover;
  border-radius: 16px;
  margin-bottom: 32px;
`;

const ArticleContent = styled.div`
  font-size: 18px;
  line-height: 1.8;
  color: ${props => props.theme.colors.text.primary};

  h1, h2, h3, h4, h5, h6 {
    margin: 32px 0 16px;
    font-weight: 600;
    line-height: 1.3;
    color: ${props => props.theme.colors.text.primary};
  }

  h1 { font-size: 32px; }
  h2 { font-size: 28px; border-bottom: 1px solid ${props => props.theme.colors.border.primary}; padding-bottom: 8px; }
  h3 { font-size: 24px; }
  h4 { font-size: 20px; }

  p {
    margin: 0 0 20px;
  }

  a {
    color: #8b5cf6;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  ul, ol {
    margin: 16px 0;
    padding-left: 24px;

    li {
      margin: 8px 0;
    }
  }

  blockquote {
    margin: 24px 0;
    padding: 16px 24px;
    border-left: 4px solid #8b5cf6;
    background: ${props => props.theme.colors.bg.secondary};
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: ${props => props.theme.colors.text.secondary};
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 24px 0;
  }

  pre {
    margin: 24px 0;
    border-radius: 12px;
    overflow: hidden;
  }

  code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 14px;
  }

  :not(pre) > code {
    background: ${props => props.theme.colors.bg.secondary};
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.9em;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;

    th, td {
      padding: 12px 16px;
      border: 1px solid ${props => props.theme.colors.border.primary};
      text-align: left;
    }

    th {
      background: ${props => props.theme.colors.bg.secondary};
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: ${props => props.theme.colors.bg.secondary};
    }
  }

  hr {
    border: none;
    border-top: 1px solid ${props => props.theme.colors.border.primary};
    margin: 32px 0;
  }
`;

const Sidebar = styled.aside`
  position: sticky;
  top: 24px;
  height: fit-content;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const SidebarCard = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;

  h3 {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${props => props.theme.colors.text.muted};
    margin: 0 0 16px;
  }
`;

const TOCList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    margin: 8px 0;
  }

  a {
    display: block;
    padding: 8px 12px;
    font-size: 14px;
    color: ${props => props.theme.colors.text.secondary};
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s;
    border-left: 2px solid transparent;

    &:hover, &.active {
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
      border-left-color: #8b5cf6;
    }
  }

  .level-2 { padding-left: 12px; }
  .level-3 { padding-left: 24px; font-size: 13px; }
`;

const ShareButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ShareButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: #8b5cf6;
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
  }
`;

const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 48px 0;
  padding-top: 24px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const Tag = styled.span`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  background: ${props => props.theme.colors.bg.secondary};
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }
`;

const EngagementBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 16px;
  margin: 32px 0;
`;

const LikeButton = styled.button<{ $liked?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: ${props => props.$liked ? '#8b5cf6' : props.theme.colors.bg.primary};
  color: ${props => props.$liked ? 'white' : props.theme.colors.text.secondary};
  border: 1px solid ${props => props.$liked ? '#8b5cf6' : props.theme.colors.border.primary};

  &:hover {
    transform: scale(1.02);
    ${props => !props.$liked && `
      border-color: #8b5cf6;
      color: #8b5cf6;
    `}
  }
`;

const RelatedSection = styled.section`
  margin-top: 64px;
  padding-top: 48px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 24px;
  }
`;

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
`;

const RelatedCard = styled.article`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
  }
`;

const RelatedImage = styled.div<{ $src?: string }>`
  height: 140px;
  background: ${props => props.$src
    ? `url(${props.$src}) center/cover`
    : `linear-gradient(135deg, ${props.theme.colors.bg.tertiary} 0%, ${props.theme.colors.bg.secondary} 100%)`};
`;

const RelatedContent = styled.div`
  padding: 16px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 8px;
    line-height: 1.4;
  }

  p {
    font-size: 13px;
    color: ${props => props.theme.colors.text.secondary};
    margin: 0;
  }
`;

const CommentsSection = styled.section`
  margin-top: 64px;
  padding-top: 48px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 24px;
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 16px;
      font-weight: 400;
      color: ${props => props.theme.colors.text.muted};
    }
  }
`;

const CommentForm = styled.form`
  margin-bottom: 32px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.secondary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const SubmitButton = styled.button`
  margin-top: 12px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: #8b5cf6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const CommentCard = styled.div`
  display: flex;
  gap: 16px;
`;

const CommentAvatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
`;

const CommentBody = styled.div`
  flex: 1;

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .name {
      font-weight: 600;
      color: ${props => props.theme.colors.text.primary};
    }

    .date {
      font-size: 13px;
      color: ${props => props.theme.colors.text.muted};
    }

    .author-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
      color: white;
    }
  }

  .content {
    font-size: 15px;
    line-height: 1.6;
    color: ${props => props.theme.colors.text.secondary};
    margin-bottom: 8px;
  }

  .actions {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: ${props => props.theme.colors.text.muted};

    button {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.2s;

      &:hover {
        color: #8b5cf6;
      }
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 0;
  color: ${props => props.theme.colors.text.secondary};
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.colors.border.primary};
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const NotFound = styled.div`
  text-align: center;
  padding: 120px 24px;

  h1 {
    font-size: 48px;
    font-weight: 700;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 16px;
  }

  p {
    font-size: 18px;
    color: ${props => props.theme.colors.text.secondary};
    margin: 0 0 32px;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 10px;
    background: #8b5cf6;
    color: white;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      background: #7c3aed;
    }
  }
`;

const Footer = styled.footer`
  background: ${props => props.theme.colors.bg.secondary};
  border-top: 1px solid ${props => props.theme.colors.border.primary};
  padding: 40px 24px;
  text-align: center;
  margin-top: 80px;

  p {
    color: ${props => props.theme.colors.text.muted};
    font-size: 13px;
    margin: 0;
  }
`;

// ==========================================
// ICONS
// ==========================================

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  // State
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);

  // Fetch post
  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      setLoading(true);
      try {
        // Get post by slug
        const { data, error } = await supabase.rpc('get_blog_post_by_slug', {
          post_slug: slug
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const postData = data[0] as BlogPostDetail;
          setPost(postData);
          setLikeCount(postData.like_count);

          // Generate TOC from content
          const headings = postData.content.match(/^#{1,3}\s+.+$/gm) || [];
          const toc = headings.map((h: string, i: number) => {
            const level = (h.match(/^#+/) || [''])[0].length;
            const text = h.replace(/^#+\s+/, '');
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return { id, text, level };
          });
          setTableOfContents(toc);

          // Track view
          await supabase.rpc('increment_blog_post_views', { post_slug: slug });

          // Record view for analytics
          await supabase.from('blog_views').insert({
            post_id: postData.id,
            visitor_id: localStorage.getItem('visitor_id') || crypto.randomUUID(),
            user_id: user?.id || null,
            referrer: document.referrer || null
          });

          // Fetch related posts
          const { data: related } = await supabase.rpc('get_related_blog_posts', {
            current_post_id: postData.id,
            limit_count: 3
          });
          if (related) setRelatedPosts(related);

          // Fetch comments
          const { data: commentsData } = await supabase
            .from('blog_comments')
            .select(`
              *,
              user:user_id (
                email,
                raw_user_meta_data->full_name,
                raw_user_meta_data->avatar_url
              )
            `)
            .eq('post_id', postData.id)
            .is('parent_id', null)
            .order('created_at', { ascending: false });
          if (commentsData) setComments(commentsData);

          // Check if user liked
          if (user) {
            const { data: likeData } = await supabase
              .from('blog_likes')
              .select('id')
              .eq('post_id', postData.id)
              .eq('user_id', user.id)
              .single();
            setIsLiked(!!likeData);
          }
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, user]);

  // Handle like
  const handleLike = async () => {
    if (!user || !post) return;

    if (isLiked) {
      await supabase
        .from('blog_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      await supabase
        .from('blog_likes')
        .insert({ post_id: post.id, user_id: user.id, reaction_type: 'like' });
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  // Handle comment submit
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentText.trim()
        })
        .select()
        .single();

      if (!error && data) {
        setComments(prev => [{ ...data, user: { email: user.email, full_name: user.user_metadata?.full_name, avatar_url: user.user_metadata?.avatar_url } }, ...prev]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Share handlers
  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post?.title || '')}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // TODO: Show toast notification
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Markdown components
  const markdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={theme.mode === 'dark' ? vscDarkPlus : vs}
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
    },
    h1: ({ children, ...props }: any) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h1 id={id} {...props}>{children}</h1>;
    },
    h2: ({ children, ...props }: any) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h2 id={id} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h3 id={id} {...props}>{children}</h3>;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner />
          <p style={{ marginTop: '16px' }}>Loading article...</p>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (notFound || !post) {
    return (
      <PageContainer>
        <NotFound>
          <h1>404</h1>
          <p>The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog">
            <ArrowLeftIcon /> Back to Blog
          </Link>
        </NotFound>
      </PageContainer>
    );
  }

  // Generate Schema.org JSON-LD
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url || post.og_image_url,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'Liftlio Team',
      url: 'https://liftlio.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Liftlio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://liftlio.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://liftlio.com/blog/${post.slug}`
    },
    wordCount: post.word_count,
    articleBody: post.content.replace(/[#*`_\[\]]/g, '').substring(0, 5000)
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://liftlio.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://liftlio.com/blog'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://liftlio.com/blog/${post.slug}`
      }
    ]
  };

  return (
    <PageContainer>
      <Helmet>
        <title>{post.meta_title || post.title} | Liftlio Blog</title>
        <meta name="description" content={post.meta_description || post.excerpt || ''} />
        {post.focus_keyword && <meta name="keywords" content={post.focus_keyword} />}
        <link rel="canonical" href={post.canonical_url || `https://liftlio.com/blog/${post.slug}`} />

        {/* Open Graph */}
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://liftlio.com/blog/${post.slug}`} />
        <meta property="og:image" content={post.og_image_url || post.cover_image_url || ''} />
        <meta property="article:published_time" content={post.published_at || ''} />
        <meta property="article:author" content={post.author_name || 'Liftlio Team'} />
        {post.category_name && <meta property="article:section" content={post.category_name} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.meta_title || post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt || ''} />
        <meta name="twitter:image" content={post.og_image_url || post.cover_image_url || ''} />

        {/* Schema.org */}
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <Header>
        <HeaderContent>
          <Breadcrumb>
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            {post.category_name && (
              <>
                <span>/</span>
                <Link to={`/blog?category=${post.category_slug}`}>{post.category_name}</Link>
              </>
            )}
          </Breadcrumb>

          {post.category_name && (
            <CategoryBadge $color={post.category_color || undefined}>
              {post.category_name}
            </CategoryBadge>
          )}

          <Title>{post.title}</Title>
          {post.subtitle && <Subtitle>{post.subtitle}</Subtitle>}

          <MetaInfo>
            <AuthorInfo>
              {post.author_avatar_url && (
                <img src={post.author_avatar_url} alt={post.author_name || 'Author'} />
              )}
              <div className="info">
                <div className="name">{post.author_name || 'Liftlio Team'}</div>
                <div className="date">
                  {post.published_at && formatDate(post.published_at)}
                </div>
              </div>
            </AuthorInfo>

            <MetaStats>
              <span><ClockIcon /> {post.reading_time_minutes} min read</span>
              <span><ViewIcon /> {post.view_count} views</span>
            </MetaStats>
          </MetaInfo>
        </HeaderContent>
      </Header>

      <MainContent>
        <ArticleContainer>
          {post.cover_image_url && (
            <CoverImage src={post.cover_image_url} alt={post.cover_image_alt || post.title} />
          )}

          <ArticleContent>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </ArticleContent>

          {post.tags && post.tags.length > 0 && (
            <TagsSection>
              {post.tags.map(tag => (
                <Tag key={tag.id} onClick={() => navigate(`/blog?tag=${tag.slug}`)}>
                  #{tag.name}
                </Tag>
              ))}
            </TagsSection>
          )}

          <EngagementBar>
            <LikeButton $liked={isLiked} onClick={handleLike} disabled={!user}>
              <HeartIcon filled={isLiked} />
              {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
            </LikeButton>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <ShareButton onClick={shareOnTwitter} title="Share on Twitter">
                <TwitterIcon />
              </ShareButton>
              <ShareButton onClick={shareOnLinkedIn} title="Share on LinkedIn">
                <LinkedInIcon />
              </ShareButton>
              <ShareButton onClick={copyLink} title="Copy link">
                <CopyIcon />
              </ShareButton>
            </div>
          </EngagementBar>

          {relatedPosts.length > 0 && (
            <RelatedSection>
              <h2>Related Articles</h2>
              <RelatedGrid>
                {relatedPosts.map(related => (
                  <RelatedCard key={related.id} onClick={() => navigate(`/blog/${related.slug}`)}>
                    <RelatedImage $src={related.cover_image_url || undefined} />
                    <RelatedContent>
                      <h3>{related.title}</h3>
                      <p>{related.reading_time_minutes} min read</p>
                    </RelatedContent>
                  </RelatedCard>
                ))}
              </RelatedGrid>
            </RelatedSection>
          )}

          {post.allow_comments && (
            <CommentsSection>
              <h2>
                Comments <span>({comments.length})</span>
              </h2>

              {user ? (
                <CommentForm onSubmit={handleSubmitComment}>
                  <CommentTextarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <SubmitButton type="submit" disabled={!commentText.trim() || submittingComment}>
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </SubmitButton>
                </CommentForm>
              ) : (
                <p style={{ marginBottom: '24px', color: theme.colors.text.secondary }}>
                  <Link to="/login" style={{ color: '#8b5cf6' }}>Sign in</Link> to leave a comment.
                </p>
              )}

              <CommentsList>
                {comments.map(comment => (
                  <CommentCard key={comment.id}>
                    <CommentAvatar
                      src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.full_name || 'User')}&background=8b5cf6&color=fff`}
                      alt={comment.user?.full_name || 'User'}
                    />
                    <CommentBody>
                      <div className="header">
                        <span className="name">{comment.user?.full_name || 'Anonymous'}</span>
                        {comment.is_author_reply && <span className="author-badge">Author</span>}
                        <span className="date">{formatDate(comment.created_at)}</span>
                      </div>
                      <div className="content">{comment.content}</div>
                      <div className="actions">
                        <button>
                          <HeartIcon filled={false} /> {comment.likes_count}
                        </button>
                        <button>Reply</button>
                      </div>
                    </CommentBody>
                  </CommentCard>
                ))}
              </CommentsList>
            </CommentsSection>
          )}
        </ArticleContainer>

        <Sidebar>
          {tableOfContents.length > 0 && (
            <SidebarCard>
              <h3>Table of Contents</h3>
              <TOCList>
                {tableOfContents.map(item => (
                  <li key={item.id} className={`level-${item.level}`}>
                    <a
                      href={`#${item.id}`}
                      className={activeSection === item.id ? 'active' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </TOCList>
            </SidebarCard>
          )}

          <SidebarCard>
            <h3>Share this article</h3>
            <ShareButtons>
              <ShareButton onClick={shareOnTwitter} title="Share on Twitter">
                <TwitterIcon />
              </ShareButton>
              <ShareButton onClick={shareOnLinkedIn} title="Share on LinkedIn">
                <LinkedInIcon />
              </ShareButton>
              <ShareButton onClick={copyLink} title="Copy link">
                <CopyIcon />
              </ShareButton>
            </ShareButtons>
          </SidebarCard>

          <SidebarCard>
            <h3>Newsletter</h3>
            <p style={{ fontSize: '14px', color: theme.colors.text.secondary, margin: '0 0 16px' }}>
              Get the latest articles delivered to your inbox.
            </p>
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.border.primary}`,
                background: theme.colors.bg.primary,
                color: theme.colors.text.primary,
                fontSize: '14px',
                marginBottom: '12px'
              }}
            />
            <SubmitButton style={{ width: '100%' }}>Subscribe</SubmitButton>
          </SidebarCard>
        </Sidebar>
      </MainContent>

      <Footer>
        <p>&copy; {new Date().getFullYear()} Liftlio. All rights reserved.</p>
      </Footer>
    </PageContainer>
  );
};

export default BlogPost;
