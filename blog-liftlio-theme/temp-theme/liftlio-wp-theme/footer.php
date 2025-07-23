<!-- Footer -->
<footer class="footer">
    <div class="container">
        <div class="footer-content">
            <div class="footer-brand">
                <h3><?php bloginfo('name'); ?></h3>
                <p style="color: #a1a1aa; line-height: 1.6;"><?php bloginfo('description'); ?></p>
            </div>
            
            <?php if (is_active_sidebar('footer-1')) : ?>
                <?php dynamic_sidebar('footer-1'); ?>
            <?php else : ?>
                <div>
                    <h4 style="margin-bottom: 16px;"><?php _e('Product', 'liftlio-blog'); ?></h4>
                    <ul class="footer-links">
                        <li><a href="/features"><?php _e('Features', 'liftlio-blog'); ?></a></li>
                        <li><a href="/pricing"><?php _e('Pricing', 'liftlio-blog'); ?></a></li>
                        <li><a href="/api"><?php _e('API', 'liftlio-blog'); ?></a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="margin-bottom: 16px;"><?php _e('Company', 'liftlio-blog'); ?></h4>
                    <ul class="footer-links">
                        <li><a href="/about"><?php _e('About', 'liftlio-blog'); ?></a></li>
                        <li><a href="/blog"><?php _e('Blog', 'liftlio-blog'); ?></a></li>
                        <li><a href="/careers"><?php _e('Careers', 'liftlio-blog'); ?></a></li>
                    </ul>
                </div>
                <div>
                    <h4 style="margin-bottom: 16px;"><?php _e('Legal', 'liftlio-blog'); ?></h4>
                    <ul class="footer-links">
                        <li><a href="/privacy"><?php _e('Privacy', 'liftlio-blog'); ?></a></li>
                        <li><a href="/terms"><?php _e('Terms', 'liftlio-blog'); ?></a></li>
                        <li><a href="/security"><?php _e('Security', 'liftlio-blog'); ?></a></li>
                    </ul>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="footer-bottom">
            <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. <?php _e('All rights reserved.', 'liftlio-blog'); ?></p>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>