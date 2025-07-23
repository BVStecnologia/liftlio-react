<?php
/**
 * Liftlio Blog Theme Functions
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Theme setup
function liftlio_theme_setup() {
    // Add support for post thumbnails
    add_theme_support('post-thumbnails');
    
    // Add support for automatic feed links
    add_theme_support('automatic-feed-links');
    
    // Add support for title tag
    add_theme_support('title-tag');
    
    // Add support for HTML5
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'liftlio-blog'),
        'footer' => __('Footer Menu', 'liftlio-blog'),
    ));
    
    // Add support for custom logo
    add_theme_support('custom-logo', array(
        'height' => 100,
        'width' => 300,
        'flex-height' => true,
        'flex-width' => true,
    ));
}
add_action('after_setup_theme', 'liftlio_theme_setup');

// Fix image overflow issues
function liftlio_fix_image_overflow_css() {
    ?>
    <style>
        /* Global image fixes to prevent overflow */
        img {
            max-width: 100% !important;
            height: auto !important;
        }
        
        /* Fix images in post content */
        .entry-content img,
        .post-content img,
        .blog-content img,
        article img,
        .wp-block-image img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 20px auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Fix blog card container */
        .blog-card {
            overflow: hidden !important;
        }
        
        /* Fix blog card images */
        .blog-card img {
            width: 100% !important;
            height: auto !important;
            object-fit: cover !important;
            max-width: 100% !important;
        }
        
        /* Fix featured image container */
        .blog-image {
            overflow: hidden !important;
            max-width: 100% !important;
            height: 200px;
        }
        
        /* Fix featured images */
        .blog-image img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }
        
        /* WordPress specific image classes */
        .size-full,
        .size-large,
        .size-medium,
        .size-thumbnail {
            max-width: 100% !important;
            height: auto !important;
        }
        
        /* Gutenberg blocks */
        .wp-block-image {
            max-width: 100% !important;
        }
        
        .wp-block-image img {
            max-width: 100% !important;
            height: auto !important;
        }
        
        /* Fix inline styles */
        img[style*="width"] {
            max-width: 100% !important;
        }
        
        /* Container overflow fix */
        .container,
        .post-container,
        .main-content,
        .blog-grid {
            overflow-x: hidden !important;
        }
        
        /* Prevent horizontal scroll */
        html, body {
            overflow-x: hidden !important;
            max-width: 100% !important;
        }
        
        /* Mobile specific fixes */
        @media (max-width: 768px) {
            .entry-content img,
            .post-content img,
            article img {
                max-width: calc(100vw - 30px) !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
            
            .blog-card {
                max-width: 100% !important;
            }
            
            .blog-card img,
            .blog-image img {
                margin: 0 !important;
                width: 100% !important;
            }
        }
    </style>
    <?php
}
add_action('wp_head', 'liftlio_fix_image_overflow_css', 999);

// Enqueue scripts and styles
function liftlio_enqueue_scripts() {
    // Enqueue Google Fonts
    wp_enqueue_style('liftlio-google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap', array(), null);
    
    // Enqueue theme stylesheet
    wp_enqueue_style('liftlio-style', get_stylesheet_uri(), array(), '1.0.0');
    
    // Enqueue comment reply script if needed
    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('comment-reply');
    }
}
add_action('wp_enqueue_scripts', 'liftlio_enqueue_scripts');

// Register widget areas
function liftlio_widgets_init() {
    register_sidebar(array(
        'name' => __('Sidebar', 'liftlio-blog'),
        'id' => 'sidebar-1',
        'description' => __('Add widgets here to appear in your sidebar.', 'liftlio-blog'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget' => '</section>',
        'before_title' => '<h2 class="widget-title">',
        'after_title' => '</h2>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area', 'liftlio-blog'),
        'id' => 'footer-1',
        'description' => __('Add widgets here to appear in your footer.', 'liftlio-blog'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h4 class="widget-title">',
        'after_title' => '</h4>',
    ));
}
add_action('widgets_init', 'liftlio_widgets_init');

// Custom excerpt length
function liftlio_excerpt_length($length) {
    return 20;
}
add_filter('excerpt_length', 'liftlio_excerpt_length');

// Custom excerpt more
function liftlio_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'liftlio_excerpt_more');

// Get first category
function liftlio_get_first_category($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    
    $categories = get_the_category($post_id);
    if (!empty($categories)) {
        return $categories[0];
    }
    
    return null;
}

// Custom read time calculation
function liftlio_get_reading_time($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    
    $content = get_post_field('post_content', $post_id);
    $word_count = str_word_count(strip_tags($content));
    $minutes = ceil($word_count / 200); // Average reading speed
    
    return $minutes . ' min read';
}

// Add custom image sizes
add_image_size('liftlio-blog-thumbnail', 350, 200, true);

// Disable WordPress emoji
function liftlio_disable_emojis() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
}
add_action('init', 'liftlio_disable_emojis');

// Security: Remove WordPress version
remove_action('wp_head', 'wp_generator');

// Security: Disable XML-RPC
add_filter('xmlrpc_enabled', '__return_false');

// Security: Remove unnecessary headers
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('wp_head', 'rest_output_link_wp_head', 10);
remove_action('wp_head', 'wp_oembed_add_discovery_links', 10);

// Include custom nav walker
require_once get_template_directory() . '/inc/nav-walker.php';

// Add canonical URLs to all pages
function liftlio_add_canonical_url() {
    // Get the canonical URL
    $canonical_url = '';
    
    if (is_singular()) {
        // For single posts, pages, and custom post types
        $canonical_url = get_permalink();
    } elseif (is_home() || is_front_page()) {
        // For homepage
        $canonical_url = home_url('/');
    } elseif (is_category() || is_tag() || is_tax()) {
        // For taxonomy archives
        $canonical_url = get_term_link(get_queried_object());
    } elseif (is_author()) {
        // For author archives
        $canonical_url = get_author_posts_url(get_queried_object_id());
    } elseif (is_year()) {
        // For year archives
        $canonical_url = get_year_link(get_query_var('year'));
    } elseif (is_month()) {
        // For month archives
        $canonical_url = get_month_link(get_query_var('year'), get_query_var('monthnum'));
    } elseif (is_day()) {
        // For day archives
        $canonical_url = get_day_link(get_query_var('year'), get_query_var('monthnum'), get_query_var('day'));
    } elseif (is_search()) {
        // For search results
        $canonical_url = get_search_link();
    } elseif (is_404()) {
        // For 404 pages
        $canonical_url = home_url('/404');
    }
    
    // Handle pagination
    if (is_paged()) {
        $paged = get_query_var('paged');
        if ($paged > 1) {
            $canonical_url = trailingslashit($canonical_url) . 'page/' . $paged . '/';
        }
    }
    
    // Make sure we have a valid URL
    if (!empty($canonical_url) && !is_wp_error($canonical_url)) {
        // Ensure HTTPS if site is using HTTPS
        if (is_ssl()) {
            $canonical_url = str_replace('http://', 'https://', $canonical_url);
        }
        
        // Ensure the canonical URL uses the correct domain (handles subdomains like blog.liftlio.com)
        $site_url = home_url();
        $parsed_site = parse_url($site_url);
        $parsed_canonical = parse_url($canonical_url);
        
        // If the hosts don't match, update the canonical URL to use the site's host
        if (isset($parsed_site['host']) && isset($parsed_canonical['host'])) {
            if ($parsed_site['host'] !== $parsed_canonical['host']) {
                $canonical_url = str_replace($parsed_canonical['host'], $parsed_site['host'], $canonical_url);
            }
        }
        
        echo '<link rel="canonical" href="' . esc_url($canonical_url) . '" />' . "\n";
    }
}
add_action('wp_head', 'liftlio_add_canonical_url', 1);

// Ensure H1 tags are properly displayed
function liftlio_ensure_h1_tags() {
    // This is a helper function that can be used in templates
    // The actual H1 implementation will be in the page templates
    return true;
}