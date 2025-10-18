import { Devvit } from '@devvit/public-api';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  titleColor?: string;
  subtitleColor?: string;
  backButtonColor?: string;
}

export const ScreenHeader: Devvit.BlockComponent<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backLabel = '← Back to Menu',
  titleColor = 'white',
  subtitleColor = 'lightblue',
  backButtonColor = 'lightblue',
}) => {
  return (
    <vstack alignment="center" gap="small">
      {/* Back navigation button */}
      <button appearance="plain" onPress={onBack}>
        <text size="small" color={backButtonColor}>
          {backLabel}
        </text>
      </button>

      <spacer size="medium" />

      {/* Screen title */}
      <text size="xxlarge" weight="bold" color={titleColor}>
        {title}
      </text>

      {/* Optional subtitle */}
      {subtitle && (
        <text size="medium" color={subtitleColor}>
          {subtitle}
        </text>
      )}

      <spacer size="large" />
    </vstack>
  );
};
