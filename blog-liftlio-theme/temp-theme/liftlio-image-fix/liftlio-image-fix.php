<?php
/**
 * Plugin Name: Liftlio Image Fix
 * Plugin URI: https://liftlio.com
 * Description: Fixes image overflow issues in blog posts
 * Version: 1.0
 * Author: Liftlio
 * Author URI: https://liftlio.com
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add custom CSS to fix image overflow
function liftlio_fix_image_overflow() {
    ?>
    <style>
        /* Global image fixes */
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
        
        /* Fix blog card images */
        .blog-card {
            overflow: hidden !important;
        }
        
        .blog-card img {
            width: 100% !important;
            height: auto !important;
            object-fit: cover !important;
        }
        
        /* Fix featured images */
        .blog-image {
            overflow: hidden !important;
            max-width: 100% !important;
        }
        
        .blog-image img {
            width: 100% !important;
            height: 200px !important;
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
        
        /* Inline images with styles */
        img[style*="width"] {
            max-width: 100% !important;
        }
        
        /* Container fix */
        .container,
        .post-container,
        .main-content {
            overflow-x: hidden !important;
        }
        
        /* Mobile specific fixes */
        @media (max-width: 768px) {
            img {
                max-width: 100vw !important;
                margin-left: calc(-50vw + 50%) !important;
                margin-right: calc(-50vw + 50%) !important;
                width: 100vw !important;
                max-width: 100vw !important;
                border-radius: 0 !important;
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
add_action('wp_head', 'liftlio_fix_image_overflow', 999);

// Add viewport meta tag if not present
function liftlio_add_viewport_meta() {
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
}
add_action('wp_head', 'liftlio_add_viewport_meta', 1);

// Filter content to wrap images
function liftlio_wrap_content_images($content) {
    // Add responsive wrapper to images
    $content = preg_replace(
        '/<img([^>]+)>/i',
        '<div class="liftlio-image-wrapper"><img$1></div>',
        $content
    );
    
    return $content;
}
add_filter('the_content', 'liftlio_wrap_content_images');

// Add wrapper styles
function liftlio_image_wrapper_styles() {
    ?>
    <style>
        .liftlio-image-wrapper {
            max-width: 100%;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .liftlio-image-wrapper img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
        }
    </style>
    <?php
}
add_action('wp_head', 'liftlio_image_wrapper_styles');