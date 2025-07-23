<?php
/**
 * The template for displaying archive pages
 */

get_header();
?>

<!-- Blog Hero Section -->
<section class="blog-hero">
    <div class="container">
        <?php
        if (is_category()) :
            printf('<h1 class="blog-title">%s</h1>', single_cat_title('', false));
            the_archive_description('<p class="blog-subtitle">', '</p>');
        elseif (is_tag()) :
            printf('<h1 class="blog-title">%s</h1>', single_tag_title('', false));
        elseif (is_author()) :
            printf('<h1 class="blog-title">%s</h1>', get_the_author());
        elseif (is_day()) :
            printf('<h1 class="blog-title">%s</h1>', get_the_date());
        elseif (is_month()) :
            printf('<h1 class="blog-title">%s</h1>', get_the_date('F Y'));
        elseif (is_year()) :
            printf('<h1 class="blog-title">%s</h1>', get_the_date('Y'));
        else :
            _e('<h1 class="blog-title">Archives</h1>', 'liftlio-blog');
        endif;
        ?>
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
                <h2><?php _e('No posts found', 'liftlio-blog'); ?></h2>
                <p><?php _e('It seems we can\'t find what you\'re looking for.', 'liftlio-blog'); ?></p>
            </div>
        <?php endif; ?>
    </div>
</main>

<?php
get_footer();