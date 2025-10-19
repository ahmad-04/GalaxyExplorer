import { redis } from '@devvit/web/server';
/**
 * Service for managing webview context preservation and state synchronization
 */
export class WebviewContextService {
    /**
     * Store webview context for later retrieval
     */
    static async storeContext(context) {
        try {
            const contextKey = this.generateContextKey(context.postId, context.timestamp);
            // Store context with TTL
            await redis.set(contextKey, JSON.stringify(context));
            await redis.expire(contextKey, this.CONTEXT_TTL);
            console.log(`Stored webview context: ${contextKey}`);
            return contextKey;
        }
        catch (error) {
            console.error('Error storing webview context:', error);
            throw new Error('Failed to store webview context');
        }
    }
    /**
     * Retrieve webview context by key
     */
    static async getContext(contextKey) {
        try {
            const contextData = await redis.get(contextKey);
            if (!contextData) {
                console.log(`Context not found: ${contextKey}`);
                return null;
            }
            const context = JSON.parse(contextData);
            // Validate context before returning
            const validation = this.validateContext(context);
            if (!validation.valid) {
                console.error('Invalid context retrieved:', validation.errors);
                return null;
            }
            return validation.sanitizedContext || context;
        }
        catch (error) {
            console.error('Error retrieving webview context:', error);
            return null;
        }
    }
    /**
     * Update existing context with new data
     */
    static async updateContext(contextKey, updates) {
        try {
            const existingContext = await this.getContext(contextKey);
            if (!existingContext) {
                return false;
            }
            const updatedContext = { ...existingContext, ...updates };
            await redis.set(contextKey, JSON.stringify(updatedContext));
            await redis.expire(contextKey, this.CONTEXT_TTL);
            return true;
        }
        catch (error) {
            console.error('Error updating webview context:', error);
            return false;
        }
    }
    /**
     * Parse URL parameters to extract context information
     */
    static parseUrlContext(url) {
        try {
            const urlObj = new URL(url, 'https://reddit.com');
            const params = urlObj.searchParams;
            const baseContext = {
                postId: params.get('postId') || '',
                action: params.get('action') || '',
                timestamp: parseInt(params.get('timestamp') || '0'),
            };
            // Parse block type specific parameters
            const blockType = params.get('blockType');
            switch (blockType) {
                case 'level-preview':
                    return {
                        ...baseContext,
                        blockType,
                        levelId: params.get('levelId') || '',
                        mode: params.get('mode'),
                        difficulty: params.get('difficulty') ? parseInt(params.get('difficulty')) : undefined,
                        creator: params.get('creator') || undefined,
                    };
                case 'weekly-challenge':
                    return {
                        ...baseContext,
                        blockType,
                        weekId: params.get('weekId') || '',
                        challengeId: params.get('challengeId') || '',
                        seedLevelId: params.get('seedLevelId') || '',
                        challengeMode: params.get('challengeMode') === 'true',
                    };
                case 'landing':
                    return {
                        ...baseContext,
                        blockType,
                        mode: params.get('mode'),
                        step: params.get('step') ? parseInt(params.get('step')) : undefined,
                    };
                case 'community-showcase':
                    return {
                        ...baseContext,
                        blockType,
                        filter: params.get('filter'),
                        creator: params.get('creator') || undefined,
                        sortBy: params.get('sortBy'),
                    };
                default:
                    return baseContext;
            }
        }
        catch (error) {
            console.error('Error parsing URL context:', error);
            return null;
        }
    }
    /**
     * Build webview URL with context parameters
     */
    static buildWebviewUrl(baseUrl, context) {
        try {
            const url = new URL(baseUrl, 'https://reddit.com');
            // Add base context parameters
            url.searchParams.set('postId', context.postId);
            url.searchParams.set('blockType', context.blockType);
            url.searchParams.set('action', context.action);
            url.searchParams.set('timestamp', context.timestamp.toString());
            // Add block type specific parameters
            switch (context.blockType) {
                case 'level-preview':
                    const levelContext = context;
                    url.searchParams.set('levelId', levelContext.levelId);
                    if (levelContext.mode)
                        url.searchParams.set('mode', levelContext.mode);
                    if (levelContext.difficulty)
                        url.searchParams.set('difficulty', levelContext.difficulty.toString());
                    if (levelContext.creator)
                        url.searchParams.set('creator', levelContext.creator);
                    break;
                case 'weekly-challenge':
                    const challengeContext = context;
                    url.searchParams.set('weekId', challengeContext.weekId);
                    url.searchParams.set('challengeId', challengeContext.challengeId);
                    url.searchParams.set('seedLevelId', challengeContext.seedLevelId);
                    url.searchParams.set('challengeMode', challengeContext.challengeMode.toString());
                    break;
                case 'landing':
                    const landingContext = context;
                    url.searchParams.set('mode', landingContext.mode);
                    if (landingContext.step)
                        url.searchParams.set('step', landingContext.step.toString());
                    break;
                case 'community-showcase':
                    const communityContext = context;
                    if (communityContext.filter)
                        url.searchParams.set('filter', communityContext.filter);
                    if (communityContext.creator)
                        url.searchParams.set('creator', communityContext.creator);
                    if (communityContext.sortBy)
                        url.searchParams.set('sortBy', communityContext.sortBy);
                    break;
            }
            // Add any additional data as JSON if present
            if (context.data && Object.keys(context.data).length > 0) {
                url.searchParams.set('data', JSON.stringify(context.data));
            }
            return url.toString();
        }
        catch (error) {
            console.error('Error building webview URL:', error);
            return baseUrl;
        }
    }
    /**
     * Store state synchronization data
     */
    static async storeSyncData(syncData) {
        try {
            const syncKey = this.generateSyncKey(syncData.postId, syncData.blockType);
            await redis.set(syncKey, JSON.stringify(syncData));
            await redis.expire(syncKey, this.SYNC_TTL);
            console.log(`Stored sync data: ${syncKey}`);
        }
        catch (error) {
            console.error('Error storing sync data:', error);
            throw new Error('Failed to store sync data');
        }
    }
    /**
     * Retrieve state synchronization data
     */
    static async getSyncData(postId, blockType) {
        try {
            const syncKey = this.generateSyncKey(postId, blockType);
            const syncData = await redis.get(syncKey);
            if (!syncData) {
                return null;
            }
            return JSON.parse(syncData);
        }
        catch (error) {
            console.error('Error retrieving sync data:', error);
            return null;
        }
    }
    /**
     * Validate webview context data
     */
    static validateContext(context) {
        const errors = [];
        // Validate base properties
        if (!context.postId) {
            errors.push('postId is required');
        }
        if (!context.blockType) {
            errors.push('blockType is required');
        }
        if (!context.action) {
            errors.push('action is required');
        }
        if (!context.timestamp || context.timestamp <= 0) {
            errors.push('valid timestamp is required');
        }
        // Validate block type specific properties
        switch (context.blockType) {
            case 'level-preview':
                const levelContext = context;
                if (!levelContext.levelId) {
                    errors.push('levelId is required for level context');
                }
                break;
            case 'weekly-challenge':
                const challengeContext = context;
                if (!challengeContext.weekId) {
                    errors.push('weekId is required for challenge context');
                }
                if (!challengeContext.challengeId) {
                    errors.push('challengeId is required for challenge context');
                }
                if (!challengeContext.seedLevelId) {
                    errors.push('seedLevelId is required for challenge context');
                }
                break;
            case 'landing':
                const landingContext = context;
                if (!landingContext.mode) {
                    errors.push('mode is required for landing context');
                }
                break;
            case 'community-showcase':
                // Community context has optional fields, so no strict validation needed
                break;
            default:
                errors.push(`Unknown block type: ${context.blockType}`);
        }
        // Sanitize context by removing invalid fields
        const sanitizedContext = this.sanitizeContext(context);
        const result = {
            valid: errors.length === 0,
            sanitizedContext,
        };
        if (errors.length > 0) {
            result.errors = errors;
        }
        return result;
    }
    /**
     * Sanitize context data by removing invalid or dangerous fields
     */
    static sanitizeContext(context) {
        // Create a clean copy with only allowed fields
        const sanitized = {
            postId: context.postId,
            blockType: context.blockType,
            action: context.action,
            timestamp: context.timestamp,
        };
        // Add block type specific fields
        switch (context.blockType) {
            case 'level-preview':
                const levelContext = context;
                return {
                    ...sanitized,
                    levelId: levelContext.levelId,
                    mode: levelContext.mode,
                    difficulty: levelContext.difficulty,
                    creator: levelContext.creator,
                };
            case 'weekly-challenge':
                const challengeContext = context;
                return {
                    ...sanitized,
                    weekId: challengeContext.weekId,
                    challengeId: challengeContext.challengeId,
                    seedLevelId: challengeContext.seedLevelId,
                    challengeMode: challengeContext.challengeMode,
                    userProgress: challengeContext.userProgress,
                };
            case 'landing':
                const landingContext = context;
                return {
                    ...sanitized,
                    mode: landingContext.mode,
                    step: landingContext.step,
                    completedSteps: landingContext.completedSteps,
                };
            case 'community-showcase':
                const communityContext = context;
                return {
                    ...sanitized,
                    filter: communityContext.filter,
                    creator: communityContext.creator,
                    tags: communityContext.tags,
                    sortBy: communityContext.sortBy,
                };
            default:
                return sanitized;
        }
    }
    /**
     * Generate context storage key
     */
    static generateContextKey(postId, timestamp) {
        return `webview:context:${postId}:${timestamp}`;
    }
    /**
     * Generate sync data storage key
     */
    static generateSyncKey(postId, blockType) {
        return `webview:sync:${postId}:${blockType}`;
    }
    /**
     * Clean up expired context data
     */
    static async cleanupExpiredContexts() {
        try {
            // This would typically be called by a scheduled job
            // For now, we rely on Redis TTL to handle cleanup automatically
            console.log('Context cleanup relies on Redis TTL');
        }
        catch (error) {
            console.error('Error during context cleanup:', error);
        }
    }
}
WebviewContextService.CONTEXT_TTL = 60 * 60; // 1 hour in seconds
WebviewContextService.SYNC_TTL = 24 * 60 * 60; // 24 hours in seconds
