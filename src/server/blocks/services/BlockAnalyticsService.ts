import { redis } from '@devvit/web/server';

/**
 * Analytics event types for block interactions
 */
export enum AnalyticsEventType {
  BLOCK_VIEW = 'BLOCK_VIEW',
  BLOCK_INTERACTION = 'BLOCK_INTERACTION',
  BLOCK_ACTION = 'BLOCK_ACTION',
  BLOCK_ERROR = 'BLOCK_ERROR',
  BLOCK_LOAD_TIME = 'BLOCK_LOAD_TIME',
  WEBVIEW_TRANSITION = 'WEBVIEW_TRANSITION',
}

/**
 * Analytics event interface
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  blockId: string;
  blockType: string;
  userId?: string | undefined;
  timestamp: number;
  properties: Record<string, any>;
  sessionId?: string | undefined;
}

/**
 * Performance metrics for monitoring
 */
export interface BlockPerformanceMetrics {
  blockType: string;
  averageLoadTime: number;
  totalViews: number;
  totalInteractions: number;
  errorRate: number;
  conversionRate: number; // Actions / Views
  timestamp: number;
}

/**
 * User engagement metrics
 */
export interface UserEngagementMetrics {
  blockType: string;
  uniqueUsers: number;
  averageTimeOnBlock: number;
  bounceRate: number;
  returnVisitors: number;
  timestamp: number;
}

/**
 * A/B testing configuration
 */
export interface ABTestConfig {
  testId: string;
  blockType: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    config: any;
  }>;
  enabled: boolean;
  startDate: number;
  endDate: number;
}

/**
 * Analytics and monitoring service for blocks
 */
export class BlockAnalyticsService {
  private static readonly EVENTS_KEY = 'block:analytics:events';
  private static readonly METRICS_KEY = 'block:analytics:metrics';
  private static readonly ENGAGEMENT_KEY = 'block:analytics:engagement';
  private static readonly AB_TESTS_KEY = 'block:analytics:ab-tests';
  private static readonly DASHBOARDS_KEY = 'block:analytics:dashboards';

  /**
   * Track block interaction event
   */
  static async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    try {
      const fullEvent: AnalyticsEvent = {
        ...event,
        timestamp: Date.now(),
      };

      // Store individual event
      const eventKey = `${this.EVENTS_KEY}:${fullEvent.blockId}:${fullEvent.timestamp}`;
      await redis.set(eventKey, JSON.stringify(fullEvent));
      await redis.expire(eventKey, 30 * 24 * 60 * 60); // 30 days

      // Update aggregated metrics
      await this.updateMetrics(fullEvent);

      console.log(`[BlockAnalyticsService] Tracked event:`, {
        type: fullEvent.type,
        blockType: fullEvent.blockType,
        blockId: fullEvent.blockId,
      });
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error tracking event:`, error);
    }
  }

  /**
   * Track block view
   */
  static async trackBlockView(
    blockId: string,
    blockType: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.BLOCK_VIEW,
      blockId,
      blockType,
      userId,
      properties: {
        ...properties,
        viewedAt: Date.now(),
      },
    });
  }

  /**
   * Track block interaction
   */
  static async trackBlockInteraction(
    blockId: string,
    blockType: string,
    interactionType: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.BLOCK_INTERACTION,
      blockId,
      blockType,
      userId,
      properties: {
        interactionType,
        ...properties,
        interactedAt: Date.now(),
      },
    });
  }

  /**
   * Track block action (button clicks, etc.)
   */
  static async trackBlockAction(
    blockId: string,
    blockType: string,
    actionId: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.BLOCK_ACTION,
      blockId,
      blockType,
      userId,
      properties: {
        actionId,
        ...properties,
        actionedAt: Date.now(),
      },
    });
  }

  /**
   * Track block load time performance
   */
  static async trackLoadTime(
    blockId: string,
    blockType: string,
    loadTimeMs: number,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.BLOCK_LOAD_TIME,
      blockId,
      blockType,
      properties: {
        loadTimeMs,
        ...properties,
        measuredAt: Date.now(),
      },
    });
  }

  /**
   * Track webview transition from block
   */
  static async trackWebviewTransition(
    blockId: string,
    blockType: string,
    actionId: string,
    userId?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.WEBVIEW_TRANSITION,
      blockId,
      blockType,
      userId,
      properties: {
        actionId,
        transitionType: 'block-to-webview',
        ...properties,
        transitionedAt: Date.now(),
      },
    });
  }

  /**
   * Get performance metrics for a block type
   */
  static async getPerformanceMetrics(blockType: string): Promise<BlockPerformanceMetrics | null> {
    try {
      const metricsKey = `${this.METRICS_KEY}:${blockType}`;
      const metricsStr = await redis.get(metricsKey);

      if (metricsStr) {
        return JSON.parse(metricsStr) as BlockPerformanceMetrics;
      }

      return null;
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error getting performance metrics:`, error);
      return null;
    }
  }

  /**
   * Get user engagement metrics for a block type
   */
  static async getEngagementMetrics(blockType: string): Promise<UserEngagementMetrics | null> {
    try {
      const engagementKey = `${this.ENGAGEMENT_KEY}:${blockType}`;
      const engagementStr = await redis.get(engagementKey);

      if (engagementStr) {
        return JSON.parse(engagementStr) as UserEngagementMetrics;
      }

      return null;
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error getting engagement metrics:`, error);
      return null;
    }
  }

  /**
   * Create analytics dashboard data
   */
  static async createDashboard(): Promise<{
    overview: {
      totalViews: number;
      totalInteractions: number;
      averageLoadTime: number;
      errorRate: number;
    };
    byBlockType: Record<string, BlockPerformanceMetrics>;
    engagement: Record<string, UserEngagementMetrics>;
    topPerformingBlocks: Array<{
      blockId: string;
      blockType: string;
      views: number;
      interactions: number;
      conversionRate: number;
    }>;
  }> {
    try {
      const blockTypes = ['level-preview', 'weekly-challenge', 'landing', 'community-showcase'];

      const byBlockType: Record<string, BlockPerformanceMetrics> = {};
      const engagement: Record<string, UserEngagementMetrics> = {};

      let totalViews = 0;
      let totalInteractions = 0;
      let totalLoadTime = 0;
      let totalErrors = 0;
      let blockCount = 0;

      // Collect metrics for each block type
      for (const blockType of blockTypes) {
        const perfMetrics = await this.getPerformanceMetrics(blockType);
        const engMetrics = await this.getEngagementMetrics(blockType);

        if (perfMetrics) {
          byBlockType[blockType] = perfMetrics;
          totalViews += perfMetrics.totalViews;
          totalInteractions += perfMetrics.totalInteractions;
          totalLoadTime += perfMetrics.averageLoadTime;
          totalErrors += perfMetrics.errorRate * perfMetrics.totalViews;
          blockCount++;
        }

        if (engMetrics) {
          engagement[blockType] = engMetrics;
        }
      }

      // Calculate overview metrics
      const overview = {
        totalViews,
        totalInteractions,
        averageLoadTime: blockCount > 0 ? totalLoadTime / blockCount : 0,
        errorRate: totalViews > 0 ? totalErrors / totalViews : 0,
      };

      // Get top performing blocks (simplified)
      const topPerformingBlocks = await this.getTopPerformingBlocks();

      const dashboard = {
        overview,
        byBlockType,
        engagement,
        topPerformingBlocks,
      };

      // Cache dashboard data
      const dashboardKey = `${this.DASHBOARDS_KEY}:main`;
      await redis.set(dashboardKey, JSON.stringify(dashboard));
      await redis.expire(dashboardKey, 60 * 60); // 1 hour

      return dashboard;
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error creating dashboard:`, error);
      return {
        overview: { totalViews: 0, totalInteractions: 0, averageLoadTime: 0, errorRate: 0 },
        byBlockType: {},
        engagement: {},
        topPerformingBlocks: [],
      };
    }
  }

  /**
   * Setup A/B testing for block variations
   */
  static async setupABTest(config: ABTestConfig): Promise<void> {
    try {
      const testKey = `${this.AB_TESTS_KEY}:${config.testId}`;
      await redis.set(testKey, JSON.stringify(config));
      await redis.expire(testKey, Math.floor((config.endDate - Date.now()) / 1000));

      console.log(`[BlockAnalyticsService] Setup A/B test:`, {
        testId: config.testId,
        blockType: config.blockType,
        variants: config.variants.length,
      });
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error setting up A/B test:`, error);
    }
  }

  /**
   * Get A/B test variant for a user
   */
  static async getABTestVariant(
    testId: string,
    userId: string
  ): Promise<{ variantId: string; config: any } | null> {
    try {
      const testKey = `${this.AB_TESTS_KEY}:${testId}`;
      const testStr = await redis.get(testKey);

      if (!testStr) {
        return null;
      }

      const test = JSON.parse(testStr) as ABTestConfig;

      if (!test.enabled || Date.now() < test.startDate || Date.now() > test.endDate) {
        return null;
      }

      // Simple hash-based variant assignment
      const hash = this.hashString(userId + testId);
      const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
      const normalizedHash = hash % totalWeight;

      let currentWeight = 0;
      for (const variant of test.variants) {
        currentWeight += variant.weight;
        if (normalizedHash < currentWeight) {
          return {
            variantId: variant.id,
            config: variant.config,
          };
        }
      }

      // Fallback to first variant
      const firstVariant = test.variants[0];
      if (firstVariant) {
        return {
          variantId: firstVariant.id,
          config: firstVariant.config,
        };
      }

      return null;
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error getting A/B test variant:`, error);
      return null;
    }
  }

  /**
   * Track A/B test conversion
   */
  static async trackABTestConversion(
    testId: string,
    variantId: string,
    userId: string,
    conversionType: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      const conversionKey = `${this.AB_TESTS_KEY}:${testId}:conversions:${variantId}`;
      const currentCount = await redis.get(conversionKey);
      const newCount = (currentCount ? parseInt(currentCount, 10) : 0) + 1;

      await redis.set(conversionKey, newCount.toString());
      await redis.expire(conversionKey, 30 * 24 * 60 * 60); // 30 days

      // Track detailed conversion event
      await this.trackEvent({
        type: AnalyticsEventType.BLOCK_ACTION,
        blockId: `ab-test-${testId}`,
        blockType: 'ab-test',
        userId,
        properties: {
          testId,
          variantId,
          conversionType,
          ...properties,
        },
      });

      console.log(`[BlockAnalyticsService] Tracked A/B test conversion:`, {
        testId,
        variantId,
        conversionType,
      });
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error tracking A/B test conversion:`, error);
    }
  }

  /**
   * Get A/B test results
   */
  static async getABTestResults(testId: string): Promise<{
    testId: string;
    variants: Array<{
      variantId: string;
      name: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
    }>;
    winner?: string;
    confidence?: number;
  } | null> {
    try {
      const testKey = `${this.AB_TESTS_KEY}:${testId}`;
      const testStr = await redis.get(testKey);

      if (!testStr) {
        return null;
      }

      const test = JSON.parse(testStr) as ABTestConfig;
      const variants = [];

      for (const variant of test.variants) {
        const impressionsKey = `${this.AB_TESTS_KEY}:${testId}:impressions:${variant.id}`;
        const conversionsKey = `${this.AB_TESTS_KEY}:${testId}:conversions:${variant.id}`;

        const impressions = parseInt((await redis.get(impressionsKey)) || '0', 10);
        const conversions = parseInt((await redis.get(conversionsKey)) || '0', 10);
        const conversionRate = impressions > 0 ? conversions / impressions : 0;

        variants.push({
          variantId: variant.id,
          name: variant.name,
          impressions,
          conversions,
          conversionRate,
        });
      }

      // Simple winner determination (highest conversion rate with minimum impressions)
      const minImpressions = 100;
      const eligibleVariants = variants.filter((v) => v.impressions >= minImpressions);
      const winnerVariant =
        eligibleVariants.length > 0
          ? eligibleVariants.reduce((best, current) =>
              current.conversionRate > best.conversionRate ? current : best
            )
          : undefined;

      const winner = winnerVariant?.variantId;

      const result: {
        testId: string;
        variants: Array<{
          variantId: string;
          name: string;
          impressions: number;
          conversions: number;
          conversionRate: number;
        }>;
        winner?: string;
        confidence?: number;
      } = {
        testId,
        variants,
      };

      if (winner) {
        result.winner = winner;
        result.confidence = 0.95; // Simplified confidence
      }

      return result;
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error getting A/B test results:`, error);
      return null;
    }
  }

  // Private helper methods

  /**
   * Update aggregated metrics based on event
   */
  private static async updateMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const metricsKey = `${this.METRICS_KEY}:${event.blockType}`;
      const existingMetrics = await this.getPerformanceMetrics(event.blockType);

      let metrics: BlockPerformanceMetrics;

      if (existingMetrics) {
        metrics = { ...existingMetrics };
      } else {
        metrics = {
          blockType: event.blockType,
          averageLoadTime: 0,
          totalViews: 0,
          totalInteractions: 0,
          errorRate: 0,
          conversionRate: 0,
          timestamp: Date.now(),
        };
      }

      // Update metrics based on event type
      switch (event.type) {
        case AnalyticsEventType.BLOCK_VIEW:
          metrics.totalViews += 1;
          break;

        case AnalyticsEventType.BLOCK_INTERACTION:
        case AnalyticsEventType.BLOCK_ACTION:
          metrics.totalInteractions += 1;
          break;

        case AnalyticsEventType.BLOCK_LOAD_TIME:
          const loadTime = event.properties.loadTimeMs || 0;
          metrics.averageLoadTime = (metrics.averageLoadTime + loadTime) / 2;
          break;

        case AnalyticsEventType.BLOCK_ERROR:
          // Update error rate (simplified calculation)
          const totalEvents = metrics.totalViews + metrics.totalInteractions;
          metrics.errorRate =
            totalEvents > 0 ? (metrics.errorRate * totalEvents + 1) / (totalEvents + 1) : 1;
          break;
      }

      // Update conversion rate
      if (metrics.totalViews > 0) {
        metrics.conversionRate = metrics.totalInteractions / metrics.totalViews;
      }

      metrics.timestamp = Date.now();

      // Store updated metrics
      await redis.set(metricsKey, JSON.stringify(metrics));
      await redis.expire(metricsKey, 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error updating metrics:`, error);
    }
  }

  /**
   * Get top performing blocks
   */
  private static async getTopPerformingBlocks(): Promise<
    Array<{
      blockId: string;
      blockType: string;
      views: number;
      interactions: number;
      conversionRate: number;
    }>
  > {
    try {
      // This would typically aggregate data from individual block events
      // For now, return sample data
      return [
        {
          blockId: 'sample-level-1',
          blockType: 'level-preview',
          views: 150,
          interactions: 45,
          conversionRate: 0.3,
        },
        {
          blockId: 'weekly-challenge-current',
          blockType: 'weekly-challenge',
          views: 200,
          interactions: 80,
          conversionRate: 0.4,
        },
      ];
    } catch (error) {
      console.error(`[BlockAnalyticsService] Error getting top performing blocks:`, error);
      return [];
    }
  }

  /**
   * Simple string hash function for A/B testing
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
