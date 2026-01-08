import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabaseClient';
import type { BlogPostListItem, BlogCategory, BlogTag, BlogPagination } from '../types/blog';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bg.primary};
`;

const Header = styled.header`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 80px 0 60px;
  text-align: center;
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
    padding: 60px 20px 40px;
  }
`;

const HeaderContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Logo = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 700;
  color: white;
  text-decoration: none;
  margin-bottom: 24px;

  span {
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  max-width: 600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;

  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;

const FiltersSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CategoryTab = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: ${props => props.$active ? '#8b5cf6' : props.theme.colors.bg.secondary};
  color: ${props => props.$active ? 'white' : props.theme.colors.text.secondary};

  &:hover {
    background: ${props => props.$active ? '#7c3aed' : props.theme.colors.bg.tertiary};
  }
`;

const SearchBox = styled.div`
  position: relative;
  width: 300px;

  @media (max-width: 768px) {
    width: 100%;
  }

  input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border-radius: 12px;
    border: 1px solid ${props => props.theme.colors.border.primary};
    background: ${props => props.theme.colors.bg.secondary};
    color: ${props => props.theme.colors.text.primary};
    font-size: 14px;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    &::placeholder {
      color: ${props => props.theme.colors.text.muted};
    }
  }

  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.colors.text.muted};
  }
`;

const PostsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PostCard = styled.article`
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

const PostImage = styled.div<{ $src?: string }>`
  height: 200px;
  background: ${props => props.$src
    ? `url(${props.$src}) center/cover`
    : `linear-gradient(135deg, ${props.theme.colors.bg.tertiary} 0%, ${props.theme.colors.bg.secondary} 100%)`};
  position: relative;
`;

const PostCategory = styled.span<{ $color?: string }>`
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.$color || '#8b5cf6'};
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PostContent = styled.div`
  padding: 24px;
`;

const PostTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PostExcerpt = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 16px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.muted};
`;

const PostAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const PostStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const TagsList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.colors.border.primary};
`;

const Tag = styled.span`
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => props.theme.colors.bg.tertiary};
  color: ${props => props.theme.colors.text.secondary};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 48px;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${props => props.$active ? '#8b5cf6' : props.theme.colors.border.primary};
  background: ${props => props.$active ? '#8b5cf6' : props.theme.colors.bg.secondary};
  color: ${props => props.$active ? 'white' : props.theme.colors.text.secondary};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #8b5cf6;
    color: #8b5cf6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FeaturedSection = styled.section`
  margin-bottom: 48px;
`;

const FeaturedPost = styled.article`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  background: ${props => props.theme.colors.bg.secondary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 20px 60px rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.3);
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FeaturedImage = styled.div<{ $src?: string }>`
  min-height: 400px;
  background: ${props => props.$src
    ? `url(${props.$src}) center/cover`
    : `linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)`};

  @media (max-width: 900px) {
    min-height: 250px;
  }
`;

const FeaturedContent = styled.div`
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 900px) {
    padding: 24px;
  }
`;

const FeaturedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
  color: white;
  width: fit-content;
  margin-bottom: 16px;
`;

const FeaturedTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 16px;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const FeaturedExcerpt = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 24px;
  line-height: 1.7;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: ${props => props.theme.colors.text.secondary};

  h3 {
    font-size: 20px;
    margin: 16px 0 8px;
    color: ${props => props.theme.colors.text.primary};
  }

  p {
    max-width: 400px;
    margin: 0 auto;
  }
`;

const Footer = styled.footer`
  background: ${props => props.theme.colors.bg.secondary};
  border-top: 1px solid ${props => props.theme.colors.border.primary};
  padding: 40px 24px;
  text-align: center;
  margin-top: 80px;
`;

const FooterLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;

  a {
    color: ${props => props.theme.colors.text.secondary};
    text-decoration: none;
    font-size: 14px;
    transition: color 0.2s;

    &:hover {
      color: #8b5cf6;
    }
  }
`;

const FooterCopy = styled.p`
  color: ${props => props.theme.colors.text.muted};
  font-size: 13px;
  margin: 0;
`;

// ==========================================
// ICONS
// ==========================================

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

const ViewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

const BlogList: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPostListItem | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<BlogPagination>({
    page: 1,
    pageSize: 9,
    totalItems: 0,
    totalPages: 0
  });

  // URL params
  const currentCategory = searchParams.get('category') || '';
  const currentTag = searchParams.get('tag') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('q') || '';

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Fetch posts with RPC
        const { data, error } = await supabase.rpc('get_published_blog_posts', {
          page_num: currentPage,
          page_size: pagination.pageSize,
          category_slug_param: currentCategory || null,
          tag_slug_param: currentTag || null
        });

        if (error) throw error;

        if (data && data.length > 0) {
          // First post is featured on page 1
          if (currentPage === 1 && !currentCategory && !currentTag && !searchQuery) {
            const featured = data.find((p: BlogPostListItem) => p.view_count > 100) || data[0];
            setFeaturedPost(featured);
            setPosts(data.filter((p: BlogPostListItem) => p.id !== featured.id));
          } else {
            setFeaturedPost(null);
            setPosts(data);
          }

          const totalCount = data[0]?.total_count || data.length;
          setPagination(prev => ({
            ...prev,
            page: currentPage,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / prev.pageSize)
          }));
        } else {
          setPosts([]);
          setFeaturedPost(null);
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, currentCategory, currentTag, searchQuery]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('blog_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data) setCategories(data);
    };

    fetchCategories();
  }, []);

  // Handlers
  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPost = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <PageContainer>
      <Helmet>
        <title>Blog | Liftlio - Video Monitoring & AI Insights</title>
        <meta name="description" content="Explore articles about video marketing, AI-powered analytics, sentiment analysis, and YouTube growth strategies. Stay updated with the latest insights from Liftlio." />
        <meta name="keywords" content="video marketing, YouTube analytics, AI insights, sentiment analysis, video monitoring, content strategy" />
        <link rel="canonical" href="https://liftlio.com/blog" />

        {/* Open Graph */}
        <meta property="og:title" content="Liftlio Blog - Video Marketing & AI Insights" />
        <meta property="og:description" content="Discover strategies for video marketing, AI analytics, and growing your YouTube presence." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://liftlio.com/blog" />
        <meta property="og:image" content="https://liftlio.com/og-blog.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Liftlio Blog - Video Marketing & AI Insights" />
        <meta name="twitter:description" content="Discover strategies for video marketing, AI analytics, and growing your YouTube presence." />

        {/* Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Liftlio Blog',
            description: 'Articles about video marketing, AI analytics, and content strategy',
            url: 'https://liftlio.com/blog',
            publisher: {
              '@type': 'Organization',
              name: 'Liftlio',
              logo: {
                '@type': 'ImageObject',
                url: 'https://liftlio.com/logo.png'
              }
            }
          })}
        </script>
      </Helmet>

      <Header>
        <HeaderContent>
          <Logo href="/">
            <span>Liftlio</span> Blog
          </Logo>
          <Title>Insights & Strategies</Title>
          <Subtitle>
            Discover the latest in video marketing, AI-powered analytics, and content strategies to grow your online presence.
          </Subtitle>
        </HeaderContent>
      </Header>

      <MainContent>
        <FiltersSection>
          <CategoryTabs>
            <CategoryTab
              $active={!currentCategory}
              onClick={() => handleCategoryChange('')}
            >
              All Posts
            </CategoryTab>
            {categories.map(cat => (
              <CategoryTab
                key={cat.id}
                $active={currentCategory === cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
              >
                {cat.name}
              </CategoryTab>
            ))}
          </CategoryTabs>

          <SearchBox>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search articles..."
              defaultValue={searchQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch((e.target as HTMLInputElement).value);
                }
              }}
            />
          </SearchBox>
        </FiltersSection>

        {loading ? (
          <LoadingContainer>
            <Spinner />
            <p style={{ marginTop: '16px' }}>Loading articles...</p>
          </LoadingContainer>
        ) : posts.length === 0 && !featuredPost ? (
          <EmptyState>
            <CommentIcon />
            <h3>No articles found</h3>
            <p>Try adjusting your filters or check back later for new content.</p>
          </EmptyState>
        ) : (
          <>
            {featuredPost && (
              <FeaturedSection>
                <FeaturedPost onClick={() => openPost(featuredPost.slug)}>
                  <FeaturedImage $src={featuredPost.cover_image_url || undefined} />
                  <FeaturedContent>
                    <FeaturedBadge>
                      <StarIcon /> Featured
                    </FeaturedBadge>
                    {featuredPost.category_name && (
                      <PostCategory $color={featuredPost.category_color || undefined} style={{ position: 'relative', marginBottom: '12px', display: 'inline-block' }}>
                        {featuredPost.category_name}
                      </PostCategory>
                    )}
                    <FeaturedTitle>{featuredPost.title}</FeaturedTitle>
                    <FeaturedExcerpt>{featuredPost.excerpt}</FeaturedExcerpt>
                    <PostMeta>
                      <PostAuthor>
                        {featuredPost.author_avatar_url && (
                          <img src={featuredPost.author_avatar_url} alt={featuredPost.author_name || 'Author'} />
                        )}
                        <span>{featuredPost.author_name || 'Liftlio Team'}</span>
                      </PostAuthor>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ClockIcon /> {featuredPost.reading_time_minutes} min read
                      </span>
                      {featuredPost.published_at && (
                        <span>{formatDate(featuredPost.published_at)}</span>
                      )}
                    </PostMeta>
                  </FeaturedContent>
                </FeaturedPost>
              </FeaturedSection>
            )}

            <PostsGrid>
              {posts.map(post => (
                <PostCard key={post.id} onClick={() => openPost(post.slug)}>
                  <PostImage $src={post.cover_image_url || undefined}>
                    {post.category_name && (
                      <PostCategory $color={post.category_color || undefined}>
                        {post.category_name}
                      </PostCategory>
                    )}
                  </PostImage>
                  <PostContent>
                    <PostTitle>{post.title}</PostTitle>
                    <PostExcerpt>{post.excerpt}</PostExcerpt>
                    <PostMeta>
                      <PostAuthor>
                        {post.author_avatar_url && (
                          <img src={post.author_avatar_url} alt={post.author_name || 'Author'} />
                        )}
                        <span>{post.author_name || 'Liftlio'}</span>
                      </PostAuthor>
                      <PostStats>
                        <span><ViewIcon /> {post.view_count}</span>
                        <span><HeartIcon /> {post.like_count}</span>
                      </PostStats>
                    </PostMeta>
                    {post.tags && post.tags.length > 0 && (
                      <TagsList>
                        {post.tags.slice(0, 3).map(tag => (
                          <Tag key={tag.slug}>{tag.name}</Tag>
                        ))}
                      </TagsList>
                    )}
                  </PostContent>
                </PostCard>
              ))}
            </PostsGrid>

            {pagination.totalPages > 1 && (
              <Pagination>
                <PageButton
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  &lt;
                </PageButton>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    const current = pagination.page;
                    return page === 1 || page === pagination.totalPages ||
                           (page >= current - 1 && page <= current + 1);
                  })
                  .map((page, index, arr) => (
                    <React.Fragment key={page}>
                      {index > 0 && arr[index - 1] !== page - 1 && (
                        <span style={{ color: theme.colors.text.muted }}>...</span>
                      )}
                      <PageButton
                        $active={page === pagination.page}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </PageButton>
                    </React.Fragment>
                  ))
                }
                <PageButton
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  &gt;
                </PageButton>
              </Pagination>
            )}
          </>
        )}
      </MainContent>

      <Footer>
        <FooterLinks>
          <a href="/">Home</a>
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/blog">Blog</a>
          <a href="/contact">Contact</a>
        </FooterLinks>
        <FooterCopy>
          &copy; {new Date().getFullYear()} Liftlio. All rights reserved.
        </FooterCopy>
      </Footer>
    </PageContainer>
  );
};

export default BlogList;
