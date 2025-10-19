import { createBaseBlockConfig, createBlockHeader, createStatsDisplay, createBlockActions, createLoadingState, createErrorState, } from './BaseBlock.js';
/**
 * Landing block component with app features and getting started actions
 * Displays app description, features, community highlights, and statistics
 */
export class LandingBlock {
    /**
     * Create a complete landing block configuration
     */
    static createBlockConfig(config) {
        const landingData = config.data;
        // Create base block structure
        const baseConfig = createBaseBlockConfig(config);
        // Create header with app title and description
        const header = createBlockHeader(config);
        // Create app features section
        const features = this.createFeaturesSection(landingData.features);
        // Create community highlights carousel
        const highlights = this.createCommunityHighlights(landingData.communityHighlights);
        // Create statistics display
        const stats = this.createAppStats(landingData.statistics);
        // Create action buttons
        const actions = createBlockActions(config);
        return {
            ...baseConfig,
            components: [
                header,
                {
                    type: 'content',
                    layout: 'landing',
                    features,
                    highlights,
                    stats,
                },
                actions,
            ],
        };
    }
    /**
     * Create app features section with bullet points
     */
    static createFeaturesSection(features) {
        return {
            type: 'features',
            title: 'What You Can Do',
            items: features.map((feature) => ({
                text: feature,
                icon: '🚀', // Default icon, could be customized per feature
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                itemSize: 'small',
                itemColor: 'secondary',
                gap: 'small',
                layout: 'vertical',
            },
        };
    }
    /**
     * Create community highlights carousel
     */
    static createCommunityHighlights(highlights) {
        if (!highlights || highlights.length === 0) {
            return {
                type: 'highlights-empty',
                message: 'Be the first to create a level!',
                style: {
                    textAlign: 'center',
                    textColor: 'secondary',
                    textSize: 'small',
                    padding: 'small',
                },
            };
        }
        return {
            type: 'highlights-carousel',
            title: 'Community Highlights',
            items: highlights.slice(0, 3).map((highlight) => ({
                levelId: highlight.levelId,
                title: highlight.title,
                creator: highlight.creator,
                thumbnail: highlight.thumbnailUrl
                    ? {
                        type: 'image',
                        url: highlight.thumbnailUrl,
                        width: '60px',
                        height: '45px',
                        alt: `${highlight.title} thumbnail`,
                    }
                    : {
                        type: 'placeholder',
                        width: '60px',
                        height: '45px',
                        icon: '🎮',
                    },
            })),
            style: {
                titleSize: 'medium',
                titleWeight: 'bold',
                titleColor: 'primary',
                layout: 'horizontal',
                gap: 'medium',
                itemPadding: 'small',
                itemCornerRadius: 'small',
                itemBackgroundColor: 'neutral-background',
            },
        };
    }
    /**
     * Create app statistics display
     */
    static createAppStats(statistics) {
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
                label: 'Total Plays',
                value: this.formatNumber(statistics.totalPlays),
                icon: '▶️',
            },
        ];
        return createStatsDisplay(stats);
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
     * Create loading state for landing block
     */
    static createLoadingBlock() {
        return {
            type: 'landing-loading',
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
     * Create error state for landing block
     */
    static createErrorBlock(error) {
        return {
            type: 'landing-error',
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
     * Create enhanced landing block with additional sections
     */
    static createEnhancedBlockConfig(config, options) {
        const baseBlock = this.createBlockConfig(config);
        // Add tutorial section if requested
        if (options?.showTutorialSection) {
            const tutorialSection = {
                type: 'tutorial',
                title: 'Getting Started',
                steps: [
                    { text: 'Create your first level', icon: '🛠️' },
                    { text: 'Share with the community', icon: '📤' },
                    { text: 'Play levels by others', icon: '🎮' },
                ],
                style: {
                    titleSize: 'medium',
                    titleWeight: 'bold',
                    stepSize: 'small',
                    stepColor: 'secondary',
                    gap: 'small',
                },
            };
            // Insert tutorial section after features
            baseBlock.components[1].tutorial = tutorialSection;
        }
        // Add recent updates section if requested
        if (options?.showRecentUpdates) {
            const updatesSection = {
                type: 'updates',
                title: 'Recent Updates',
                items: [
                    { text: 'New block system for better previews', date: 'Today' },
                    { text: 'Weekly challenges now available', date: '2 days ago' },
                ],
                style: {
                    titleSize: 'medium',
                    titleWeight: 'bold',
                    itemSize: 'small',
                    itemColor: 'secondary',
                    dateColor: 'neutral-content-weak',
                },
            };
            baseBlock.components[1].updates = updatesSection;
        }
        return baseBlock;
    }
    /**
     * Create compact landing block for smaller spaces
     */
    static createCompactBlockConfig(config) {
        const landingData = config.data;
        return {
            type: 'landing-compact',
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
                    title: landingData.appTitle,
                    description: landingData.description,
                    style: {
                        titleSize: 'medium',
                        titleWeight: 'bold',
                        descriptionSize: 'small',
                        descriptionColor: 'secondary',
                    },
                },
                {
                    type: 'compact-stats',
                    stats: [
                        {
                            label: 'Levels',
                            value: this.formatNumber(landingData.statistics.totalLevels),
                        },
                        {
                            label: 'Players',
                            value: this.formatNumber(landingData.statistics.activePlayers),
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
     * Create landing block with call-to-action focus
     */
    static createCTABlockConfig(config) {
        const baseBlock = this.createBlockConfig(config);
        // Enhance with prominent call-to-action
        const ctaSection = {
            type: 'cta',
            title: 'Ready to Start Building?',
            description: 'Join thousands of creators in the Galaxy Explorer community',
            primaryAction: {
                label: 'Create Your First Level',
                appearance: 'primary',
                size: 'large',
            },
            secondaryAction: {
                label: 'Browse Community Levels',
                appearance: 'secondary',
                size: 'medium',
            },
            style: {
                backgroundColor: 'brand-background',
                padding: 'medium',
                cornerRadius: 'medium',
                textAlign: 'center',
                titleColor: 'brand-text',
                descriptionColor: 'brand-text-weak',
            },
        };
        // Add CTA section to the block
        baseBlock.components.splice(-1, 0, { ...ctaSection });
        return baseBlock;
    }
}
