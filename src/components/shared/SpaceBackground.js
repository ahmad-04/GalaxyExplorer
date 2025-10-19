import { Devvit } from '@devvit/public-api';
export const SpaceBackground = ({ children, theme = 'navy', height = '100%', width = '100%', alignment = 'middle center', }) => {
    // Define theme colors for consistent space-themed backgrounds
    const themeColors = {
        navy: 'navy',
        darkblue: 'darkblue',
        darkgreen: 'darkgreen',
        purple: '#2D1B69', // Deep space purple
    };
    return (Devvit.createElement("vstack", { height: height, width: width, alignment: alignment, backgroundColor: themeColors[theme] }, children));
};
