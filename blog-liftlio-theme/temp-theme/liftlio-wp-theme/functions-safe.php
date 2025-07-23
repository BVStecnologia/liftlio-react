<?php
/**
 * Liftlio Blog Theme - Safe Mode Functions
 * 
 * This is a minimal functions file with only essential features.
 * Use this if the main functions.php is causing errors.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Basic theme setup
function liftlio_safe_theme_setup() {
    // Add support for post thumbnails
    add_theme_support('post-thumbnails');
    
    // Add support for title tag
    add_theme_support('title-tag');
    
    // Add support for automatic feed links
    add_theme_support('automatic-feed-links');
}
add_action('after_setup_theme', 'liftlio_safe_theme_setup');

// Enqueue only essential styles
function liftlio_safe_enqueue_scripts() {
    // Enqueue theme stylesheet
    wp_enqueue_style('liftlio-style', get_stylesheet_uri(), array(), '1.0.0');
}
add_action('wp_enqueue_scripts', 'liftlio_safe_enqueue_scripts');

// Basic nav walker fallback
class Liftlio_Nav_Walker extends Walker_Nav_Menu {
    function start_el(&$output, $item, $depth = 0, $args = null, $id = 0) {
        $output .= '<a href="' . esc_attr($item->url) . '" class="nav-link">';
        $output .= apply_filters('the_title', $item->title, $item->ID);
        $output .= '</a>';
    }
}