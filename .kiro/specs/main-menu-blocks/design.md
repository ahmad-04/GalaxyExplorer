# Design Document

## Overview

The Galaxy Explorer main menu will be implemented using Devvit's block-based UI system, following the architectural patterns established in the pixelary example. The design focuses on creating a multi-screen navigation experience within a single custom post type, using state management to control which screen is displayed and proper component organization for maintainability.

## Architecture

### Component Structure

The main menu follows a page-based architecture similar to pixelary's PinnedPost component:

```
MainMenuPost (Root Component)
├── MenuScreen (Default/Home)
├── PlayModeScreen (Play options)
├── BuildModeScreen (Build options)
└── WebViewLauncher (Integration helper)
```

### State Management

- **Primary State**: `page` - tracks current screen ('menu', 'play', 'build')
- **Secondary State**: `loading` - manages loading states during webview launches
- **Navigation**: State-based routing using conditional rendering

### Integration Points

- **Webview Integration**: Reuse existing webview launch logic from current implementation
- **Client Communication**: Maintain existing parameter passing to webview client
- **Server Integration**: Leverage existing server-side APIs and Redis storage

## Components and Interfaces

### MainMenuPost Component

**Purpose**: Root component that handles routing and state management

**Props**:

- `context: Context` - Devvit context object

**State**:

```typescript
interface MainMenuState {
  page: 'menu' | 'play' | 'build';
  loading: boolean;
}
```

**Key Methods**:

- `setPage(page: string)` - Navigation handler
- `handleWebViewLaunch(params)` - Webview integration
- `renderCurrentPage()` - Conditional page rendering

### MenuScreen Component

**Purpose**: Main landing screen with primary navigation

**Layout Structure**:

```
vstack (full height, center aligned)
├── Logo/Branding Section
├── Game Title and Description
├── Feature Highlights
├── Primary Action Buttons (Play/Build)
└── Footer Information
```

**Visual Design**:

- Background: Space-themed gradient (navy to dark blue)
- Typography: Large, bold titles with space-themed colors
- Buttons: Primary (Play) and Secondary (Build) styling
- Icons: Space-themed emojis (🚀, 🔧, ✨, etc.)

### PlayModeScreen Component

**Purpose**: Play mode selection with different game types

**Layout Structure**:

```
vstack (full height, center aligned)
├── Back Navigation
├── Screen Title ("Play Mode")
├── Mode Description
└── Action Buttons
    ├── Campaign Mode
    ├── Community Levels
    └── Weekly Challenge
```

**Webview Parameters**:

- `mode: 'play'`
- `gameType: 'campaign' | 'community' | 'challenge'`
- `action: 'start_game' | 'browse_levels' | 'weekly_challenge'`

### BuildModeScreen Component

**Purpose**: Build mode selection with creation and editing options

**Layout Structure**:

```
vstack (full height, center aligned)
├── Back Navigation
├── Screen Title ("Build Mode")
├── Mode Description
└── Action Buttons
    ├── Create New Level
    ├── Edit My Levels
    └── Building Tutorial
```

**Webview Parameters**:

- `mode: 'build'`
- `action: 'create' | 'edit' | 'tutorial'`

## Data Models

### Navigation State

```typescript
type PageType = 'menu' | 'play' | 'build';

interface NavigationState {
  currentPage: PageType;
  previousPage?: PageType;
  loading: boolean;
}
```

### Webview Launch Parameters

```typescript
interface WebViewLaunchParams {
  postId: string;
  blockType: string;
  action: string;
  mode: 'play' | 'build';
  gameType?: 'campaign' | 'community' | 'challenge';
  timestamp: string;
  [key: string]: string;
}
```

### Button Configuration

```typescript
interface MenuButton {
  label: string;
  icon?: string;
  appearance: 'primary' | 'secondary';
  action: () => void;
  disabled?: boolean;
}
```

## Error Handling

### Webview Launch Failures

- **Detection**: Try-catch blocks around webview launch attempts
- **Fallback**: Display error toast with retry option
- **Logging**: Console logging for debugging webview integration issues
- **User Feedback**: Clear error messages and suggested actions

### State Management Errors

- **Invalid State**: Fallback to main menu if unknown page state
- **Navigation Errors**: Reset to menu state with error notification
- **Component Errors**: Error boundaries to prevent full app crashes

### Network and Context Issues

- **Missing Context**: Graceful degradation with limited functionality
- **API Failures**: Retry mechanisms for critical operations
- **Timeout Handling**: Loading state management with timeout fallbacks

## Testing Strategy

### Component Testing

- **Unit Tests**: Individual component rendering and state management
- **Integration Tests**: Navigation flow between screens
- **Visual Tests**: Layout and styling verification across different screen sizes

### User Flow Testing

- **Navigation Testing**: Complete user journeys through menu system
- **Webview Integration**: End-to-end testing of game mode launches
- **Error Scenarios**: Testing error handling and recovery flows

### Performance Testing

- **Rendering Performance**: Component mount and update times
- **State Management**: State transition performance
- **Memory Usage**: Component cleanup and memory leak prevention

## Implementation Notes

### Styling Approach

Following pixelary's pattern:

- Use consistent spacing with `spacer` components
- Implement responsive design with percentage-based widths
- Apply consistent color theming throughout all screens
- Use proper typography hierarchy with Devvit's text components

### Code Organization

```
src/
├── components/
│   ├── MainMenuPost.tsx (root component)
│   ├── MenuScreen.tsx
│   ├── PlayModeScreen.tsx
│   ├── BuildModeScreen.tsx
│   └── shared/
│       ├── StyledButton.tsx
│       └── SpaceBackground.tsx
├── utils/
│   └── webviewLauncher.ts
└── main.tsx (registration)
```

### Reusable Components

- **StyledButton**: Consistent button styling across all screens
- **SpaceBackground**: Reusable background component with space theme
- **ScreenHeader**: Common header pattern with back navigation
- **LoadingState**: Consistent loading indicators

### Migration Strategy

1. **Phase 1**: Implement new block-based components alongside existing code
2. **Phase 2**: Update custom post type registration to use new components
3. **Phase 3**: Remove old webview navigation attempts, keep webview integration
4. **Phase 4**: Test and refine based on user feedback

This design maintains the existing webview integration while providing a much more robust and native-feeling menu system using Devvit's block components, following the proven patterns from the pixelary example.
