// =============================================
// Blog System TypeScript Interfaces
// Created: 2025-12-28
// =============================================

// Blog Post Status
export type BlogPostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

// Blog Post Visibility
export type BlogPostVisibility = 'public' | 'private' | 'password';

// Reaction Types
export type ReactionType = 'like' | 'love' | 'insightful' | 'helpful';

// =============================================
// Core Interfaces
// =============================================

export interface BlogCategory {
  id: number;
  slug: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent_id?: number;
  sort_order: number;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: number;
  slug: string;
  name: string;
  post_count?: number;
  created_at?: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  cover_image_alt?: string;

  // SEO
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  secondary_keywords?: string[];
  canonical_url?: string;
  og_image_url?: string;
  no_index?: boolean;

  // Author
  author_id?: string;
  author_name?: string;
  author_avatar_url?: string;
  author_bio?: string;

  // Category
  category_id?: number;
  category?: BlogCategory;

  // Status
  status: BlogPostStatus;
  visibility: BlogPostVisibility;
  published_at?: string;
  scheduled_at?: string;

  // Metrics
  view_count: number;
  unique_view_count?: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  reading_time_minutes: number;
  word_count: number;

  // Daily tracking (for "+X today" display)
  view_count_start_of_day?: number;
  like_count_start_of_day?: number;

  // Features
  featured: boolean;
  allow_comments: boolean;
  table_of_contents?: TableOfContentsItem[];

  // Schema.org
  schema_type?: string;
  schema_json?: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations (when joined)
  tags?: BlogTag[];
  categories?: BlogCategory[];
}

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number; // 1=H1, 2=H2, 3=H3, etc.
}

export interface BlogComment {
  id: number;
  post_id: number;
  user_id: string;
  parent_id?: number;
  content: string;
  likes_count: number;
  is_pinned: boolean;
  is_author_reply: boolean;
  created_at: string;
  updated_at: string;

  // Joined data
  user?: {
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  replies?: BlogComment[];
}

export interface BlogLike {
  id: number;
  post_id: number;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface BlogSubscriber {
  id: number;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  source: string;
  subscribed_at: string;
  unsubscribed_at?: string;
  confirmed_at?: string;
}

export interface BlogView {
  id: number;
  post_id: number;
  visitor_id?: string;
  session_id?: string;
  user_id?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  scroll_depth?: number;
  time_on_page?: number;
  created_at: string;
}

export interface BlogShare {
  id: number;
  post_id: number;
  platform: string;
  user_id?: string;
  created_at: string;
}

export interface BlogMedia {
  id: number;
  filename: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  storage_path: string;
  public_url?: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  uploaded_by?: string;
  created_at: string;
}

// =============================================
// Admin Stats
// =============================================

export interface BlogAdminStats {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_subscribers: number;
  posts_this_month: number;
  views_this_month: number;
  views_today: number;
  likes_today: number;
}

// =============================================
// API Response Types
// =============================================

export interface BlogPostListItem {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image_url?: string;
  author_name?: string;
  author_avatar_url?: string;
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  published_at?: string;
  reading_time_minutes: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags?: BlogTag[];
  total_count?: number;
}

export interface BlogPostDetail extends BlogPost {
  category_name?: string;
  category_slug?: string;
  category_color?: string;
}

export interface RelatedPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image_url?: string;
  author_name?: string;
  category_name?: string;
  category_slug?: string;
  published_at?: string;
  reading_time_minutes: number;
}

// =============================================
// Form Types
// =============================================

export interface BlogPostFormData {
  title: string;
  subtitle?: string;
  slug?: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  cover_image_alt?: string;

  // SEO
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  secondary_keywords?: string[];
  og_image_url?: string;
  no_index?: boolean;

  // Category & Tags
  category_id?: number;
  tag_ids?: number[];

  // Status
  status: BlogPostStatus;
  visibility: BlogPostVisibility;
  scheduled_at?: string;

  // Features
  featured?: boolean;
  allow_comments?: boolean;
}

export interface BlogCategoryFormData {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
}

export interface BlogTagFormData {
  name: string;
  slug?: string;
}

export interface BlogCommentFormData {
  post_id: number;
  parent_id?: number;
  content: string;
}

export interface BlogSubscriberFormData {
  email: string;
  name?: string;
  source?: string;
}

// =============================================
// SEO Types
// =============================================

export interface BlogSEOMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

export interface BlogSchemaOrg {
  '@context': string;
  '@type': string;
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author: {
    '@type': string;
    name: string;
    url?: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo?: {
      '@type': string;
      url: string;
    };
  };
  mainEntityOfPage?: {
    '@type': string;
    '@id': string;
  };
}

export interface BlogBreadcrumb {
  '@type': string;
  position: number;
  name: string;
  item?: string;
}

export interface BlogBreadcrumbList {
  '@context': string;
  '@type': string;
  itemListElement: BlogBreadcrumb[];
}

// =============================================
// AI Assistant Types
// =============================================

export interface BlogAIOutline {
  title: string;
  sections: {
    heading: string;
    level: number;
    points: string[];
    estimatedWords: number;
  }[];
  estimatedTotalWords: number;
  focusKeyword: string;
  suggestedTags: string[];
}

export interface BlogAISEOAnalysis {
  score: number;
  titleScore: number;
  metaDescriptionScore: number;
  keywordDensity: number;
  readabilityScore: number;
  headingStructure: boolean;
  internalLinks: number;
  externalLinks: number;
  imageAltTags: boolean;
  suggestions: string[];
}

export interface BlogAISuggestion {
  id: string;
  type: 'title' | 'meta' | 'content' | 'improvement' | 'cta' | 'social';
  original?: string;
  suggested: string;
  reason: string;
  accepted?: boolean;
}

// =============================================
// Filter & Pagination Types
// =============================================

export interface BlogFilters {
  status?: BlogPostStatus;
  category_id?: number;
  tag_id?: number;
  author_id?: string;
  featured?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface BlogPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BlogListResponse {
  posts: BlogPostListItem[];
  pagination: BlogPagination;
}

// =============================================
// Analytics Types
// =============================================

export interface BlogAnalyticsOverview {
  period: string;
  views: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface BlogTopPost {
  id: number;
  title: string;
  slug: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface BlogTrafficSource {
  source: string;
  visits: number;
  percentage: number;
}

export interface BlogDeviceBreakdown {
  device: string;
  visits: number;
  percentage: number;
}

export interface BlogCountryStats {
  country: string;
  visits: number;
  percentage: number;
}
