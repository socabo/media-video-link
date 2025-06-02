/**
 * Media Video Link - Frontend JavaScript
 */
jQuery(document).ready(function($) {
    'use strict';
    
    // Mark that external file loaded
    window.mvlLoaded = true;
    
    console.log('🎬 Media Video Link script loaded!');
    
    // Debug information
    if (typeof mvl_settings !== 'undefined') {
        console.log('🔧 Settings:', mvl_settings);
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
    
    function initVideoLinks() {
        // Create modal HTML
        createVideoModal();
        
        // Handle play button clicks
        $(document).on('click', '.mvl-play-button', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Play button clicked!'); // Debug log
            
            const videoUrl = $(this).data('video-url');
            const attachmentId = $(this).data('attachment-id');
            const displayMode = mvl_settings && mvl_settings.display_mode ? mvl_settings.display_mode : 'modal';
            
            console.log('Video URL:', videoUrl); // Debug log
            console.log('Display Mode:', displayMode); // Debug log
            
            if (videoUrl) {
                if (displayMode === 'inline') {
                    handleInlineVideo($(this), videoUrl, attachmentId);
                } else {
                    openVideoModal(videoUrl);
                }
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
                        <button class="mvl-close-button" type="button">&times;</button>
                        <iframe class="mvl-video-iframe" 
                                allowfullscreen 
                                allow="autoplay; encrypted-media"
                                frameborder="0"
                                style="display: none;">
                        </iframe>
                        <video class="mvl-video-player" 
                               controls 
                               autoplay
                               preload="auto"
                               style="display: none;">
                            Your browser does not support the video tag.
                        </video>
                        <div class="mvl-video-error" style="display: none;">
                            <h3>Unable to load video</h3>
                            <p>Please check the video URL and try again.</p>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);
        }
    }
    
    function openVideoModal(videoUrl) {
        const $modal = $('#mvl-video-modal');
        const $iframe = $modal.find('.mvl-video-iframe');
        const $video = $modal.find('.mvl-video-player');
        const $error = $modal.find('.mvl-video-error');
        const $container = $modal.find('.mvl-video-container');
        
        console.log('Opening modal with video URL:', videoUrl);
        
        // Reset all elements
        $iframe.hide().attr('src', '');
        $video.hide().attr('src', '');
        $error.hide();
        $container.removeClass('loading');
        
        // Check if it's a self-hosted video
        if (isSelfHostedVideo(videoUrl)) {
            console.log('Loading self-hosted video:', videoUrl);
            
            // Show video element
            $video.show();
            $video.attr('src', videoUrl);
            
            // Set autoplay attribute before setting source
            $video.attr('autoplay', true);
            
            // Add multiple event listeners to try playing as soon as possible
            const tryPlay = function() {
                console.log('Attempting to play video');
                const playPromise = $video[0].play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Video playing successfully');
                    }).catch(error => {
                        console.log('Play failed:', error);
                        // Try muted playback as fallback
                        $video[0].muted = true;
                        $video[0].play().catch(e => {
                            console.log('Muted play also failed:', e);
                            $video[0].muted = false; // Restore audio
                        });
                    });
                }
            };
            
            // Try to play on various events
            $video.one('loadeddata', tryPlay);
            $video.one('canplay', tryPlay);
            
            // Also try immediately
            setTimeout(tryPlay, 100);
            
            // Add error event listener
            $video.on('error', function(e) {
                console.error('Video error:', e);
                $video.hide();
                $error.show();
            });
            
            // Force load the video
            $video[0].load();
            
        } else {
            // Convert video URL to embeddable format
            const embedUrl = getEmbedUrl(videoUrl);
            
            if (embedUrl) {
                console.log('Loading embedded video:', embedUrl);
                $iframe.show();
                $iframe.attr('src', embedUrl);
            } else {
                console.error('Could not convert URL to embed format:', videoUrl);
                $error.show();
                return;
            }
        }
        
        // Show modal
        $modal.addClass('mvl-active').show();
        $('body').addClass('mvl-video-modal-open');
        
        // Prevent body scroll
        $('body').css('overflow', 'hidden');
    }
    
    function closeVideoModal() {
        const $modal = $('#mvl-video-modal');
        const $iframe = $modal.find('.mvl-video-iframe');
        const $video = $modal.find('.mvl-video-player');
        const $error = $modal.find('.mvl-video-error');
        
        $modal.removeClass('mvl-active').hide();
        $('body').removeClass('mvl-video-modal-open');
        
        // Restore body scroll
        $('body').css('overflow', '');
        
        // Stop and clear videos
        $iframe.attr('src', '').hide();
        
        // Stop HTML5 video
        if ($video[0]) {
            $video[0].pause();
            $video[0].currentTime = 0;
            $video.attr('src', '').hide();
        }
        
        // Hide error
        $error.hide();
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
    }
    
    function handleInlineVideo($playButton, videoUrl, attachmentId) {
        const $galleryItem = $playButton.closest('.woocommerce-product-gallery__image');
        let $videoContainer = $galleryItem.find('.mvl-inline-video-container');
        
        console.log('Handling inline video for attachment:', attachmentId);
        
        // If video container doesn't exist, create it
        if ($videoContainer.length === 0) {
            console.log('Creating video container dynamically');
            
            const videoHTML = isSelfHostedVideo(videoUrl) 
                ? `<video class="mvl-inline-video" controls autoplay preload="metadata" style="width: 100%; height: 100%; object-fit: contain;">
                     <source src="${videoUrl}" type="video/mp4">
                     Your browser does not support the video tag.
                   </video>`
                : '<div class="mvl-inline-iframe-container" style="width: 100%; height: 100%;"></div>';
            
            $videoContainer = $(`
                <div class="mvl-inline-video-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 9999; display: none;">
                    <div class="mvl-video-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        ${videoHTML}
                    </div>
                </div>
            `);
            
            // Ensure the gallery item has relative positioning
            $galleryItem.css('position', 'relative');
            
            // Append to gallery item
            $galleryItem.append($videoContainer);
        }
        
        // Hide all images and play buttons in the gallery item
        $galleryItem.find('a, img').css('visibility', 'hidden');
        $playButton.hide();
        
        // Show the video container
        $videoContainer.show();
        
        // Check if it's a self-hosted video
        if (isSelfHostedVideo(videoUrl)) {
            const $video = $videoContainer.find('video');
            if ($video.length > 0) {
                // Set video source if not already set
                if (!$video.attr('src')) {
                    $video.attr('src', videoUrl);
                }
                // Play the video
                $video[0].play().catch(function(error) {
                    console.log('Auto-play prevented:', error);
                });
                
                // Handle video ended event to show image again
                $video.on('ended', function() {
                    $videoContainer.hide();
                    $galleryItem.find('a, img').css('visibility', '');
                    $playButton.show();
                });
            }
        } else {
            // Handle external videos (YouTube, Vimeo, etc.)
            const $iframeContainer = $videoContainer.find('.mvl-inline-iframe-container');
            const embedUrl = getEmbedUrl(videoUrl);
            
            if (embedUrl && $iframeContainer.length > 0) {
                // Create iframe if not exists
                let $iframe = $iframeContainer.find('iframe');
                if ($iframe.length === 0) {
                    $iframe = $('<iframe>', {
                        class: 'mvl-inline-iframe',
                        allowfullscreen: true,
                        allow: 'autoplay; encrypted-media',
                        frameborder: 0,
                        src: embedUrl
                    });
                    $iframeContainer.append($iframe);
                } else {
                    $iframe.attr('src', embedUrl);
                }
                
                // Add close button for external videos
                if ($videoContainer.find('.mvl-inline-close').length === 0) {
                    const $closeButton = $('<button>', {
                        class: 'mvl-inline-close',
                        type: 'button',
                        html: '×',
                        click: function() {
                            $iframe.attr('src', '');
                            $videoContainer.hide();
                            $galleryItem.find('a, img').css('visibility', '');
                            $playButton.show();
                        }
                    });
                    $videoContainer.append($closeButton);
                }
            }
        }
        
        // Trigger gallery resize event
        $(window).trigger('resize');
        
        // Handle WooCommerce gallery navigation
        $('.flex-control-nav li').on('click', function() {
            // Stop any playing videos when switching slides
            stopAllInlineVideos();
        });
    }
    
    function stopAllInlineVideos() {
        // Stop all HTML5 videos
        $('.mvl-inline-video').each(function() {
            this.pause();
            this.currentTime = 0;
        });
        
        // Clear all iframes
        $('.mvl-inline-iframe').attr('src', '');
        
        // Hide all video containers and show images
        $('.mvl-inline-video-container').hide();
        $('.woocommerce-product-gallery__image').find('a, img').css('visibility', '');
        $('.mvl-play-button').show();
    }
    
    // Handle WooCommerce gallery changes (for variation products)
    $(document).on('woocommerce_gallery_reset_slide_position', function() {
        // Re-initialize play buttons after gallery reset
        setTimeout(initVideoLinks, 100);
    });
    
    // Initialize gallery carousel enhancement
    function initGalleryCarousel() {
        const $gallery = $('.woocommerce-product-gallery');
        if ($gallery.length === 0) return;
        
        // Wait for gallery to be initialized
        setTimeout(function() {
            const $nav = $gallery.find('.flex-control-nav');
            if ($nav.length === 0) return;
            
            // Wrap nav in container if not already wrapped
            if (!$nav.parent().hasClass('mvl-gallery-nav-container')) {
                $nav.wrap('<div class="mvl-gallery-nav-container"></div>');
            }
            
            const $container = $nav.parent();
            
            // Add navigation arrows
            if ($container.find('.mvl-gallery-nav').length === 0) {
                $container.append('<button class="mvl-gallery-nav mvl-prev" type="button">‹</button>');
                $container.append('<button class="mvl-gallery-nav mvl-next" type="button">›</button>');
            }
            
            // Handle arrow clicks
            $container.on('click', '.mvl-prev', function() {
                const scrollAmount = $nav[0].scrollLeft - 200;
                $nav.animate({ scrollLeft: scrollAmount }, 300);
            });
            
            $container.on('click', '.mvl-next', function() {
                const scrollAmount = $nav[0].scrollLeft + 200;
                $nav.animate({ scrollLeft: scrollAmount }, 300);
            });
            
            // Update arrow visibility based on scroll position
            function updateArrows() {
                const scrollLeft = $nav.scrollLeft();
                const scrollWidth = $nav[0].scrollWidth;
                const clientWidth = $nav[0].clientWidth;
                
                $container.find('.mvl-prev').toggle(scrollLeft > 0);
                $container.find('.mvl-next').toggle(scrollLeft < scrollWidth - clientWidth - 5);
            }
            
            // Check arrows on scroll and resize
            $nav.on('scroll', updateArrows);
            $(window).on('resize', updateArrows);
            
            // Initial arrow update
            updateArrows();
            
            // Ensure active thumbnail is visible
            const $activeThumb = $nav.find('.flex-active').parent();
            if ($activeThumb.length > 0) {
                const thumbLeft = $activeThumb.position().left;
                const thumbWidth = $activeThumb.outerWidth();
                const navWidth = $nav.width();
                const scrollLeft = $nav.scrollLeft();
                
                if (thumbLeft < 0 || thumbLeft + thumbWidth > navWidth) {
                    $nav.animate({ 
                        scrollLeft: scrollLeft + thumbLeft - (navWidth / 2) + (thumbWidth / 2) 
                    }, 300);
                }
            }
        }, 500);
    }
    
    // Initialize carousel on page load
    initGalleryCarousel();
    
    // Reinitialize on gallery update
    $(document).on('woocommerce_gallery_init', initGalleryCarousel);
    
});