<?php
/**
 * Plugin Name: Liftlio Canonical & Sitemap Fix
 * Plugin URI: https://liftlio.com
 * Description: Fixes canonical URLs and ensures sitemap is updated automatically when content is created
 * Version: 1.0
 * Author: Liftlio
 * Author URI: https://liftlio.com
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Force canonical URLs to use blog.liftlio.com
function liftlio_force_canonical_domain($canonical_url) {
    // Only modify if we have a valid URL
    if (empty($canonical_url)) {
        return $canonical_url;
    }
    
    // Ensure we're using blog.liftlio.com
    $canonical_url = str_replace('liftlio.com/blog/', 'blog.liftlio.com/', $canonical_url);
    $canonical_url = str_replace('www.liftlio.com/blog/', 'blog.liftlio.com/', $canonical_url);
    
    // Ensure HTTPS
    $canonical_url = str_replace('http://', 'https://', $canonical_url);
    
    return $canonical_url;
}
add_filter('get_canonical_url', 'liftlio_force_canonical_domain', 99);
add_filter('wpseo_canonical', 'liftlio_force_canonical_domain', 99);
add_filter('aioseo_canonical_url', 'liftlio_force_canonical_domain', 99);

// Hook into All in One SEO to ensure sitemap updates
function liftlio_update_sitemap_on_publish($post_id, $post, $update) {
    // Only run for published posts/pages
    if ($post->post_status !== 'publish') {
        return;
    }
    
    // Only run for posts and pages
    if (!in_array($post->post_type, ['post', 'page'])) {
        return;
    }
    
    // Trigger All in One SEO sitemap regeneration
    if (function_exists('aioseo')) {
        // Clear sitemap cache
        aioseo()->sitemap->cache->clear();
        
        // Log the update
        error_log('Liftlio: Sitemap cache cleared after publishing ' . $post->post_type . ' ID: ' . $post_id);
    }
    
    // Also clear any other caches
    if (function_exists('wp_cache_flush')) {
        wp_cache_flush();
    }
}
add_action('save_post', 'liftlio_update_sitemap_on_publish', 10, 3);

// Add sitemap link to robots.txt
function liftlio_add_sitemap_to_robots($output) {
    $sitemap_urls = [
        'Sitemap: https://blog.liftlio.com/sitemap.xml',
        'Sitemap: https://blog.liftlio.com/sitemap_index.xml',
        'Sitemap: https://blog.liftlio.com/post-sitemap.xml',
        'Sitemap: https://blog.liftlio.com/page-sitemap.xml'
    ];
    
    $output .= "\n\n# Liftlio Sitemaps\n";
    $output .= implode("\n", $sitemap_urls) . "\n";
    
    return $output;
}
add_filter('robots_txt', 'liftlio_add_sitemap_to_robots', 10, 1);

// Ensure All in One SEO sitemap is enabled
function liftlio_ensure_sitemap_enabled() {
    if (function_exists('aioseo')) {
        $options = get_option('aioseo_options');
        
        if ($options && is_array($options)) {
            // Enable sitemap
            $options['sitemap']['general']['enable'] = true;
            $options['sitemap']['general']['postTypes']['all'] = true;
            $options['sitemap']['general']['postTypes']['included'] = ['post', 'page'];
            
            update_option('aioseo_options', $options);
        }
    }
}
add_action('init', 'liftlio_ensure_sitemap_enabled');

// Add admin notice about sitemap location
function liftlio_sitemap_admin_notice() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    $sitemap_urls = [
        'https://blog.liftlio.com/sitemap.xml',
        'https://blog.liftlio.com/sitemap_index.xml'
    ];
    
    ?>
    <div class="notice notice-info is-dismissible">
        <p><strong>Liftlio Sitemap Info:</strong></p>
        <p>Your sitemap should be available at one of these URLs:</p>
        <ul>
            <?php foreach ($sitemap_urls as $url): ?>
                <li><a href="<?php echo esc_url($url); ?>" target="_blank"><?php echo esc_html($url); ?></a></li>
            <?php endforeach; ?>
        </ul>
        <p>The sitemap is automatically updated when you publish or update content.</p>
    </div>
    <?php
}
add_action('admin_notices', 'liftlio_sitemap_admin_notice');

// Debug function to check canonical URLs
function liftlio_debug_canonical() {
    if (!isset($_GET['debug_canonical']) || !current_user_can('manage_options')) {
        return;
    }
    
    echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 2px solid #000;">';
    echo '<h2>Canonical URL Debug</h2>';
    
    // Current URL
    $current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    echo '<p><strong>Current URL:</strong> ' . esc_html($current_url) . '</p>';
    
    // WordPress canonical
    $wp_canonical = get_canonical_url();
    echo '<p><strong>WordPress Canonical:</strong> ' . esc_html($wp_canonical) . '</p>';
    
    // All in One SEO canonical
    if (function_exists('aioseo')) {
        $aioseo_canonical = aioseo()->head->canonical();
        echo '<p><strong>All in One SEO Canonical:</strong> ' . esc_html($aioseo_canonical) . '</p>';
    }
    
    echo '</div>';
}
add_action('wp_head', 'liftlio_debug_canonical', 1);

// Force flush rewrite rules on activation
register_activation_hook(__FILE__, function() {
    flush_rewrite_rules();
    
    // Clear All in One SEO cache
    if (function_exists('aioseo')) {
        aioseo()->sitemap->cache->clear();
    }
});