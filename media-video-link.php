<?php
/**
 * Plugin Name: Media Video Link
 * Plugin URI: https://example.com
 * Description: Adds a video link field to the media library attachment details, positioned after the File URL field.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: media-video-link
 */

if (!defined('ABSPATH')) {
    exit;
}

// Debug: Add admin notice to verify plugin is loading (remove this line for production)
// add_action('admin_notices', function() {
//     if (current_user_can('manage_options')) {
//         echo '<div class="notice notice-success"><p>🎬 Media Video Link plugin is ACTIVE and loading!</p></div>';
//     }
// });

class MediaVideoLink {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        add_filter('attachment_fields_to_edit', array($this, 'add_video_link_field'), 10, 2);
        add_filter('attachment_fields_to_save', array($this, 'save_video_link_field'), 10, 2);
        add_action('wp_ajax_save-attachment-compat', array($this, 'ajax_save_video_link'), 0);
        
        // Admin settings
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Frontend functionality for WooCommerce
        if (class_exists('WooCommerce')) {
            add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
            add_filter('woocommerce_single_product_image_thumbnail_html', array($this, 'add_play_button_to_gallery_image'), 10, 2);
            add_action('wp_footer', array($this, 'add_debug_footer'), 99);
        }
        
        // REST API
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    /**
     * Add settings page to admin menu
     */
    public function add_settings_page() {
        add_options_page(
            __('Media Video Link Settings', 'media-video-link'),
            __('Media Video Link', 'media-video-link'),
            'manage_options',
            'media-video-link',
            array($this, 'settings_page_callback')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('mvl_settings', 'mvl_display_mode', array(
            'type' => 'string',
            'default' => 'inline',
            'sanitize_callback' => array($this, 'sanitize_display_mode')
        ));
        
        add_settings_section(
            'mvl_general_settings',
            __('General Settings', 'media-video-link'),
            array($this, 'settings_section_callback'),
            'media-video-link'
        );
        
        add_settings_field(
            'mvl_display_mode',
            __('Video Display Mode', 'media-video-link'),
            array($this, 'display_mode_field_callback'),
            'media-video-link',
            'mvl_general_settings'
        );
    }
    
    /**
     * Sanitize display mode setting
     */
    public function sanitize_display_mode($value) {
        $valid_modes = array('modal', 'inline');
        return in_array($value, $valid_modes) ? $value : 'inline';
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>' . __('Configure how videos are displayed in the product gallery.', 'media-video-link') . '</p>';
    }
    
    /**
     * Display mode field callback
     */
    public function display_mode_field_callback() {
        $display_mode = get_option('mvl_display_mode', 'inline');
        ?>
        <select name="mvl_display_mode" id="mvl_display_mode">
            <option value="inline" <?php selected($display_mode, 'inline'); ?>>
                <?php _e('Inline Gallery (Default)', 'media-video-link'); ?>
            </option>
            <option value="modal" <?php selected($display_mode, 'modal'); ?>>
                <?php _e('Modal Popup', 'media-video-link'); ?>
            </option>
        </select>
        <p class="description">
            <?php _e('Inline Gallery: Videos play directly within the gallery slider.', 'media-video-link'); ?><br>
            <?php _e('Modal Popup: Videos open in a popup overlay when clicked.', 'media-video-link'); ?>
        </p>
        <?php
    }
    
    /**
     * Settings page callback
     */
    public function settings_page_callback() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('mvl_settings');
                do_settings_sections('media-video-link');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Add video link field to attachment edit form
     */
    public function add_video_link_field($form_fields, $post) {
        $video_link = get_post_meta($post->ID, '_video_link', true);
        
        // Get the File URL field and add our field after it
        $file_url_field = isset($form_fields['url']) ? $form_fields['url'] : null;
        
        // Create a new array to maintain field order
        $new_form_fields = array();
        
        // Add all fields up to and including the File URL field
        foreach ($form_fields as $key => $field) {
            $new_form_fields[$key] = $field;
            
            // Add our video link field right after the File URL field
            if ($key === 'url') {
                $new_form_fields['video_link'] = array(
                    'label' => __('Video Link', 'media-video-link'),
                    'input' => 'text',
                    'value' => $video_link,
                    'helps' => __('Enter a video URL (YouTube, Vimeo, etc.) associated with this media file.', 'media-video-link'),
                );
            }
        }
        
        // If File URL field wasn't found, add video link field at the end
        if (!isset($new_form_fields['video_link'])) {
            $new_form_fields['video_link'] = array(
                'label' => __('Video Link', 'media-video-link'),
                'input' => 'text',
                'value' => $video_link,
                'helps' => __('Enter a video URL (YouTube, Vimeo, etc.) associated with this media file.', 'media-video-link'),
            );
        }
        
        return $new_form_fields;
    }
    
    /**
     * Save video link field
     */
    public function save_video_link_field($post, $attachment) {
        if (isset($attachment['video_link'])) {
            $video_link = sanitize_url($attachment['video_link']);
            update_post_meta($post['ID'], '_video_link', $video_link);
        }
        
        return $post;
    }
    
    /**
     * Handle AJAX save for video link field
     */
    public function ajax_save_video_link() {
        if (!current_user_can('upload_files')) {
            wp_die();
        }
        
        $post_id = intval($_POST['id']);
        
        if (isset($_POST['attachments'][$post_id]['video_link'])) {
            $video_link = sanitize_url($_POST['attachments'][$post_id]['video_link']);
            update_post_meta($post_id, '_video_link', $video_link);
        }
    }
    
    /**
     * Enqueue frontend assets
     */
    public function enqueue_frontend_assets() {
        // Load on product pages and for debugging purposes
        if (is_product() || (is_admin() && current_user_can('manage_options'))) {
            $css_url = plugin_dir_url(__FILE__) . 'assets/frontend.css';
            $js_url = plugin_dir_url(__FILE__) . 'assets/frontend.js';
            
            // Debug: Log asset URLs (only for admins)
            if (current_user_can('manage_options')) {
                error_log('MVL CSS URL: ' . $css_url);
                error_log('MVL JS URL: ' . $js_url);
            }
            
            wp_enqueue_style('media-video-link-frontend', $css_url, array(), '1.0.9');
            wp_enqueue_script('media-video-link-frontend', $js_url, array('jquery'), '1.0.9', true);
            
            // Add debugging data and settings
            wp_localize_script('media-video-link-frontend', 'mvl_settings', array(
                'plugin_url' => plugin_dir_url(__FILE__),
                'is_product' => is_product() ? 'yes' : 'no',
                'debug' => current_user_can('manage_options') ? 'yes' : 'no',
                'display_mode' => get_option('mvl_display_mode', 'inline')
            ));
        }
    }
    
    /**
     * Add play button overlay to gallery images that have video links
     */
    public function add_play_button_to_gallery_image($html, $attachment_id) {
        $video_link = get_post_meta($attachment_id, '_video_link', true);
        $display_mode = get_option('mvl_display_mode', 'inline');
        
        if (!empty($video_link)) {
            // Add data attributes for video URL and attachment ID
            $data_attrs = 'data-video-url="' . esc_url($video_link) . '" data-attachment-id="' . esc_attr($attachment_id) . '"';
            
            if ($display_mode === 'inline') {
                // For inline mode, add the video element but keep it hidden initially
                $video_element = '<div class="mvl-inline-video-container" style="display:none;" ' . $data_attrs . '>';
                $video_element .= '<div class="mvl-video-wrapper">';
                
                // Check if it's a self-hosted video or external
                if (preg_match('/\.(mp4|webm|ogv|ogg)(\?.*)?$/i', $video_link)) {
                    $video_element .= '<video class="mvl-inline-video" controls preload="metadata">';
                    $video_element .= '<source src="' . esc_url($video_link) . '" type="video/mp4">';
                    $video_element .= 'Your browser does not support the video tag.';
                    $video_element .= '</video>';
                } else {
                    // For external videos, we'll use an iframe
                    $video_element .= '<div class="mvl-inline-iframe-container"></div>';
                }
                
                $video_element .= '</div>';
                $video_element .= '</div>';
                
                // Insert video element inside the gallery image div, after all content
                $html = preg_replace('/(<div[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>.*?)(<\/div>)$/s', 
                    '$1' . $video_element . '$2', $html);
            }
            
            // Add play button overlay for both modes
            $play_button = '<div class="mvl-play-button" ' . $data_attrs . '>';
            $play_button .= '<svg viewBox="0 0 24 24" width="48" height="48" fill="white">';
            $play_button .= '<path d="M8 5v14l11-7z"/>';
            $play_button .= '</svg>';
            $play_button .= '</div>';
            
            // Find the img tag and add our overlay
            $html = preg_replace('/(<div[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*>)/', '$1' . $play_button, $html);
            
            // Add classes to identify images with video and the display mode
            $html = str_replace('woocommerce-product-gallery__image', 
                'woocommerce-product-gallery__image mvl-has-video mvl-mode-' . $display_mode, $html);
        }
        
        return $html;
    }
    
    /**
     * Add debug information to footer
     */
    public function add_debug_footer() {
        if (is_product()) {
            $plugin_url = plugin_dir_url(__FILE__);
            echo "<!-- Media Video Link Debug -->\n";
            // echo "<div style='position: fixed; bottom: 0; left: 0; background: #000; color: #fff; padding: 10px; z-index: 9999; font-size: 12px;'>🎬 MVL Plugin Active</div>\n";
            ?>
            <script>
            // Simple test first
            console.log('🔍 Basic console test working!');
            console.log('🔍 Plugin URL: <?php echo esc_js($plugin_url); ?>');
            console.log('🔍 jQuery available:', typeof jQuery !== 'undefined');
            console.log('🔍 $ available:', typeof $ !== 'undefined');
            console.log('🔍 Display Mode: <?php echo esc_js(get_option('mvl_display_mode', 'modal')); ?>');
            
            // The external frontend.js file handles everything now
            console.log('✅ MVL Plugin Active - Using external JS file');
            </script>
            <?php
        }
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        // Set video link for attachment
        register_rest_route('mvl/v1', '/attachment/(?P<id>\d+)/video-link', array(
            'methods' => array('POST', 'PUT'),
            'callback' => array($this, 'api_set_video_link'),
            'permission_callback' => array($this, 'api_permission_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'video_url' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_url',
                )
            )
        ));
        
        // Get video link for attachment
        register_rest_route('mvl/v1', '/attachment/(?P<id>\d+)/video-link', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_video_link'),
            'permission_callback' => array($this, 'api_permission_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Set video link for product's main image
        register_rest_route('mvl/v1', '/product/(?P<id>\d+)/main-image/video-link', array(
            'methods' => array('POST', 'PUT'),
            'callback' => array($this, 'api_set_product_main_image_video'),
            'permission_callback' => array($this, 'api_permission_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'video_url' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_url',
                )
            )
        ));
        
        // Get all video links for a product's gallery
        register_rest_route('mvl/v1', '/product/(?P<id>\d+)/gallery/video-links', array(
            'methods' => 'GET',
            'callback' => array($this, 'api_get_product_gallery_videos'),
            'permission_callback' => array($this, 'api_permission_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Bulk set video links for product gallery
        register_rest_route('mvl/v1', '/product/(?P<id>\d+)/gallery/video-links', array(
            'methods' => array('POST', 'PUT'),
            'callback' => array($this, 'api_set_product_gallery_videos'),
            'permission_callback' => array($this, 'api_permission_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'video_links' => array(
                    'required' => true,
                    'type' => 'array',
                )
            )
        ));
    }
    
    /**
     * Check API permissions
     */
    public function api_permission_check() {
        return current_user_can('edit_posts');
    }
    
    /**
     * Set video link for specific attachment
     */
    public function api_set_video_link($request) {
        $attachment_id = intval($request['id']);
        $video_url = sanitize_url($request['video_url']);
        
        if (!wp_attachment_is_image($attachment_id)) {
            return new WP_Error('invalid_attachment', 'Attachment must be an image', array('status' => 400));
        }
        
        if (empty($video_url)) {
            delete_post_meta($attachment_id, '_video_link');
            $message = 'Video link removed';
        } else {
            update_post_meta($attachment_id, '_video_link', $video_url);
            $message = 'Video link updated';
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => $message,
            'attachment_id' => $attachment_id,
            'video_url' => $video_url
        ));
    }
    
    /**
     * Get video link for specific attachment
     */
    public function api_get_video_link($request) {
        $attachment_id = intval($request['id']);
        
        if (!wp_attachment_is_image($attachment_id)) {
            return new WP_Error('invalid_attachment', 'Attachment must be an image', array('status' => 400));
        }
        
        $video_url = get_post_meta($attachment_id, '_video_link', true);
        
        return rest_ensure_response(array(
            'attachment_id' => $attachment_id,
            'video_url' => $video_url ?: '',
            'has_video' => !empty($video_url)
        ));
    }
    
    /**
     * Set video link for product's main image
     */
    public function api_set_product_main_image_video($request) {
        $product_id = intval($request['id']);
        $video_url = sanitize_url($request['video_url']);
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('invalid_product', 'Product not found', array('status' => 404));
        }
        
        $main_image_id = $product->get_image_id();
        if (!$main_image_id) {
            return new WP_Error('no_main_image', 'Product has no main image', array('status' => 400));
        }
        
        if (empty($video_url)) {
            delete_post_meta($main_image_id, '_video_link');
            $message = 'Video link removed from main image';
        } else {
            update_post_meta($main_image_id, '_video_link', $video_url);
            $message = 'Video link added to main image';
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => $message,
            'product_id' => $product_id,
            'main_image_id' => $main_image_id,
            'video_url' => $video_url
        ));
    }
    
    /**
     * Get all video links for product's gallery
     */
    public function api_get_product_gallery_videos($request) {
        $product_id = intval($request['id']);
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('invalid_product', 'Product not found', array('status' => 404));
        }
        
        $gallery_images = array();
        
        // Main image
        $main_image_id = $product->get_image_id();
        if ($main_image_id) {
            $video_url = get_post_meta($main_image_id, '_video_link', true);
            $gallery_images[] = array(
                'attachment_id' => $main_image_id,
                'type' => 'main',
                'image_url' => wp_get_attachment_url($main_image_id),
                'video_url' => $video_url ?: '',
                'has_video' => !empty($video_url)
            );
        }
        
        // Gallery images
        $gallery_image_ids = $product->get_gallery_image_ids();
        foreach ($gallery_image_ids as $image_id) {
            $video_url = get_post_meta($image_id, '_video_link', true);
            $gallery_images[] = array(
                'attachment_id' => $image_id,
                'type' => 'gallery',
                'image_url' => wp_get_attachment_url($image_id),
                'video_url' => $video_url ?: '',
                'has_video' => !empty($video_url)
            );
        }
        
        return rest_ensure_response(array(
            'product_id' => $product_id,
            'gallery_images' => $gallery_images
        ));
    }
    
    /**
     * Bulk set video links for product gallery
     */
    public function api_set_product_gallery_videos($request) {
        $product_id = intval($request['id']);
        $video_links = $request['video_links'];
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('invalid_product', 'Product not found', array('status' => 404));
        }
        
        $updated = array();
        $errors = array();
        
        foreach ($video_links as $link_data) {
            if (!isset($link_data['attachment_id']) || !isset($link_data['video_url'])) {
                $errors[] = 'Missing attachment_id or video_url in video_links array';
                continue;
            }
            
            $attachment_id = intval($link_data['attachment_id']);
            $video_url = sanitize_url($link_data['video_url']);
            
            if (!wp_attachment_is_image($attachment_id)) {
                $errors[] = "Attachment {$attachment_id} is not an image";
                continue;
            }
            
            if (empty($video_url)) {
                delete_post_meta($attachment_id, '_video_link');
            } else {
                update_post_meta($attachment_id, '_video_link', $video_url);
            }
            
            $updated[] = array(
                'attachment_id' => $attachment_id,
                'video_url' => $video_url
            );
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'product_id' => $product_id,
            'updated' => $updated,
            'errors' => $errors
        ));
    }
}

// Initialize the plugin
new MediaVideoLink();