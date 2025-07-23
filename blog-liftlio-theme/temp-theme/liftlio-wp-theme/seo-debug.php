<?php
/**
 * SEO Debug Functions for Liftlio Theme
 * 
 * Este arquivo contém funções de debug para verificar se as correções SEO estão funcionando.
 * Adicione estas funções ao functions.php se precisar debugar.
 */

// Debug: Verificar se a tag H1 está sendo exibida
function liftlio_debug_h1_output() {
    if (current_user_can('manage_options') && isset($_GET['debug_h1'])) {
        add_action('wp_footer', function() {
            echo '<div style="position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 20px; max-width: 400px; z-index: 9999;">';
            echo '<h3>Debug H1:</h3>';
            echo '<p>Página atual: ' . get_the_title() . '</p>';
            echo '<p>Template usado: ' . get_page_template_slug() . '</p>';
            echo '<p>ID da página: ' . get_the_ID() . '</p>';
            
            // Verificar se existe H1 no DOM
            echo '<script>
                document.addEventListener("DOMContentLoaded", function() {
                    var h1s = document.getElementsByTagName("h1");
                    var debugDiv = document.createElement("p");
                    debugDiv.innerHTML = "H1s encontrados: " + h1s.length;
                    if (h1s.length > 0) {
                        debugDiv.innerHTML += "<br>Primeiro H1: " + h1s[0].innerText;
                    }
                    document.querySelector("[style*=\'z-index: 9999\']").appendChild(debugDiv);
                });
            </script>';
            echo '</div>';
        });
    }
}
add_action('init', 'liftlio_debug_h1_output');

// Debug: Verificar URL canônica
function liftlio_debug_canonical() {
    if (current_user_can('manage_options') && isset($_GET['debug_canonical'])) {
        add_action('wp_footer', function() {
            echo '<div style="position: fixed; bottom: 20px; left: 20px; background: #333; color: #fff; padding: 20px; max-width: 400px; z-index: 9999;">';
            echo '<h3>Debug Canonical:</h3>';
            echo '<script>
                document.addEventListener("DOMContentLoaded", function() {
                    var canonical = document.querySelector("link[rel=\'canonical\']");
                    var debugDiv = document.querySelector("[style*=\'left: 20px\']");
                    if (canonical) {
                        debugDiv.innerHTML += "<p>URL Canônica: " + canonical.href + "</p>";
                    } else {
                        debugDiv.innerHTML += "<p style=\'color: red;\'>ERRO: Tag canonical não encontrada!</p>";
                    }
                });
            </script>';
            echo '</div>';
        });
    }
}
add_action('init', 'liftlio_debug_canonical');

// Forçar template padrão para páginas específicas se necessário
function liftlio_force_default_page_template($template) {
    if (is_page()) {
        $slug = get_post_field('post_name', get_the_ID());
        $force_default = array('about', 'privacy', 'security', 'terms');
        
        if (in_array($slug, $force_default)) {
            $default_template = locate_template(array('page.php'));
            if ($default_template) {
                return $default_template;
            }
        }
    }
    return $template;
}
// Descomente a linha abaixo se precisar forçar o uso do template page.php
// add_filter('template_include', 'liftlio_force_default_page_template', 99);

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Para debug de H1: Adicione ?debug_h1=1 à URL da página
 * 2. Para debug de canonical: Adicione ?debug_canonical=1 à URL da página
 * 3. Para debug completo: Adicione ?debug_h1=1&debug_canonical=1 à URL
 * 
 * Exemplo: https://liftlio.com/about?debug_h1=1&debug_canonical=1
 * 
 * IMPORTANTE: Remova estas funções de debug após resolver os problemas!
 */