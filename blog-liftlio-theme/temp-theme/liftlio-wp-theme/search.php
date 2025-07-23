<?php
/**
 * The template for displaying search results
 */

get_header();
?>

<!-- Blog Hero Section -->
<section class="blog-hero">
    <div class="container">
        <h1 class="blog-title"><?php _e('Search Results', 'liftlio-blog'); ?></h1>
        <p class="blog-subtitle">
            <?php printf(__('Search results for: %s', 'liftlio-blog'), '<strong>' . get_search_query() . '</strong>'); ?>
        </p>
    </div>
</section>

<!-- Main Content - White Background -->
<main class="main-content">
    <div class="container">
        <?php if (have_posts()) : ?>
            <!-- Blog Grid -->
            <div class="blog-grid">
                <?php while (have_posts()) : the_post(); ?>
                    <article <?php post_class('blog-card'); ?>>
                        <a href="<?php the_permalink(); ?>" style="text-decoration: none; color: inherit;">
                            <?php if (has_post_thumbnail()) : ?>
                                <div class="blog-image">
                                    <?php the_post_thumbnail('liftlio-blog-thumbnail'); ?>
                                </div>
                            <?php else : ?>
                                <div class="blog-image"></div>
                            <?php endif; ?>
                            
                            <div class="blog-content">
                                <?php 
                                $category = liftlio_get_first_category();
                                if ($category) : ?>
                                    <span class="blog-category"><?php echo esc_html($category->name); ?></span>
                                <?php endif; ?>
                                
                                <h2 class="blog-card-title"><?php the_title(); ?></h2>
                                <p class="blog-excerpt"><?php echo get_the_excerpt(); ?></p>
                                
                                <div class="blog-meta">
                                    <div class="author-avatar">
                                        <?php echo get_avatar(get_the_author_meta('ID'), 32); ?>
                                    </div>
                                    <span><?php the_author(); ?></span>
                                    <span>•</span>
                                    <span><?php echo liftlio_get_reading_time(); ?></span>
                                </div>
                            </div>
                        </a>
                    </article>
                <?php endwhile; ?>
            </div>
            
            <!-- Pagination -->
            <div class="pagination">
                <?php
                the_posts_pagination(array(
                    'mid_size' => 2,
                    'prev_text' => __('Previous', 'liftlio-blog'),
                    'next_text' => __('Next', 'liftlio-blog'),
                ));
                ?>
            </div>
            
        <?php else : ?>
            <div class="no-posts">
                <h2><?php _e('No results found', 'liftlio-blog'); ?></h2>
                <p><?php _e('Sorry, but nothing matched your search terms. Please try again with different keywords.', 'liftlio-blog'); ?></p>
                
                <?php get_search_form(); ?>
            </div>
        <?php endif; ?>
    </div>
</main>

<?php
get_footer();