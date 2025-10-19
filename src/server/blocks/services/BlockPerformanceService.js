import { redis } from '@devvit/web/server';
/**
 * Service for optimizing block loading performance
 */
export class BlockPerformanceService {
    /**
     * Create skeleton loading state for improved perceived performance
     */
    static createSkeletonState(blockType) {
        const baseStyle = {
            backgroundColor: 'neutral-background-weak',
            cornerRadius: 'small',
            animation: 'pulse',
        };
        switch (blockType) {
            case 'level-preview':
                return {
                    type: 'skeleton',
                    components: [
                        {
                            type: 'hstack',
                            gap: 'medium',
                            children: [
                                {
                                    type: 'skeleton-box',
                                    width: '80px',
                                    height: '60px',
                                    style: baseStyle,
                                },
                                {
                                    type: 'vstack',
                                    gap: 'small',
                                    children: [
                                        {
                                            type: 'skeleton-text',
                                            width: '200px',
                                            height: '20px',
                                            style: baseStyle,
                                        },
                                        {
                                            type: 'skeleton-text',
                                            width: '120px',
                                            height: '16px',
                                            style: baseStyle,
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: 'hstack',
                            gap: 'small',
                            children: [
                                {
                                    type: 'skeleton-button',
                                    width: '80px',
                                    height: '32px',
                                    style: baseStyle,
                                },
                                {
                                    type: 'skeleton-button',
                                    width: '100px',
                                    height: '32px',
                                    style: baseStyle,
                                },
                            ],
                        },
                    ],
                };
            case 'weekly-challenge':
                return {
                    type: 'skeleton',
                    components: [
                        {
                            type: 'skeleton-text',
                            width: '180px',
                            height: '24px',
                            style: baseStyle,
                        },
                        {
                            type: 'skeleton-text',
                            width: '250px',
                            height: '16px',
                            style: baseStyle,
                        },
                        {
                            type: 'vstack',
                            gap: 'small',
                            children: Array.from({ length: 3 }, () => ({
                                type: 'skeleton-text',
                                width: '200px',
                                height: '14px',
                                style: baseStyle,
                            })),
                        },
                    ],
                };
            case 'community-showcase':
                return {
                    type: 'skeleton',
                    components: [
                        {
                            type: 'skeleton-text',
                            width: '160px',
                            height: '24px',
                            style: baseStyle,
                        },
                        {
                            type: 'hstack',
                            gap: 'medium',
                            children: Array.from({ length: 4 }, () => ({
                                type: 'skeleton-box',
                                width: '60px',
                                height: '40px',
                                style: baseStyle,
                            })),
                        },
                    ],
                };
            default:
                return {
                    type: 'skeleton',
                    components: [
                        {
                            type: 'skeleton-text',
                            width: '150px',
                            height: '20px',
                            style: baseStyle,
                        },
                        {
                            type: 'skeleton-text',
                            width: '200px',
                            height: '16px',
                            style: baseStyle,
                        },
                    ],
                };
        }
    }
    /**
     * Create progressive loading state with progress indicator
     */
    static createProgressiveLoadingState(stage, progress) {
        const stageMessages = {
            fetching: 'Loading content...',
            processing: 'Processing data...',
            rendering: 'Preparing display...',
            complete: 'Ready!',
        };
        return {
            type: 'progressive-loading',
            stage,
            progress: Math.min(100, Math.max(0, progress)),
            message: stageMessages[stage],
            components: [
                {
                    type: 'vstack',
                    gap: 'small',
                    alignment: 'center',
                    children: [
                        {
                            type: 'text',
                            content: stageMessages[stage],
                            size: 'medium',
                            color: 'secondary',
                        },
                        {
                            type: 'progress-bar',
                            progress,
                            width: '200px',
                            height: '4px',
                            style: {
                                backgroundColor: 'neutral-background',
                                fillColor: 'interactive-background',
                                cornerRadius: 'full',
                            },
                        },
                    ],
                },
            ],
        };
    }
    /**
     * Implement lazy loading for block content and images
     */
    static async implementLazyLoading(blockId, contentLoader, config) {
        const lazyConfig = { ...this.LAZY_LOAD_CONFIG, ...config };
        if (!lazyConfig.enabled) {
            return await contentLoader();
        }
        try {
            // Store loading state
            await this.setLoadingState(blockId, {
                isLoading: true,
                progress: 0,
                stage: 'fetching',
            });
            // Implement debounced loading
            await this.debounce(lazyConfig.debounceMs);
            // Update progress
            await this.setLoadingState(blockId, {
                isLoading: true,
                progress: 30,
                stage: 'processing',
            });
            // Load content
            const content = await contentLoader();
            // Final progress update
            await this.setLoadingState(blockId, {
                isLoading: false,
                progress: 100,
                stage: 'complete',
            });
            return content;
        }
        catch (error) {
            await this.setLoadingState(blockId, {
                isLoading: false,
                progress: 0,
                stage: 'fetching',
            });
            throw error;
        }
    }
    /**
     * Batch data fetching for multiple blocks
     */
    static async batchFetchBlockData(requests) {
        const results = [];
        const batchSize = this.LAZY_LOAD_CONFIG.batchSize;
        // Process requests in batches
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchPromises = batch.map(async (request) => {
                try {
                    const startTime = Date.now();
                    const data = await this.implementLazyLoading(request.blockId, request.loader);
                    const loadTime = Date.now() - startTime;
                    await this.recordPerformanceMetric(request.blockType, {
                        loadTime,
                        renderTime: 0,
                        cacheHitRatio: 0,
                        errorRate: 0,
                        timestamp: Date.now(),
                    });
                    return { blockId: request.blockId, data };
                }
                catch (error) {
                    await this.recordPerformanceMetric(request.blockType, {
                        loadTime: 0,
                        renderTime: 0,
                        cacheHitRatio: 0,
                        errorRate: 1,
                        timestamp: Date.now(),
                    });
                    return {
                        blockId: request.blockId,
                        data: null,
                        error: error,
                    };
                }
            });
            const batchResults = await Promise.allSettled(batchPromises);
            // Process batch results
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    results.push({
                        blockId: 'unknown',
                        data: null,
                        error: new Error(result.reason),
                    });
                }
            });
            // Add delay between batches to prevent overwhelming
            if (i + batchSize < requests.length) {
                await this.debounce(50);
            }
        }
        return results;
    }
    /**
     * Implement client-side caching for frequently accessed data
     */
    static async implementClientCache(cacheKey, dataLoader, ttlSeconds = 300) {
        try {
            // Check client cache first
            const clientCacheKey = `client:cache:${cacheKey}`;
            const cached = await redis.get(clientCacheKey);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                const now = Date.now();
                if (parsedCache.expiry > now) {
                    console.log(`[BlockPerformanceService] Client cache HIT for ${cacheKey}`);
                    return parsedCache.data;
                }
            }
            // Load fresh data
            console.log(`[BlockPerformanceService] Client cache MISS for ${cacheKey}`);
            const data = await dataLoader();
            // Store in client cache with expiry
            const cacheData = {
                data,
                expiry: Date.now() + ttlSeconds * 1000,
                timestamp: Date.now(),
            };
            await redis.set(clientCacheKey, JSON.stringify(cacheData));
            await redis.expire(clientCacheKey, ttlSeconds + 60); // Add buffer to Redis TTL
            return data;
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Client cache error for ${cacheKey}:`, error);
            // Fallback to direct data loading
            return await dataLoader();
        }
    }
    /**
     * Optimize image loading with progressive enhancement
     */
    static createOptimizedImageConfig(args) {
        const { url, width, height, alt, lazy = true, placeholder } = args;
        if (!url) {
            return {
                type: 'placeholder',
                width: `${width}px`,
                height: `${height}px`,
                content: placeholder || '🎮',
                style: {
                    backgroundColor: 'neutral-background-weak',
                    cornerRadius: 'small',
                    border: 'thin',
                    borderColor: 'neutral-border',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                },
            };
        }
        const config = {
            type: 'image',
            url,
            width: `${width}px`,
            height: `${height}px`,
            alt,
            style: {
                cornerRadius: 'small',
                transition: 'opacity 0.3s ease',
            },
        };
        if (lazy) {
            config.loading = 'lazy';
            config.placeholder = {
                type: 'skeleton-box',
                width: `${width}px`,
                height: `${height}px`,
                style: {
                    backgroundColor: 'neutral-background-weak',
                    cornerRadius: 'small',
                    animation: 'pulse',
                },
            };
        }
        return config;
    }
    /**
     * Record performance metrics for monitoring
     */
    static async recordPerformanceMetric(blockType, metrics) {
        try {
            const metricsKey = `${this.METRICS_KEY}:${blockType}`;
            const existingMetrics = await redis.get(metricsKey);
            let aggregatedMetrics;
            if (existingMetrics) {
                const parsed = JSON.parse(existingMetrics);
                // Simple averaging for now - could be more sophisticated
                aggregatedMetrics = {
                    loadTime: (parsed.loadTime + metrics.loadTime) / 2,
                    renderTime: (parsed.renderTime + metrics.renderTime) / 2,
                    cacheHitRatio: (parsed.cacheHitRatio + metrics.cacheHitRatio) / 2,
                    errorRate: (parsed.errorRate + metrics.errorRate) / 2,
                    timestamp: metrics.timestamp,
                };
            }
            else {
                aggregatedMetrics = metrics;
            }
            await redis.set(metricsKey, JSON.stringify(aggregatedMetrics));
            await redis.expire(metricsKey, 24 * 60 * 60); // 24 hours
            console.log(`[BlockPerformanceService] Recorded metrics for ${blockType}:`, {
                loadTime: aggregatedMetrics.loadTime,
                errorRate: aggregatedMetrics.errorRate,
            });
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Error recording metrics:`, error);
        }
    }
    /**
     * Get performance metrics for a block type
     */
    static async getPerformanceMetrics(blockType) {
        try {
            const metricsKey = `${this.METRICS_KEY}:${blockType}`;
            const metrics = await redis.get(metricsKey);
            if (metrics) {
                return JSON.parse(metrics);
            }
            return null;
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Error getting metrics:`, error);
            return null;
        }
    }
    /**
     * Get aggregated performance report
     */
    static async getPerformanceReport() {
        try {
            const blockTypes = ['level-preview', 'weekly-challenge', 'landing', 'community-showcase'];
            const byType = {};
            let totalLoadTime = 0;
            let totalRenderTime = 0;
            let totalCacheHitRatio = 0;
            let totalErrorRate = 0;
            let count = 0;
            for (const blockType of blockTypes) {
                const metrics = await this.getPerformanceMetrics(blockType);
                if (metrics) {
                    byType[blockType] = metrics;
                    totalLoadTime += metrics.loadTime;
                    totalRenderTime += metrics.renderTime;
                    totalCacheHitRatio += metrics.cacheHitRatio;
                    totalErrorRate += metrics.errorRate;
                    count++;
                }
            }
            const overall = {
                loadTime: count > 0 ? totalLoadTime / count : 0,
                renderTime: count > 0 ? totalRenderTime / count : 0,
                cacheHitRatio: count > 0 ? totalCacheHitRatio / count : 0,
                errorRate: count > 0 ? totalErrorRate / count : 0,
                timestamp: Date.now(),
            };
            return { overall, byType };
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Error generating performance report:`, error);
            return {
                overall: {
                    loadTime: 0,
                    renderTime: 0,
                    cacheHitRatio: 0,
                    errorRate: 0,
                    timestamp: Date.now(),
                },
                byType: {},
            };
        }
    }
    // Private helper methods
    /**
     * Set loading state for a block
     */
    static async setLoadingState(blockId, state) {
        try {
            const stateKey = `${this.LOADING_STATES_KEY}:${blockId}`;
            await redis.set(stateKey, JSON.stringify(state));
            await redis.expire(stateKey, 300); // 5 minutes
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Error setting loading state:`, error);
        }
    }
    /**
     * Get loading state for a block
     */
    static async getLoadingState(blockId) {
        try {
            const stateKey = `${this.LOADING_STATES_KEY}:${blockId}`;
            const state = await redis.get(stateKey);
            if (state) {
                return JSON.parse(state);
            }
            return null;
        }
        catch (error) {
            console.error(`[BlockPerformanceService] Error getting loading state:`, error);
            return null;
        }
    }
    /**
     * Simple debounce implementation
     */
    static async debounce(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
BlockPerformanceService.METRICS_KEY = 'block:performance:metrics';
BlockPerformanceService.LOADING_STATES_KEY = 'block:loading:states';
BlockPerformanceService.LAZY_LOAD_CONFIG = {
    enabled: true,
    threshold: 200,
    batchSize: 3,
    debounceMs: 100,
};
