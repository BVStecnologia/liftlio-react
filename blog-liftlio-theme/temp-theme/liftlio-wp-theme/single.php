<?php
/**
 * The template for displaying single posts
 */

get_header();
?>

<!-- Main Content - White Background -->
<main class="main-content">
    <div class="container">
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('post-container'); ?>>
                <div class="post-header">
                    <?php 
                    $category = liftlio_get_first_category();
                    if ($category) : ?>
                        <span class="blog-category"><?php echo esc_html($category->name); ?></span>
                    <?php endif; ?>
                    
                    <h1 class="post-title"><?php the_title(); ?></h1>
                    
                    <div class="blog-meta">
                        <div class="author-avatar">
                            <?php echo get_avatar(get_the_author_meta('ID'), 32); ?>
                        </div>
                        <span><?php the_author(); ?></span>
                        <span>•</span>
                        <span><?php echo get_the_date(); ?></span>
                        <span>•</span>
                        <span><?php echo liftlio_get_reading_time(); ?></span>
                    </div>
                </div>
                
                <?php if (has_post_thumbnail()) : ?>
                    <div class="post-featured-image">
                        <?php the_post_thumbnail('large'); ?>
                    </div>
                <?php endif; ?>
                
                <div class="post-content">
                    <?php the_content(); ?>
                </div>
                
                <?php
                // Post navigation
                the_post_navigation(array(
                    'prev_text' => '<span class="nav-subtitle">' . __('Previous:', 'liftlio-blog') . '</span> <span class="nav-title">%title</span>',
                    'next_text' => '<span class="nav-subtitle">' . __('Next:', 'liftlio-blog') . '</span> <span class="nav-title">%title</span>',
                ));
                
                // If comments are open or we have at least one comment
                if (comments_open() || get_comments_number()) :
                    comments_template();
                endif;
                ?>
            </article>
        <?php endwhile; ?>
    </div>
</main>

<?php
get_footer();