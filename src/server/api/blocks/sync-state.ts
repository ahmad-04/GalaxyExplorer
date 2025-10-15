import { Devvit } from '@devvit/public-api';
import { StateSyncData } from '../../../shared/types/blocks.js';
import { WebviewContextService } from '../../blocks/services/WebviewContextService.js';
import { BlockService } from '../../blocks/services/BlockService.js';

/**
 * API endpoint for synchronizing state changes from webview back to blocks
 */
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    console.log('App installed, setting up state sync endpoint');
  },
});

// Handle state synchronization requests
export async function handleStateSyncRequest(request: Request): Promise<Response> {
  try {
    // Parse request body
    const syncData: StateSyncData = await request.json();

    console.log('Received state sync request:', syncData);

    // Validate sync data
    if (!syncData.postId || !syncData.blockType || !syncData.changes) {
      return new Response(JSON.stringify({ error: 'Invalid sync data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process state changes based on block type
    await processStateChanges(syncData);

    // Store sync data for future reference
    await WebviewContextService.storeSyncData(syncData);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: Date.now(),
        message: 'State synchronized successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error handling state sync request:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Process state changes based on block type
 */
async function processStateChanges(syncData: StateSyncData): Promise<void> {
  const { postId, blockType, changes } = syncData;

  try {
    // Get current block configuration
    const blockConfig = await BlockService.getBlockConfig(postId);
    if (!blockConfig) {
      throw new Error('Block configuration not found');
    }

    // Update block data based on changes
    switch (blockType) {
      case 'level-preview':
        await processLevelStateChanges(postId, changes);
        break;

      case 'weekly-challenge':
        await processChallengeStateChanges(postId, changes);
        break;

      case 'landing':
        await processLandingStateChanges(postId, changes);
        break;

      case 'community-showcase':
        await processCommunityStateChanges(postId, changes);
        break;

      default:
        console.warn(`Unknown block type for state sync: ${blockType}`);
    }

    // Update block metadata with sync timestamp
    await BlockService.updateBlockMetadata(postId, {
      lastUpdated: Date.now(),
      interactionCount: (blockConfig.data as any).interactionCount + 1 || 1,
    });

    console.log(`Processed state changes for ${blockType} block: ${postId}`);
  } catch (error) {
    console.error('Error processing state changes:', error);
    throw error;
  }
}

/**
 * Process level-specific state changes
 */
async function processLevelStateChanges(
  postId: string,
  changes: StateSyncData['changes']
): Promise<void> {
  try {
    const blockConfig = await BlockService.getBlockConfig(postId);
    if (!blockConfig || blockConfig.type !== 'level-preview') {
      throw new Error('Level block configuration not found');
    }

    const levelData = blockConfig.data as any;
    let updated = false;

    // Update play count
    if (changes.playCount !== undefined) {
      levelData.playCount = changes.playCount;
      updated = true;
      console.log(`Updated play count for level ${levelData.levelId}: ${changes.playCount}`);
    }

    // Update rating
    if (changes.rating !== undefined) {
      levelData.rating = changes.rating;
      updated = true;
      console.log(`Updated rating for level ${levelData.levelId}: ${changes.rating}`);
    }

    // Update user progress
    if (changes.userProgress) {
      // Store user-specific progress data
      await BlockService.updateUserProgress(postId, changes.userProgress);
      updated = true;
      console.log(`Updated user progress for level ${levelData.levelId}`);
    }

    // Save updated block configuration
    if (updated) {
      await BlockService.updateBlockConfig(postId, {
        ...blockConfig,
        data: levelData,
      });
    }
  } catch (error) {
    console.error('Error processing level state changes:', error);
    throw error;
  }
}

/**
 * Process challenge-specific state changes
 */
async function processChallengeStateChanges(
  postId: string,
  changes: StateSyncData['changes']
): Promise<void> {
  try {
    const blockConfig = await BlockService.getBlockConfig(postId);
    if (!blockConfig || blockConfig.type !== 'weekly-challenge') {
      throw new Error('Challenge block configuration not found');
    }

    const challengeData = blockConfig.data as any;
    let updated = false;

    // Update leaderboard
    if (changes.leaderboard) {
      challengeData.leaderboard = changes.leaderboard;
      updated = true;
      console.log(`Updated leaderboard for challenge ${challengeData.weekId}`);
    }

    // Update participant count
    if (changes.statistics?.participantCount !== undefined) {
      challengeData.participantCount = changes.statistics.participantCount;
      updated = true;
      console.log(
        `Updated participant count for challenge ${challengeData.weekId}: ${changes.statistics.participantCount}`
      );
    }

    // Update user progress
    if (changes.userProgress) {
      await BlockService.updateUserProgress(postId, changes.userProgress);
      updated = true;
      console.log(`Updated user progress for challenge ${challengeData.weekId}`);
    }

    // Save updated block configuration
    if (updated) {
      await BlockService.updateBlockConfig(postId, {
        ...blockConfig,
        data: challengeData,
      });
    }
  } catch (error) {
    console.error('Error processing challenge state changes:', error);
    throw error;
  }
}

/**
 * Process landing-specific state changes
 */
async function processLandingStateChanges(
  postId: string,
  changes: StateSyncData['changes']
): Promise<void> {
  try {
    // Landing blocks typically don't have much state to sync
    // But we can track user progress through tutorials
    if (changes.userProgress) {
      await BlockService.updateUserProgress(postId, changes.userProgress);
      console.log(`Updated tutorial progress for landing block: ${postId}`);
    }
  } catch (error) {
    console.error('Error processing landing state changes:', error);
    throw error;
  }
}

/**
 * Process community-specific state changes
 */
async function processCommunityStateChanges(
  postId: string,
  changes: StateSyncData['changes']
): Promise<void> {
  try {
    const blockConfig = await BlockService.getBlockConfig(postId);
    if (!blockConfig || blockConfig.type !== 'community-showcase') {
      throw new Error('Community block configuration not found');
    }

    const communityData = blockConfig.data as any;
    let updated = false;

    // Update community statistics
    if (changes.statistics) {
      communityData.statistics = {
        ...communityData.statistics,
        ...changes.statistics,
      };
      updated = true;
      console.log(`Updated community statistics for block: ${postId}`);
    }

    // Save updated block configuration
    if (updated) {
      await BlockService.updateBlockConfig(postId, {
        ...blockConfig,
        data: communityData,
      });
    }
  } catch (error) {
    console.error('Error processing community state changes:', error);
    throw error;
  }
}
