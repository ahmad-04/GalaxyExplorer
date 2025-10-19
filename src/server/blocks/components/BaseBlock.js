import { BlockPerformanceService } from '../services/BlockPerformanceService.js';
import { BlockErrorService } from '../services/BlockErrorService.js';
/**
 * Base block component utilities for devvit block rendering
 * These functions create block configurations that can be rendered by devvit
 */
/**
 * Create base block configuration with common styling following Pixelary patterns
 */
export const createBaseBlockConfig = (config) => {
    return {
        ...config,
        style: {
            padding: 'medium',
            cornerRadius: 'medium',
            backgroundColor: 'neutral-background-weak',
            gap: 'small',
            width: '100%',
            border: 'thin',
            borderColor: 'neutral-border',
        },
    };
};
/**
 * Create block header configuration with title and metadata
 */
export const createBlockHeader = (config) => {
    const getHeaderContent = () => {
        switch (config.type) {
            case 'level-preview':
                const levelData = config.data;
                return {
                    title: levelData.title,
                    subtitle: `by u/${levelData.creator}`,
                    badge: undefined,
                };
            case 'weekly-challenge':
                const challengeData = config.data;
                return {
                    title: challengeData.title,
                    subtitle: `${challengeData.participantCount} participants`,
                    badge: 'CHALLENGE',
                };
            case 'landing':
                const landingData = config.data;
                return {
                    title: landingData.appTitle,
                    subtitle: landingData.description,
                    badge: undefined,
                };
            case 'community-showcase':
                return {
                    title: 'Community Showcase',
                    subtitle: 'Discover amazing community content',
                    badge: 'FEATURED',
                };
            default:
                return {
                    title: 'Galaxy Explorer',
                    subtitle: 'Interactive content',
                    badge: undefined,
                };
        }
    };
    const { title, subtitle, badge } = getHeaderContent();
    return {
        type: 'header',
        title,
        subtitle,
        badge,
        style: {
            titleSize: 'large',
            titleWeight: 'bold',
            titleColor: 'primary',
            subtitleSize: 'medium',
            subtitleColor: 'secondary',
        },
    };
};
/**
 * Create difficulty indicator configuration with visual star rating
 */
export const createDifficultyIndicator = (level) => {
    const clampedLevel = Math.max(1, Math.min(5, level));
    const stars = '★'.repeat(clampedLevel);
    const emptyStars = '☆'.repeat(5 - clampedLevel);
    return {
        type: 'difficulty',
        level: clampedLevel,
        display: `${stars}${emptyStars}`,
        text: `Difficulty: ${clampedLevel}/5`,
        style: {
            starColor: 'warning',
            emptyStarColor: 'neutral-content-weak',
        },
    };
};
/**
 * Create thumbnail configuration with fallback handling and lazy loading
 */
export const createThumbnailConfig = (args) => {
    const { url, width = 80, height = 60, alt = 'Level thumbnail', lazy = true } = args;
    return BlockPerformanceService.createOptimizedImageConfig({
        url,
        width,
        height,
        alt,
        lazy,
        placeholder: '🎮',
    });
};
/**
 * Create statistics display configuration
 */
export const createStatsDisplay = (stats) => {
    return {
        type: 'stats',
        items: stats.map((stat) => ({
            label: stat.label,
            value: stat.value.toString(),
            icon: stat.icon,
        })),
        style: {
            layout: 'horizontal',
            gap: 'medium',
            labelSize: 'small',
            labelColor: 'secondary',
            valueSize: 'medium',
            valueWeight: 'bold',
            valueColor: 'primary',
        },
    };
};
/**
 * Create block actions configuration with consistent button styling
 */
export const createBlockActions = (config) => {
    if (!config.actions || config.actions.length === 0) {
        return null;
    }
    return {
        type: 'actions',
        actions: config.actions.map((action) => ({
            id: action.id,
            label: action.label,
            appearance: action.type === 'primary' ? 'primary' : 'secondary',
            size: 'medium',
            handler: action.handler,
            data: action.data,
        })),
        style: {
            layout: 'horizontal',
            gap: 'small',
            alignment: 'start',
        },
    };
};
/**
 * Create loading state configuration
 */
export const createLoadingState = () => {
    return {
        type: 'loading',
        message: 'Loading...',
        style: {
            alignment: 'center',
            padding: 'medium',
            textSize: 'medium',
            textColor: 'secondary',
        },
    };
};
/**
 * Create error state configuration
 */
export const createErrorState = (error) => {
    return {
        type: 'error',
        message: error,
        style: {
            alignment: 'center',
            padding: 'medium',
            textSize: 'medium',
            textColor: 'critical',
        },
    };
};
/**
 * Create optimized block configuration with performance enhancements
 */
export const createOptimizedBlockConfig = async (config, options) => {
    const { enableLazyLoading = true, enableSkeleton = true, cacheKey } = options || {};
    // Create base configuration
    const baseConfig = createBaseBlockConfig(config);
    // Add performance optimizations
    const optimizedConfig = {
        ...baseConfig,
        performance: {
            lazyLoading: enableLazyLoading,
            skeleton: enableSkeleton,
            cacheKey,
        },
    };
    // Add skeleton state if enabled
    if (enableSkeleton) {
        optimizedConfig.skeletonState = BlockPerformanceService.createSkeletonState(config.type);
    }
    return optimizedConfig;
};
/**
 * Create loading state configuration with progress tracking
 */
export const createLoadingStateConfig = (stage, progress) => {
    return BlockPerformanceService.createProgressiveLoadingState(stage, progress);
};
/**
 * Create performance-optimized block with lazy loading
 */
export const createLazyBlock = async (blockId, blockType, contentLoader) => {
    return await BlockPerformanceService.implementLazyLoading(blockId, contentLoader);
};
/**
 * Create error-safe block wrapper with error boundary
 */
export const createErrorSafeBlock = (blockId, blockType, blockContent) => {
    const errorBoundary = BlockErrorService.createErrorBoundary(blockId, blockType);
    return {
        type: 'error-safe-block',
        blockId,
        blockType,
        errorBoundary,
        content: blockContent,
        fallback: BlockErrorService.createFallbackContent(blockType),
    };
};
/**
 * Create block with comprehensive error handling
 */
export const createRobustBlock = async (config, options) => {
    const { enableErrorBoundary = true, enableRetry = true, customFallback } = options || {};
    try {
        // Create base block configuration
        const baseConfig = await createOptimizedBlockConfig(config);
        // Add error handling if enabled
        if (enableErrorBoundary) {
            const errorBoundary = BlockErrorService.createErrorBoundary(config.postId, config.type);
            baseConfig.errorBoundary = errorBoundary;
        }
        // Add retry configuration if enabled
        if (enableRetry) {
            baseConfig.retryConfig = {
                enabled: true,
                maxAttempts: 3,
                showRetryButton: true,
            };
        }
        // Add custom fallback if provided
        if (customFallback) {
            baseConfig.customFallback = customFallback;
        }
        return baseConfig;
    }
    catch (error) {
        console.error(`[BaseBlock] Error creating robust block:`, error);
        // Return minimal fallback configuration
        return {
            type: 'fallback-block',
            postId: config.postId,
            blockType: config.type,
            content: customFallback || BlockErrorService.createFallbackContent(config.type),
        };
    }
};
