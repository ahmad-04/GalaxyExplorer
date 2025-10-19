import { BlockAnalyticsService } from '../../blocks/services/BlockAnalyticsService.js';
/**
 * API functions for block analytics and monitoring
 * Note: This file provides analytics functions for use in other parts of the system
 * Devvit UI components would be implemented separately in the main app
 */
/**
 * Get analytics dashboard data
 */
export async function getAnalyticsDashboard() {
    try {
        const dashboard = await BlockAnalyticsService.createDashboard();
        return {
            success: true,
            data: dashboard,
        };
    }
    catch (error) {
        console.error('Error getting analytics dashboard:', error);
        return {
            success: false,
            error: 'Failed to load analytics dashboard',
        };
    }
}
/**
 * Get performance metrics for a specific block type
 */
export async function getBlockTypeMetrics(blockType) {
    try {
        const metrics = await BlockAnalyticsService.getPerformanceMetrics(blockType);
        return {
            success: true,
            data: metrics,
        };
    }
    catch (error) {
        console.error('Error getting block type metrics:', error);
        return {
            success: false,
            error: 'Failed to load block metrics',
        };
    }
}
/**
 * Get A/B test results
 */
export async function getABTestResults(testId) {
    try {
        const results = await BlockAnalyticsService.getABTestResults(testId);
        return {
            success: true,
            data: results,
        };
    }
    catch (error) {
        console.error('Error getting A/B test results:', error);
        return {
            success: false,
            error: 'Failed to load A/B test results',
        };
    }
}
// Export analytics functions for use in other parts of the app
export const trackBlockView = BlockAnalyticsService.trackBlockView;
export const trackBlockInteraction = BlockAnalyticsService.trackBlockInteraction;
export const trackBlockAction = BlockAnalyticsService.trackBlockAction;
export const trackLoadTime = BlockAnalyticsService.trackLoadTime;
export const trackWebviewTransition = BlockAnalyticsService.trackWebviewTransition;
export const createDashboard = BlockAnalyticsService.createDashboard;
export const setupABTest = BlockAnalyticsService.setupABTest;
export const getABTestVariant = BlockAnalyticsService.getABTestVariant;
export const trackABTestConversion = BlockAnalyticsService.trackABTestConversion;
