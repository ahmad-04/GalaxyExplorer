import { Devvit } from '@devvit/public-api';

export interface SpaceBackgroundProps {
  children: Devvit.Blocks;
  theme?: 'navy' | 'darkblue' | 'darkgreen' | 'purple';
  height?: string;
  width?: string;
  alignment?: 'start' | 'center' | 'end' | 'middle center';
}

export const SpaceBackground: Devvit.BlockComponent<SpaceBackgroundProps> = ({
  children,
  theme = 'navy',
  height = '100%',
  width = '100%',
  alignment = 'middle center',
}) => {
  // Define theme colors for consistent space-themed backgrounds
  const themeColors = {
    navy: 'navy',
    darkblue: 'darkblue',
    darkgreen: 'darkgreen',
    purple: '#2D1B69', // Deep space purple
  };

  return (
    <vstack
      height={height}
      width={width}
      alignment={alignment}
      backgroundColor={themeColors[theme]}
    >
      {children}
    </vstack>
  );
};
