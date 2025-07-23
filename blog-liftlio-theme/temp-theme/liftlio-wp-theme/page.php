<?php
/**
 * The template for displaying all pages
 */

get_header();
?>

<!-- Main Content - White Background -->
<main class="main-content">
    <div class="container">
        <?php while (have_posts()) : the_post(); ?>
            <article <?php post_class('post-container'); ?>>
                <div class="post-header">
                    <h1 class="post-title"><?php the_title(); ?></h1>
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