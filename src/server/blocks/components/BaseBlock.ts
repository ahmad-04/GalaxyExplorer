import { BlockConfig } from '../../../shared/types/blocks.js';

/**
 * Block component utilities for devvit block rendering
 * These are helper functions for creating block configurations, not JSX components
 */

/**
 * Create base block configuration with common styling
 */
export const createBaseBlockConfig = (config: BlockConfig) => {
  return {
    ...config,
    // Add common styling properties that will be used by devvit renderer
    style: {
      padding: 'medium',
      cornerRadius: 'medium',
      backgroundColor: 'neutral-background-weak',
      gap: 'small',
      width: '100%',
    },
  };
};

/**
 * Create block header configuration
 */
export const createBlockHeader = (props: { title: string; subtitle?: string; badge?: string }) => {
  return {
    type: 'header',
    title: props.title,
    subtitle: props.subtitle,
    badge: props.badge,
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
 * Create difficulty indicator data
 */
export const createDifficultyIndicator = (level: number) => {
  const stars = '★'.repeat(Math.min(level, 5));
  const emptyStars = '☆'.repeat(Math.max(0, 5 - level));

  return {
    type: 'difficulty',
    level,
    display: `${stars}${emptyStars}`,
    text: `Difficulty: ${level}/5`,
  };
};

/**
 * Create block actions configuration
 */
export const createBlockActions = (
  actions: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary';
    handler: string;
    data?: Record<string, unknown>;
  }>
) => {
  return {
    type: 'actions',
    actions: actions.map((action) => ({
      ...action,
      style: {
        buttonType: action.type,
        size: 'medium',
      },
    })),
  };
};
