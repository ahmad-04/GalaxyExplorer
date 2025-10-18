import { Devvit } from '@devvit/public-api';

export interface StyledButtonProps {
  label: string;
  icon?: string;
  appearance?: 'primary' | 'secondary' | 'plain';
  size?: 'small' | 'medium' | 'large';
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
}

export const StyledButton: Devvit.BlockComponent<StyledButtonProps> = ({
  label,
  icon,
  appearance = 'primary',
  size = 'medium',
  onPress,
  disabled = false,
  loading = false,
  error = false,
}) => {
  // Handle error state display
  if (error) {
    return (
      <button appearance="secondary" size={size} onPress={onPress} disabled={disabled || loading}>
        ⚠️ Retry {label}
      </button>
    );
  }

  // Handle loading state display
  if (loading) {
    return (
      <button appearance={appearance} size={size} onPress={onPress} disabled={true}>
        ⭐ Loading...
      </button>
    );
  }

  // Normal state display
  const displayText = icon ? `${icon} ${label}` : label;

  return (
    <button appearance={appearance} size={size} onPress={onPress} disabled={disabled}>
      {displayText}
    </button>
  );
};
