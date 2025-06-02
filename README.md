# Media Video Link

A WordPress plugin that adds video link functionality to WooCommerce product galleries. Allows users to associate videos with product images and display them with an elegant play button overlay.

## Features

🎬 **Video Link Field** - Add video URLs to media library attachments
🎯 **Play Button Overlay** - Automatic play buttons on product gallery images with videos
📱 **Responsive Video Modal** - Beautiful modal with video playback
🌐 **Multiple Platforms** - YouTube, Vimeo, self-hosted videos (MP4, WebM, OGV)
🚀 **REST API** - Complete API for programmatic video link management
⚡ **Performance Optimized** - Assets only load when needed

## Installation

1. Upload the plugin files to `/wp-content/plugins/media-video-link/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Ensure WooCommerce is installed and activated

## Usage

### Adding Video Links

1. Go to **Media Library**
2. Edit an image attachment
3. Find the **"Video Link"** field (appears after File URL field)
4. Enter your video URL (YouTube, Vimeo, or direct video file)
5. Save the attachment

### Product Gallery

1. Add the image to a **WooCommerce product gallery**
2. Visit the product page on frontend
3. **Play button automatically appears** on images with video links
4. Click to open video in modal overlay

### Supported Video Types

- **YouTube**: `https://youtube.com/watch?v=...` or `https://youtu.be/...`
- **Vimeo**: `https://vimeo.com/123456789`
- **Self-hosted**: `.mp4`, `.webm`, `.ogv`, `.ogg` files
- **Direct URLs**: Any direct video file URL

## REST API

The plugin provides a comprehensive REST API for managing video links:

### Authentication
Requires user with `edit_posts` capability. Use WordPress authentication methods.

### Endpoints

#### Set Video Link to Product's Main Image
```bash
POST /wp-json/mvl/v1/product/{id}/main-image/video-link
```

#### Get All Gallery Videos for a Product
```bash
GET /wp-json/mvl/v1/product/{id}/gallery/video-links
```

#### Set Video Link to Specific Attachment
```bash
POST /wp-json/mvl/v1/attachment/{id}/video-link
```

#### Bulk Set Gallery Videos
```bash
POST /wp-json/mvl/v1/product/{id}/gallery/video-links
```

### API Examples

#### Set Video to Main Image
```bash
curl -X POST https://yoursite.com/wp-json/mvl/v1/product/123/main-image/video-link \
  -H "Content-Type: application/json" \
  -u username:password \
  -d '{"video_url": "https://youtube.com/watch?v=abc123"}'
```

#### Bulk Set Gallery Videos
```bash
curl -X POST https://yoursite.com/wp-json/mvl/v1/product/123/gallery/video-links \
  -H "Content-Type: application/json" \
  -u username:password \
  -d '{
    "video_links": [
      {"attachment_id": 456, "video_url": "https://youtube.com/watch?v=abc"},
      {"attachment_id": 789, "video_url": "https://vimeo.com/123456"}
    ]
  }'
```

## Requirements

- WordPress 5.0+
- WooCommerce 3.0+
- PHP 7.4+

## File Structure

```
media-video-link/
├── media-video-link.php    # Main plugin file
└── assets/
    ├── frontend.css        # Frontend styles
    └── frontend.js         # Frontend JavaScript
```

## Hooks and Filters

### Filters
- `woocommerce_single_product_image_thumbnail_html` - Adds play button to gallery images

### Actions
- `attachment_fields_to_edit` - Adds video link field to media library
- `attachment_fields_to_save` - Saves video link field data
- `wp_enqueue_scripts` - Loads frontend assets on product pages

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GPL v2 or later - see the [LICENSE](LICENSE) file for details.

## Changelog

### 1.0.0
- Initial release
- Video link field in media library
- Play button overlay on product galleries
- Video modal with multi-platform support
- REST API for video link management
- Support for YouTube, Vimeo, and self-hosted videos

## Support

For support, please open an issue on GitHub.

## Credits

Developed with ❤️ for the WordPress and WooCommerce community.