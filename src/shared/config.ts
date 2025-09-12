/**
 * Configuration file for feature flags
 * These flags control which features are enabled in the application
 */

export const FeatureFlags = {
  // Build Mode feature flags
  ENABLE_BUILD_MODE: true,             // Master toggle for Build Mode
  ENABLE_BUILD_MODE_SHARING: false,    // Enable sharing levels with other players
  ENABLE_BUILD_MODE_COMMUNITY: false,  // Enable community features like ratings and comments
  
  // Other feature flags can be added here
};

/**
 * Check if a feature flag is enabled
 * @param flag The feature flag to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[flag] === true;
}

export default FeatureFlags;
