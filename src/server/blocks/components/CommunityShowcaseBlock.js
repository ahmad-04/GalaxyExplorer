import { createBaseBlockConfig, createBlockHeader, createStatsDisplay, createBlockActions, createThumbnailConfig, createLoadingState, createErrorState, } from './BaseBlock.js';
/**
 * Community showcase block component with statistics and featured content
 * Displays community stats, featured creators, popular levels, and events
 */
export class CommunityShowcaseBlock {
    /**
     * Create a complete community showcase block configuration
     */
    static createBlockConfig(config) {
        const communityData = config.data;
        // Create base block structure
        const baseConfig = createBaseBlockConfig(config);
        // Create header
        const header = createBlockHeader(config);
        // Create community statistics section
        const stats = this.createCommunityStats(communityData.statistics);
        // Create featured creators section
        const creators = this.createFeaturedCreators(communityData.featuredCreators);
        // Create popular levels carousel
        const popularLevels = this.createPopularLevels(communityData.popularLevels);
        // Create community events section (if available)
        const events = this.createCommunityEvents(communityData.communityEvents);
        // Create action buttons
        const actions = createBlockActions(config);
        return {
            ...baseConfig,
            components: [
                header,
                {
                    type: 'content',
                    layout: 'community-showcase',
                    stats,
                    creators,
                    popularLevels,
                    events,
                },
                actions,
            ],
        };
    }
    /**
     * Create community statistics display
     */
    static createCommunityStats(statistics) {
        const stats = [
            {
                label: 'Total Levels',
                value: this.formatNumber(statistics.totalLevels),
                icon: '🏗️',
            },
            {
                label: 'Active Players',
                value: this.formatNumber(statistics.activePlayers),
                icon: '👥',
            },
            {
                label: 'Creators',
                value: this.formatNumber(statistics.totalCreators),
                icon: '🎨',
            },
            {
                label: 'Weekly Plays',
                value: this.formatNumber(statistics.weeklyPlays),
                icon: '📈',
            },
        ];
        return {
            type: 'community-stats',
            title: 'Community Stats',
            stats: createStatsDisplay(stats),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                backgroundColor: 'neutral-background',
                padding: 'small',
                cornerRadius: 'small',
                border: 'thin',
                borderColor: 'neutral-border-weak',
            },
        };
    }
    /**
     * Create featured creators section
     */
    static createFeaturedCreators(featuredCreators) {
        if (!featuredCreators || featuredCreators.length === 0) {
            return {
                type: 'creators-empty',
                message: 'No featured creators yet',
                style: {
                    textAlign: 'center',
                    textColor: 'secondary',
                    textSize: 'small',
                    padding: 'small',
                },
            };
        }
        return {
            type: 'featured-creators',
            title: 'Featured Creators',
            creators: featuredCreators.slice(0, 3).map((creator, index) => ({
                username: creator.username,
                levelCount: creator.levelCount,
                totalPlays: creator.totalPlays,
                rank: index + 1,
                avatar: creator.avatarUrl
                    ? {
                        type: 'image',
                        url: creator.avatarUrl,
                        width: '32px',
                        height: '32px',
                        alt: `${creator.username} avatar`,
                        style: { cornerRadius: 'full' },
                    }
                    : {
                        type: 'placeholder',
                        width: '32px',
                        height: '32px',
                        icon: '👤',
                        style: { cornerRadius: 'full', backgroundColor: 'neutral-background' },
                    },
                badge: this.getCreatorBadge(creator.levelCount),
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                layout: 'vertical',
                gap: 'small',
                creatorPadding: 'small',
                creatorCornerRadius: 'small',
                creatorBackgroundColor: 'neutral-background-weak',
            },
        };
    }
    /**
     * Create popular levels carousel
     */
    static createPopularLevels(popularLevels) {
        if (!popularLevels || popularLevels.length === 0) {
            return {
                type: 'levels-empty',
                message: 'No popular levels yet',
                style: {
                    textAlign: 'center',
                    textColor: 'secondary',
                    textSize: 'small',
                    padding: 'small',
                },
            };
        }
        return {
            type: 'popular-levels',
            title: 'Popular Levels',
            levels: popularLevels.slice(0, 3).map((level) => ({
                levelId: level.levelId,
                title: level.title,
                creator: level.creator,
                playCount: this.formatNumber(level.playCount),
                rating: level.rating ? `${level.rating.toFixed(1)}/5` : undefined,
                thumbnail: level.thumbnailUrl
                    ? createThumbnailConfig({
                        url: level.thumbnailUrl,
                        width: 60,
                        height: 45,
                        alt: `${level.title} thumbnail`,
                    })
                    : createThumbnailConfig({
                        width: 60,
                        height: 45,
                        alt: `${level.title} thumbnail`,
                    }),
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                layout: 'horizontal',
                gap: 'medium',
                levelPadding: 'small',
                levelCornerRadius: 'small',
                levelBackgroundColor: 'neutral-background',
                levelBorder: 'thin',
                levelBorderColor: 'neutral-border-weak',
            },
        };
    }
    /**
     * Create community events section
     */
    static createCommunityEvents(communityEvents) {
        if (!communityEvents || communityEvents.length === 0) {
            return {
                type: 'events-empty',
                message: 'No upcoming events',
                style: {
                    textAlign: 'center',
                    textColor: 'secondary',
                    textSize: 'small',
                    padding: 'small',
                },
            };
        }
        const activeEvents = communityEvents.filter((event) => event.endDate > Date.now());
        if (activeEvents.length === 0) {
            return {
                type: 'events-empty',
                message: 'No active events',
                style: {
                    textAlign: 'center',
                    textColor: 'secondary',
                    textSize: 'small',
                    padding: 'small',
                },
            };
        }
        return {
            type: 'community-events',
            title: 'Community Events',
            events: activeEvents.slice(0, 2).map((event) => ({
                title: event.title,
                description: event.description,
                timeRemaining: this.formatTimeRemaining(event.endDate - Date.now()),
                status: this.getEventStatus(event.startDate, event.endDate),
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                layout: 'vertical',
                gap: 'small',
                eventPadding: 'small',
                eventCornerRadius: 'small',
                eventBackgroundColor: 'brand-background-weak',
                eventBorder: 'thin',
                eventBorderColor: 'brand-border',
            },
        };
    }
    /**
     * Get creator badge based on level count
     */
    static getCreatorBadge(levelCount) {
        if (levelCount >= 10)
            return '🏆'; // Master Creator
        if (levelCount >= 5)
            return '⭐'; // Star Creator
        if (levelCount >= 3)
            return '🌟'; // Rising Creator
        return '🚀'; // New Creator
    }
    /**
     * Get event status based on start and end dates
     */
    static getEventStatus(startDate, endDate) {
        const now = Date.now();
        if (now < startDate)
            return 'upcoming';
        if (now >= startDate && now <= endDate)
            return 'active';
        return 'ended';
    }
    /**
     * Format time remaining for events
     */
    static formatTimeRemaining(milliseconds) {
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) {
            return `${days}d ${hours}h remaining`;
        }
        else if (hours > 0) {
            return `${hours}h remaining`;
        }
        else {
            const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
            return `${minutes}m remaining`;
        }
    }
    /**
     * Format numbers for display (e.g., 1.2K, 5.3M)
     */
    static formatNumber(num) {
        if (num < 1000) {
            return num.toString();
        }
        else if (num < 1000000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        else {
            return `${(num / 1000000).toFixed(1)}M`;
        }
    }
    /**
     * Create loading state for community showcase block
     */
    static createLoadingBlock() {
        return {
            type: 'community-showcase-loading',
            components: [createLoadingState()],
            style: {
                padding: 'medium',
                cornerRadius: 'medium',
                backgroundColor: 'neutral-background-weak',
                border: 'thin',
                borderColor: 'neutral-border',
            },
        };
    }
    /**
     * Create error state for community showcase block
     */
    static createErrorBlock(error) {
        return {
            type: 'community-showcase-error',
            components: [createErrorState(error)],
            style: {
                padding: 'medium',
                cornerRadius: 'medium',
                backgroundColor: 'neutral-background-weak',
                border: 'thin',
                borderColor: 'neutral-border',
            },
        };
    }
    /**
     * Create enhanced community showcase with additional sections
     */
    static createEnhancedBlockConfig(config, options) {
        const communityData = config.data;
        const baseBlock = this.createBlockConfig(config);
        // Add trending tags section if requested
        if (options?.showTrendingTags) {
            const trendingTags = {
                type: 'trending-tags',
                title: 'Trending Tags',
                tags: ['#space-battle', '#puzzle', '#adventure', '#multiplayer'],
                style: {
                    titleSize: 'medium',
                    titleWeight: 'bold',
                    layout: 'horizontal',
                    gap: 'small',
                    tagPadding: 'xsmall',
                    tagCornerRadius: 'full',
                    tagBackgroundColor: 'brand-background-weak',
                    tagTextColor: 'brand-text',
                },
            };
            baseBlock.components[1].trendingTags = trendingTags;
        }
        // Add recent activity section if requested
        if (options?.showRecentActivity) {
            const recentActivity = {
                type: 'recent-activity',
                title: 'Recent Activity',
                activities: [
                    { user: 'TestUser1', action: 'created', target: 'Epic Space Battle', time: '2h ago' },
                    { user: 'TestUser2', action: 'completed', target: 'Asteroid Field', time: '4h ago' },
                ],
                style: {
                    titleSize: 'medium',
                    titleWeight: 'bold',
                    activitySize: 'small',
                    activityColor: 'secondary',
                    timeColor: 'neutral-content-weak',
                },
            };
            baseBlock.components[1].recentActivity = recentActivity;
        }
        return baseBlock;
    }
    /**
     * Create compact community showcase for smaller spaces
     */
    static createCompactBlockConfig(config) {
        const communityData = config.data;
        return {
            type: 'community-showcase-compact',
            style: {
                padding: 'small',
                cornerRadius: 'small',
                backgroundColor: 'neutral-background-weak',
                border: 'thin',
                borderColor: 'neutral-border',
                width: '100%',
            },
            components: [
                {
                    type: 'compact-header',
                    title: 'Community Showcase',
                    subtitle: 'Discover amazing community content',
                    style: {
                        titleSize: 'medium',
                        titleWeight: 'bold',
                        subtitleSize: 'small',
                        subtitleColor: 'secondary',
                    },
                },
                {
                    type: 'compact-stats',
                    stats: [
                        {
                            label: 'Levels',
                            value: this.formatNumber(communityData.statistics.totalLevels),
                        },
                        {
                            label: 'Players',
                            value: this.formatNumber(communityData.statistics.activePlayers),
                        },
                        {
                            label: 'Creators',
                            value: this.formatNumber(communityData.statistics.totalCreators),
                        },
                    ],
                    style: {
                        layout: 'horizontal',
                        gap: 'medium',
                        textSize: 'small',
                        labelColor: 'secondary',
                        valueColor: 'primary',
                        valueWeight: 'bold',
                    },
                },
            ],
        };
    }
    /**
     * Create community showcase with leaderboard focus
     */
    static createLeaderboardBlockConfig(config) {
        const communityData = config.data;
        const baseBlock = this.createBlockConfig(config);
        // Enhance creators section to show as leaderboard
        const leaderboardSection = {
            type: 'creator-leaderboard',
            title: 'Top Creators This Week',
            leaderboard: communityData.featuredCreators.slice(0, 5).map((creator, index) => ({
                rank: index + 1,
                username: creator.username,
                score: creator.totalPlays,
                badge: this.getCreatorBadge(creator.levelCount),
                trend: index < 2 ? 'up' : index === 2 ? 'same' : 'down', // Mock trend data
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                rankColor: 'brand-text',
                usernameColor: 'primary',
                scoreColor: 'secondary',
                trendUpColor: 'success',
                trendDownColor: 'critical',
            },
        };
        // Replace creators section with leaderboard
        baseBlock.components[1].creators = leaderboardSection;
        return baseBlock;
    }
}
