/**
 * Media Video Link - Frontend JavaScript
 */
(function($) {
    'use strict';
    
    // Mark that external file loaded
    window.mvlLoaded = true;
    
    // Initialize when DOM is ready
    $(document).ready(function() {
        console.log('🎬 Media Video Link script loaded!');
        
        // Debug information
        if (typeof mvl_debug !== 'undefined') {
            console.log('🔧 Debug info:', mvl_debug);
        }
        
        // Check jQuery availability
        if (typeof $ === 'undefined') {
            console.error('❌ jQuery not available!');
            return;
        }
        
        console.log('✅ jQuery available, initializing...');
        initVideoLinks();
        
        // Debug: Check if play buttons exist
        setTimeout(function() {
            const playButtons = $('.mvl-play-button');
            const hasVideoImages = $('.mvl-has-video');
            
            console.log('🔍 Found', playButtons.length, 'play buttons');
            console.log('🔍 Found', hasVideoImages.length, 'images with video');
            
            if (playButtons.length > 0) {
                playButtons.each(function(index) {
                    console.log('🎯 Play button', index + 1, 'video URL:', $(this).data('video-url'));
                });
            } else {
                console.warn('⚠️ No play buttons found. Make sure images have video links assigned.');
            }
            
            // Check if we're on a product page
            if ($('.woocommerce-product-gallery').length > 0) {
                console.log('✅ Product gallery found');
            } else {
                console.warn('⚠️ No product gallery found - are you on a product page?');
            }
        }, 2000);
    });
    
    function initVideoLinks() {
        // Create modal HTML
        createVideoModal();
        
        // Handle play button clicks
        $(document).on('click', '.mvl-play-button', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Play button clicked!'); // Debug log
            
            const videoUrl = $(this).data('video-url');
            console.log('Video URL:', videoUrl); // Debug log
            
            if (videoUrl) {
                openVideoModal(videoUrl);
            } else {
                console.error('No video URL found!');
            }
        });
        
        // Handle close button and backdrop clicks
        $(document).on('click', '.mvl-close-button, .mvl-video-modal', function(e) {
            if (e.target === this) {
                closeVideoModal();
            }
        });
        
        // Handle escape key
        $(document).on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape key
                closeVideoModal();
            }
        });
    }
    
    function createVideoModal() {
        if ($('#mvl-video-modal').length === 0) {
            const modalHtml = `
                <div id="mvl-video-modal" class="mvl-video-modal">
                    <div class="mvl-video-container">
                        <button class="mvl-close-button" type="button">×</button>
                        <iframe class="mvl-video-iframe" 
                                allowfullscreen 
                                allow="autoplay; encrypted-media"
                                frameborder="0"
                                style="display: none;">
                        </iframe>
                        <video class="mvl-video-player" 
                               controls 
                               autoplay 
                               preload="metadata"
                               style="display: none;">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);
        }
    }
    
    function openVideoModal(videoUrl) {
        const modal = $('#mvl-video-modal');
        const iframe = modal.find('.mvl-video-iframe');
        const video = modal.find('.mvl-video-player');
        
        // Reset both players
        iframe.hide().attr('src', '');
        video.hide().attr('src', '').find('source').remove();
        
        // Check if it's a self-hosted video
        if (isSelfHostedVideo(videoUrl)) {
            console.log('Loading self-hosted video:', videoUrl);
            loadSelfHostedVideo(video, videoUrl);
        } else {
            // Convert video URL to embeddable format
            const embedUrl = getEmbedUrl(videoUrl);
            
            if (embedUrl) {
                console.log('Loading embedded video:', embedUrl);
                loadEmbeddedVideo(iframe, embedUrl);
            } else {
                console.error('Could not convert URL to embed format:', videoUrl);
                return;
            }
        }
        
        // Show modal
        modal.addClass('mvl-active');
        $('body').addClass('mvl-video-modal-open');
        
        // Prevent body scroll
        $('body').css('overflow', 'hidden');
    }
    
    function closeVideoModal() {
        const modal = $('#mvl-video-modal');
        const iframe = modal.find('.mvl-video-iframe');
        const video = modal.find('.mvl-video-player')[0];
        
        modal.removeClass('mvl-active');
        $('body').removeClass('mvl-video-modal-open');
        
        // Restore body scroll
        $('body').css('overflow', '');
        
        // Stop and clear videos
        setTimeout(function() {
            // Stop iframe video
            iframe.attr('src', '');
            
            // Stop HTML5 video
            if (video) {
                video.pause();
                video.currentTime = 0;
                video.src = '';
                video.load();
            }
            
            // Hide both players
            iframe.hide();
            $(video).hide();
        }, 300);
    }
    
    function isSelfHostedVideo(url) {
        const videoExtensions = /\.(mp4|webm|ogv|ogg|avi|mov|wmv|flv|m4v)(\?.*)?$/i;
        return videoExtensions.test(url);
    }
    
    function loadSelfHostedVideo(videoElement, videoUrl) {
        const video = videoElement[0];
        const container = videoElement.closest('.mvl-video-container');
        
        // Show loading state
        container.addClass('loading');
        
        // Create source elements for different formats
        const sources = [];
        
        // Detect format and add appropriate source
        if (videoUrl.match(/\.mp4(\?.*)?$/i)) {
            sources.push({ src: videoUrl, type: 'video/mp4' });
        } else if (videoUrl.match(/\.webm(\?.*)?$/i)) {
            sources.push({ src: videoUrl, type: 'video/webm' });
        } else if (videoUrl.match(/\.(ogv|ogg)(\?.*)?$/i)) {
            sources.push({ src: videoUrl, type: 'video/ogg' });
        } else if (videoUrl.match(/\.(avi|mov|wmv|flv|m4v)(\?.*)?$/i)) {
            // These formats might not be supported by all browsers
            sources.push({ src: videoUrl, type: 'video/mp4' });
        } else {
            // Default to mp4 for unknown extensions
            sources.push({ src: videoUrl, type: 'video/mp4' });
        }
        
        // Clear existing sources and error messages
        videoElement.find('source').remove();
        container.find('.mvl-video-error').remove();
        
        // Add new sources
        sources.forEach(function(source) {
            videoElement.append(`<source src="${source.src}" type="${source.type}">`);
        });
        
        // Show video element and load
        videoElement.show();
        video.load();
        
        // Handle successful loading
        video.addEventListener('canplay', function() {
            container.removeClass('loading');
            video.play().catch(function(error) {
                console.log('Auto-play prevented:', error);
                // Auto-play was prevented, but video is ready to play manually
            });
        }, { once: true });
        
        // Handle loading errors
        video.addEventListener('error', function() {
            container.removeClass('loading');
            showVideoError(container, 'Unable to load video', 'Please check the video URL and try again.');
        }, { once: true });
        
        // Timeout for loading
        setTimeout(function() {
            if (container.hasClass('loading')) {
                container.removeClass('loading');
                showVideoError(container, 'Video loading timeout', 'The video is taking too long to load.');
            }
        }, 10000); // 10 second timeout
    }
    
    function loadEmbeddedVideo(iframeElement, embedUrl) {
        const container = iframeElement.closest('.mvl-video-container');
        
        // Show loading state
        container.addClass('loading');
        
        // Clear any existing error messages
        container.find('.mvl-video-error').remove();
        
        // Show iframe and load embedded video
        iframeElement.show();
        
        // Load video after a short delay
        setTimeout(function() {
            iframeElement.attr('src', embedUrl);
            
            // Remove loading state after iframe loads (estimated time)
            setTimeout(function() {
                container.removeClass('loading');
            }, 2000);
        }, 100);
    }
    
    function showVideoError(container, title, message) {
        // Remove any existing error messages
        container.find('.mvl-video-error').remove();
        
        // Create error message
        const errorHtml = `
            <div class="mvl-video-error">
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
        
        container.append(errorHtml);
    }
    
    function getEmbedUrl(url) {
        console.log('Converting URL:', url); // Debug log
        
        // YouTube URL patterns
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
        const youtubeMatch = url.match(youtubeRegex);
        
        if (youtubeMatch) {
            const embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
            console.log('YouTube embed URL:', embedUrl);
            return embedUrl;
        }
        
        // Vimeo URL patterns
        const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
        const vimeoMatch = url.match(vimeoRegex);
        
        if (vimeoMatch) {
            const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&title=0&byline=0&portrait=0`;
            console.log('Vimeo embed URL:', embedUrl);
            return embedUrl;
        }
        
        // Dailymotion URL patterns
        const dailymotionRegex = /(?:dailymotion\.com\/video\/)([a-zA-Z0-9]+)/;
        const dailymotionMatch = url.match(dailymotionRegex);
        
        if (dailymotionMatch) {
            const embedUrl = `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=1`;
            console.log('Dailymotion embed URL:', embedUrl);
            return embedUrl;
        }
        
        // Wistia URL patterns
        const wistiaRegex = /(?:wistia\.com\/medias\/)([a-zA-Z0-9]+)/;
        const wistiaMatch = url.match(wistiaRegex);
        
        if (wistiaMatch) {
            const embedUrl = `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}?autoplay=1`;
            console.log('Wistia embed URL:', embedUrl);
            return embedUrl;
        }
        
        // If it's already an embed URL, enhance it with autoplay
        if (url.includes('embed') || url.includes('player')) {
            const separator = url.includes('?') ? '&' : '?';
            const enhancedUrl = `${url}${separator}autoplay=1`;
            console.log('Enhanced embed URL:', enhancedUrl);
            return enhancedUrl;
        }
        
        // For other URLs, try to use them directly
        console.log('Using direct URL:', url);
        return url;
    }\n    \n    // Handle WooCommerce gallery changes (for variation products)\n    $(document).on('woocommerce_gallery_reset_slide_position', function() {\n        // Re-initialize play buttons after gallery reset\n        setTimeout(initVideoLinks, 100);\n    });\n    \n})(jQuery);