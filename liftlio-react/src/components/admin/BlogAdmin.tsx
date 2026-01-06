import React, { useState, useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { supabase } from '../../lib/supabaseClient';
import RichTextEditor from './RichTextEditor';
import type {
  BlogPost,
  BlogCategory,
  BlogTag,
  BlogComment,
  BlogAdminStats,
  BlogPostFormData,
  BlogPostStatus
} from '../../types/blog';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled.div`
  padding: 32px;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin: 0 0 8px 0;
  }

  p {
    color: ${props => props.theme.colors.text.secondary};
    margin: 0;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  padding: 20px;

  .label {
    font-size: 13px;
    color: ${props => props.theme.colors.text.secondary};
    margin-bottom: 8px;
  }

  .value {
    font-size: 28px;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
  }

  .change {
    font-size: 12px;
    color: #10b981;
    margin-top: 4px;
  }
`;

const ActionsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${props => props.$active ? '#8b5cf6' : props.theme.colors.border.primary};
  background: ${props => props.$active ? 'rgba(139, 92, 246, 0.1)' : props.theme.colors.bg.secondary};
  color: ${props => props.$active ? '#8b5cf6' : props.theme.colors.text.secondary};

  &:hover {
    border-color: #8b5cf6;
    color: #8b5cf6;
  }
`;

const SearchInput = styled.input`
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.secondary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  width: 250px;

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const CreateButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: #8b5cf6;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.colors.border.primary};
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => props.theme.colors.text.secondary};
  background: ${props => props.theme.colors.bg.tertiary};
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  vertical-align: middle;
`;

const Tr = styled.tr`
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${props => props.theme.colors.bg.hover};
  }

  &:last-child td {
    border-bottom: none;
  }
`;

const PostTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .thumbnail {
    width: 48px;
    height: 32px;
    border-radius: 6px;
    object-fit: cover;
    background: ${props => props.theme.colors.bg.tertiary};
  }

  .title-text {
    font-weight: 500;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const StatusBadge = styled.span<{ $status: BlogPostStatus }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  ${props => {
    switch (props.$status) {
      case 'published':
        return 'background: rgba(16, 185, 129, 0.1); color: #10b981;';
      case 'draft':
        return 'background: rgba(107, 114, 128, 0.1); color: #6b7280;';
      case 'scheduled':
        return 'background: rgba(251, 191, 36, 0.1); color: #f59e0b;';
      case 'archived':
        return 'background: rgba(239, 68, 68, 0.1); color: #ef4444;';
      default:
        return 'background: rgba(107, 114, 128, 0.1); color: #6b7280;';
    }
  }}
`;

const CategoryBadge = styled.span<{ $color?: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.$color ? `${props.$color}20` : 'rgba(139, 92, 246, 0.1)'};
  color: ${props => props.$color || '#8b5cf6'};
`;

const MetricCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 13px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const TodayBadge = styled.span`
  font-size: 10px;
  color: #10b981;
  font-weight: 500;
  margin-left: 4px;
`;

const ActionMenu = styled.div`
  position: relative;
`;

const ActionButton = styled.button`
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.theme.colors.bg.hover};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const ActionDropdown = styled.div<{ $show: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${props => props.theme.colors.bg.primary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 150px;
  z-index: 100;
  display: ${props => props.$show ? 'block' : 'none'};
  overflow: hidden;
`;

const ActionItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: ${props => props.$danger ? '#ef4444' : props.theme.colors.text.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;

  &:hover {
    background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.1)' : props.theme.colors.bg.hover};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.colors.text.secondary};

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    font-size: 16px;
    margin-bottom: 8px;
    color: ${props => props.theme.colors.text.primary};
  }

  p {
    font-size: 14px;
    margin-bottom: 20px;
  }
`;

// ==========================================
// EDITOR STYLED COMPONENTS (INLINE - no overlay)
// ==========================================

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  min-height: 600px;
  padding: 32px;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.secondary};
`;

const EditorTitle = styled.input`
  font-size: 20px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  flex: 1;
  margin-right: 16px;

  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }

  &:focus {
    outline: none;
  }
`;

const EditorActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const EditorBtn = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${props => props.$primary ? '#8b5cf6' : props.theme.colors.border.primary};
  background: ${props => props.$primary ? '#8b5cf6' : 'transparent'};
  color: ${props => props.$primary ? 'white' : props.theme.colors.text.primary};

  &:hover {
    background: ${props => props.$primary ? '#7c3aed' : props.theme.colors.bg.hover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditorBody = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  flex: 1;
  overflow: hidden;
  gap: 0;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const EditorMain = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${props => props.theme.colors.border.primary};
  overflow: hidden;
  padding: 16px;
`;

const EditorSidebar = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  overflow-y: auto;
  padding: 20px;
`;

const SidebarSection = styled.div`
  margin-bottom: 24px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${props => props.theme.colors.text.secondary};
    margin-bottom: 12px;
  }
`;

const SidebarInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  margin-bottom: 12px;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const SidebarTextarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const SidebarSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  margin-bottom: 12px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const CharCount = styled.div<{ $warning?: boolean }>`
  font-size: 12px;
  color: ${props => props.$warning ? '#f59e0b' : props.theme.colors.text.muted};
  text-align: right;
  margin-top: 4px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 16px;

  &:hover {
    background: ${props => props.theme.colors.bg.hover};
    color: ${props => props.theme.colors.text.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// ==========================================
// ICONS
// ==========================================

const Icons = {
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  MoreVertical: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

// ==========================================
// PROPS INTERFACE
// ==========================================

interface BlogAdminProps {
  view?: 'posts' | 'categories' | 'comments' | 'analytics';
}

// ==========================================
// MAIN COMPONENT
// ==========================================

const BlogAdmin: React.FC<BlogAdminProps> = ({ view: initialView = 'posts' }) => {
  const theme = useTheme();

  // Internal view state
  const [currentView, setCurrentView] = useState(initialView);

  // State
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [stats, setStats] = useState<BlogAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Views/Likes today per post (calculated DIRECT from blog_views/blog_likes)
  const [viewsTodayByPost, setViewsTodayByPost] = useState<Record<number, number>>({});
  const [likesTodayByPost, setLikesTodayByPost] = useState<Record<number, number>>({});

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: '',
    content: '',
    status: 'draft',
    visibility: 'public',
  });
  const [saving, setSaving] = useState(false);

  // Action menu state
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // ALL queries in parallel (was sequential before - slow!)
      const [postsRes, categoriesRes, tagsRes, commentsRes, statsRes, viewsTodayRes, likesTodayRes] = await Promise.all([
        supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
        supabase.from('blog_categories').select('*').order('sort_order'),
        supabase.from('blog_tags').select('*').order('name'),
        supabase.from('blog_comments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.rpc('get_blog_admin_stats'),
        // Views/likes today - only fetch post_id (minimal data)
        supabase.from('blog_views').select('post_id').gte('created_at', today),
        supabase.from('blog_likes').select('post_id').gte('created_at', today),
      ]);

      setPosts(postsRes.data || []);
      setCategories(categoriesRes.data || []);
      setTags(tagsRes.data || []);
      setComments(commentsRes.data || []);
      if (statsRes.data && statsRes.data.length > 0) {
        setStats(statsRes.data[0]);
      }

      // Count views per post (fast - just counting small objects)
      const viewsMap: Record<number, number> = {};
      (viewsTodayRes.data || []).forEach((v: { post_id: number }) => {
        viewsMap[v.post_id] = (viewsMap[v.post_id] || 0) + 1;
      });
      setViewsTodayByPost(viewsMap);

      // Count likes per post
      const likesMap: Record<number, number> = {};
      (likesTodayRes.data || []).forEach((l: { post_id: number }) => {
        likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;
      });
      setLikesTodayByPost(likesMap);

    } catch (error) {
      console.error('Error fetching blog data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [posts, statusFilter, searchQuery]);

  // Handlers
  const handleCreatePost = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      status: 'draft',
      visibility: 'public',
    });
    setIsEditorOpen(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      subtitle: post.subtitle,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      focus_keyword: post.focus_keyword,
      category_id: post.category_id,
      status: post.status,
      visibility: post.visibility,
      featured: post.featured,
      allow_comments: post.allow_comments,
    });
    setIsEditorOpen(true);
    setOpenActionMenu(null);
  };

  const handleSavePost = async (publish = false) => {
    setSaving(true);
    try {
      const postData = {
        ...formData,
        status: publish ? 'published' : formData.status,
        published_at: publish ? new Date().toISOString() : editingPost?.published_at,
        author_name: 'Valdair', // TODO: Get from auth
        author_id: (await supabase.auth.getUser()).data.user?.id,
      };

      if (editingPost) {
        await supabase.from('blog_posts').update(postData).eq('id', editingPost.id);
      } else {
        await supabase.from('blog_posts').insert(postData);
      }

      await fetchData();
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await supabase.from('blog_posts').delete().eq('id', postId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
    setOpenActionMenu(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render posts list
  const renderPosts = () => (
    <Container>
      <PageHeader>
        <h1>Blog Posts</h1>
        <p>Create and manage your blog content</p>
      </PageHeader>

      {stats && (
        <StatsGrid>
          <StatCard>
            <div className="label">Total Posts</div>
            <div className="value">{stats.total_posts}</div>
          </StatCard>
          <StatCard>
            <div className="label">Published</div>
            <div className="value">{stats.published_posts}</div>
          </StatCard>
          <StatCard>
            <div className="label">Total Views</div>
            <div className="value">{stats.total_views?.toLocaleString() || 0}</div>
            {(stats.views_today || 0) > 0 && <div className="change">+{stats.views_today} today</div>}
          </StatCard>
          <StatCard>
            <div className="label">Total Likes</div>
            <div className="value">{stats.total_likes?.toLocaleString() || 0}</div>
            {(stats.likes_today || 0) > 0 && <div className="change">+{stats.likes_today} today</div>}
          </StatCard>
        </StatsGrid>
      )}

      <ActionsBar>
        <FilterGroup>
          {(['all', 'published', 'draft', 'scheduled'] as const).map(status => (
            <FilterButton
              key={status}
              $active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </FilterButton>
          ))}
        </FilterGroup>
        <FilterGroup>
          <SearchInput
            placeholder="Search posts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <CreateButton onClick={handleCreatePost}>
            <Icons.Plus />
            New Post
          </CreateButton>
        </FilterGroup>
      </ActionsBar>

      {filteredPosts.length === 0 ? (
        <EmptyState>
          <Icons.FileText />
          <h3>No posts found</h3>
          <p>Create your first blog post to get started</p>
          <CreateButton onClick={handleCreatePost}>
            <Icons.Plus />
            Create Post
          </CreateButton>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Views</Th>
              <Th>Engagement</Th>
              <Th>Date</Th>
              <Th style={{ width: 50 }}></Th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map(post => (
              <Tr key={post.id} onClick={() => handleEditPost(post)}>
                <Td>
                  <PostTitle>
                    {post.cover_image_url ? (
                      <img className="thumbnail" src={post.cover_image_url} alt="" />
                    ) : (
                      <div className="thumbnail" />
                    )}
                    <span className="title-text">{post.title}</span>
                  </PostTitle>
                </Td>
                <Td>
                  {post.category_id ? (
                    <CategoryBadge $color={categories.find(c => c.id === post.category_id)?.color}>
                      {categories.find(c => c.id === post.category_id)?.name || 'Uncategorized'}
                    </CategoryBadge>
                  ) : (
                    <span style={{ color: theme.colors.text.muted }}>—</span>
                  )}
                </Td>
                <Td>
                  <StatusBadge $status={post.status}>{post.status}</StatusBadge>
                </Td>
                <Td>
                  <MetricCell>
                    <Icons.Eye />
                    {post.view_count?.toLocaleString() || 0}
                    {(viewsTodayByPost[post.id] || 0) > 0 && (
                      <TodayBadge>+{viewsTodayByPost[post.id]}</TodayBadge>
                    )}
                  </MetricCell>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <MetricCell>
                      <Icons.Heart />
                      {post.like_count || 0}
                      {(likesTodayByPost[post.id] || 0) > 0 && (
                        <TodayBadge>+{likesTodayByPost[post.id]}</TodayBadge>
                      )}
                    </MetricCell>
                    <MetricCell>
                      <Icons.MessageCircle />
                      {post.comment_count || 0}
                    </MetricCell>
                  </div>
                </Td>
                <Td style={{ color: theme.colors.text.secondary }}>
                  {formatDate(post.published_at || post.created_at)}
                </Td>
                <Td onClick={e => e.stopPropagation()}>
                  <ActionMenu>
                    <ActionButton onClick={() => setOpenActionMenu(openActionMenu === post.id ? null : post.id)}>
                      <Icons.MoreVertical />
                    </ActionButton>
                    <ActionDropdown $show={openActionMenu === post.id}>
                      <ActionItem onClick={() => handleEditPost(post)}>
                        <Icons.Edit /> Edit
                      </ActionItem>
                      <ActionItem onClick={() => window.open(`/blog/${post.slug}`, '_blank')}>
                        <Icons.Eye /> View
                      </ActionItem>
                      <ActionItem $danger onClick={() => handleDeletePost(post.id)}>
                        <Icons.Trash /> Delete
                      </ActionItem>
                    </ActionDropdown>
                  </ActionMenu>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );

  // Render categories
  const renderCategories = () => (
    <Container>
      <PageHeader>
        <h1>Categories</h1>
        <p>Organize your blog content with categories</p>
      </PageHeader>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Slug</Th>
            <Th>Color</Th>
            <Th>Posts</Th>
            <Th style={{ width: 50 }}></Th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <Tr key={cat.id}>
              <Td>{cat.name}</Td>
              <Td style={{ color: theme.colors.text.secondary }}>{cat.slug}</Td>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: cat.color
                  }} />
                  {cat.color}
                </div>
              </Td>
              <Td>{cat.post_count || 0}</Td>
              <Td>
                <ActionButton>
                  <Icons.MoreVertical />
                </ActionButton>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );

  // Render comments
  const renderComments = () => (
    <Container>
      <PageHeader>
        <h1>Comments</h1>
        <p>Moderate and manage blog comments</p>
      </PageHeader>

      {comments.length === 0 ? (
        <EmptyState>
          <Icons.MessageCircle />
          <h3>No comments yet</h3>
          <p>Comments will appear here when readers engage with your posts</p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Comment</Th>
              <Th>Post</Th>
              <Th>Date</Th>
              <Th style={{ width: 50 }}></Th>
            </tr>
          </thead>
          <tbody>
            {comments.map(comment => (
              <Tr key={comment.id}>
                <Td style={{ maxWidth: 400 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {comment.content}
                  </div>
                </Td>
                <Td style={{ color: theme.colors.text.secondary }}>
                  Post #{comment.post_id}
                </Td>
                <Td style={{ color: theme.colors.text.secondary }}>
                  {formatDate(comment.created_at)}
                </Td>
                <Td>
                  <ActionButton>
                    <Icons.MoreVertical />
                  </ActionButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );

  // Render analytics
  const renderAnalytics = () => (
    <Container>
      <PageHeader>
        <h1>Blog Analytics</h1>
        <p>Track your blog performance and engagement</p>
      </PageHeader>

      {stats && (
        <StatsGrid>
          <StatCard>
            <div className="label">Total Views</div>
            <div className="value">{stats.total_views?.toLocaleString() || 0}</div>
            <div className="change">This month: {stats.views_this_month?.toLocaleString() || 0}</div>
          </StatCard>
          <StatCard>
            <div className="label">Total Likes</div>
            <div className="value">{stats.total_likes?.toLocaleString() || 0}</div>
          </StatCard>
          <StatCard>
            <div className="label">Total Comments</div>
            <div className="value">{stats.total_comments?.toLocaleString() || 0}</div>
          </StatCard>
          <StatCard>
            <div className="label">Newsletter Subscribers</div>
            <div className="value">{stats.total_subscribers?.toLocaleString() || 0}</div>
          </StatCard>
        </StatsGrid>
      )}

      <EmptyState>
        <p>Detailed analytics charts coming soon...</p>
      </EmptyState>
    </Container>
  );

  // Render editor (inline - not overlay)
  const renderEditor = () => {
    return (
      <EditorContainer>
        <BackButton onClick={() => setIsEditorOpen(false)}>
          <Icons.ArrowLeft />
          Back to Posts
        </BackButton>

        <EditorHeader>
          <EditorTitle
            placeholder="Post title..."
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
          <EditorActions>
            <EditorBtn onClick={() => setIsEditorOpen(false)}>
              Cancel
            </EditorBtn>
            <EditorBtn onClick={() => handleSavePost(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </EditorBtn>
            <EditorBtn $primary onClick={() => handleSavePost(true)} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </EditorBtn>
          </EditorActions>
        </EditorHeader>

        <EditorBody>
          <EditorMain>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              placeholder="Start writing your amazing content..."
            />
          </EditorMain>

          <EditorSidebar>
            <SidebarSection>
              <h4>SEO</h4>
              <label style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 6, display: 'block' }}>
                URL Slug
              </label>
              <SidebarInput
                placeholder="post-url-slug"
                value={formData.slug || ''}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />

              <label style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 6, display: 'block' }}>
                Meta Title
              </label>
              <SidebarInput
                placeholder="SEO title (50-60 chars)"
                value={formData.meta_title || ''}
                onChange={e => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
              />
              <CharCount $warning={(formData.meta_title?.length || 0) > 60}>
                {formData.meta_title?.length || 0}/60
              </CharCount>

              <label style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 6, display: 'block', marginTop: 12 }}>
                Meta Description
              </label>
              <SidebarTextarea
                placeholder="SEO description (150-160 chars)"
                value={formData.meta_description || ''}
                onChange={e => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
              />
              <CharCount $warning={(formData.meta_description?.length || 0) > 160}>
                {formData.meta_description?.length || 0}/160
              </CharCount>

              <label style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 6, display: 'block', marginTop: 12 }}>
                Focus Keyword
              </label>
              <SidebarInput
                placeholder="Primary keyword"
                value={formData.focus_keyword || ''}
                onChange={e => setFormData(prev => ({ ...prev, focus_keyword: e.target.value }))}
              />
            </SidebarSection>

            <SidebarSection>
              <h4>Category</h4>
              <SidebarSelect
                value={formData.category_id || ''}
                onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value ? parseInt(e.target.value) : undefined }))}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </SidebarSelect>
            </SidebarSection>

            <SidebarSection>
              <h4>Featured Image</h4>
              <SidebarInput
                placeholder="Image URL"
                value={formData.cover_image_url || ''}
                onChange={e => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
              />
              {formData.cover_image_url && (
                <img
                  src={formData.cover_image_url}
                  alt="Cover"
                  style={{ width: '100%', borderRadius: 8, marginTop: 8 }}
                />
              )}
            </SidebarSection>

            <SidebarSection>
              <h4>Excerpt</h4>
              <SidebarTextarea
                placeholder="Brief description for listing pages..."
                value={formData.excerpt || ''}
                onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              />
            </SidebarSection>
          </EditorSidebar>
        </EditorBody>
      </EditorContainer>
    );
  };

  // Main render
  if (loading) {
    return (
      <Container style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div>Loading...</div>
      </Container>
    );
  }

  // Show editor inline (replacing posts list) when open
  if (isEditorOpen && currentView === 'posts') {
    return renderEditor();
  }

  return (
    <>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid ' + theme.colors.border, paddingBottom: '12px' }}>
        <button
          onClick={() => setCurrentView('posts')}
          style={{
            padding: '8px 16px',
            background: currentView === 'posts' ? theme.colors.primary : 'transparent',
            color: currentView === 'posts' ? '#fff' : theme.colors.text.secondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setCurrentView('comments')}
          style={{
            padding: '8px 16px',
            background: currentView === 'comments' ? theme.colors.primary : 'transparent',
            color: currentView === 'comments' ? '#fff' : theme.colors.text.secondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          style={{
            padding: '8px 16px',
            background: currentView === 'analytics' ? theme.colors.primary : 'transparent',
            color: currentView === 'analytics' ? '#fff' : theme.colors.text.secondary,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Analytics
        </button>
      </div>

      {currentView === 'posts' && renderPosts()}
      {currentView === 'categories' && renderCategories()}
      {currentView === 'comments' && renderComments()}
      {currentView === 'analytics' && renderAnalytics()}
    </>
  );
};

export default BlogAdmin;
