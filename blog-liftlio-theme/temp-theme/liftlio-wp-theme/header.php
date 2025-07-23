<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Header -->
<header class="header">
    <div class="container">
        <div class="header-content">
            <?php if (has_custom_logo()) : ?>
                <?php the_custom_logo(); ?>
            <?php else : ?>
                <a href="<?php echo esc_url(home_url('/')); ?>" class="logo">
                    <?php bloginfo('name'); ?>
                </a>
            <?php endif; ?>
            
            <nav class="nav">
                <?php
                wp_nav_menu(array(
                    'theme_location' => 'primary',
                    'container' => false,
                    'menu_class' => '',
                    'fallback_cb' => false,
                    'items_wrap' => '%3$s',
                    'walker' => new Liftlio_Nav_Walker(),
                ));
                ?>
            </nav>
        </div>
    </div>
</header>