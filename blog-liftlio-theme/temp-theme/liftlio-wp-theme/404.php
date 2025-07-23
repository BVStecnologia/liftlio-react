<?php
/**
 * The template for displaying 404 pages (not found)
 */

get_header();
?>

<!-- Main Content - White Background -->
<main class="main-content">
    <div class="container">
        <div class="post-container" style="text-align: center;">
            <h1 class="post-title">404</h1>
            <h2><?php _e('Page Not Found', 'liftlio-blog'); ?></h2>
            <p><?php _e('Sorry, the page you are looking for could not be found.', 'liftlio-blog'); ?></p>
            <a href="<?php echo esc_url(home_url('/')); ?>" class="btn-cta" style="display: inline-block; margin-top: 20px;">
                <?php _e('Go to Homepage', 'liftlio-blog'); ?>
            </a>
        </div>
    </div>
</main>

<?php
get_footer();