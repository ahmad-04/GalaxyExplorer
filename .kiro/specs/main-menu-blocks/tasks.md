# Implementation Plan

- [x] 1. Create reusable UI components

  - Create StyledButton component with consistent styling and theming
  - Create SpaceBackground component for consistent space-themed backgrounds
  - Create ScreenHeader component with back navigation pattern
  - _Requirements: 1.4, 4.2_

- [x] 2. Implement MenuScreen component

  - Create MenuScreen component with main menu layout using vstack and proper spacing
  - Add Galaxy Explorer logo, title, and feature highlights section
  - Implement primary navigation buttons for Play and Build modes
  - Add proper space-themed styling with navy background and appropriate colors
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement PlayModeScreen component

  - Create PlayModeScreen component with play mode options layout
  - Add back navigation using ScreenHeader component
  - Implement buttons for Campaign, Community Levels, and Weekly Challenge
  - Add proper parameter passing for webview integration
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4. Implement BuildModeScreen component

  - Create BuildModeScreen component with build mode options layout
  - Add back navigation using ScreenHeader component
  - Implement buttons for Create New Level, Edit My Levels, and Building Tutorial
  - Add proper parameter passing for webview integration
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 5. Create webview integration utility

  - Extract webview launch logic into reusable utility function
  - Implement proper parameter construction for different game modes
  - Add error handling and retry mechanisms for webview launch failures
  - Add loading state management during webview launches
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

-

- [x] 6. Implement MainMenuPost root component

  - Create MainMenuPost component with state management for page navigation
  - Implement conditional rendering for different menu screens
  - Add navigation handlers for moving between screens
  - Integrate webview launcher utility with proper error handling
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 7. Update main.tsx with new custom post type

  - Replace existing Galaxy Explorer custom post type with new MainMenuPost component
  - Ensure proper Devvit configuration and component registration
  - Maintain existing moderator menu action for creating Galaxy Explorer posts
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Add error handling and loading states

  - Implement comprehensive error handling for webview launch failures
  - Add loading states and user feedback during navigation and webview launches
  - Create fallback mechanisms for invalid navigation states
  - Add proper error logging for debugging purposes
  - _Requirements: 4.4, 5.3_

- [ ]\* 9. Write component unit tests

  - Create unit tests for StyledButton component behavior and styling
  - Write tests for MenuScreen, PlayModeScreen, and BuildModeScreen rendering
  - Test MainMenuPost state management and navigation logic
  - Test webview integration utility with different parameter combinations
  - _Requirements: All requirements_

- [ ]\* 10. Write integration tests
  - Create end-to-end tests for complete navigation flows
  - Test webview integration with different game modes and actions
  - Verify error handling scenarios and recovery mechanisms
  - Test moderator menu action and post creation workflow
  - _Requirements: All requirements_
