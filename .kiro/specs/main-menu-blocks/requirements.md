# Requirements Document

## Introduction

This feature implements a main menu system for Galaxy Explorer using Devvit's block-based UI components, following the pattern established in the pixelary example. The main menu will provide navigation to different game modes (Play and Build) and will be implemented as a custom post type that renders using Devvit's block system instead of attempting webview navigation.

## Requirements

### Requirement 1

**User Story:** As a player, I want to see an attractive main menu when I open Galaxy Explorer, so that I can easily navigate to different game modes.

#### Acceptance Criteria

1. WHEN the Galaxy Explorer post is opened THEN the system SHALL display a main menu with the game logo and title
2. WHEN the main menu loads THEN the system SHALL show navigation options for "Play" and "Build" modes
3. WHEN the main menu is displayed THEN the system SHALL use a space-themed visual design consistent with the Galaxy Explorer brand
4. WHEN the main menu renders THEN the system SHALL use Devvit's block components (vstack, hstack, text, button, image, spacer)

### Requirement 2

**User Story:** As a player, I want to access Play mode from the main menu, so that I can start playing Galaxy Explorer levels.

#### Acceptance Criteria

1. WHEN I click the "Play" button THEN the system SHALL navigate to a Play mode submenu
2. WHEN the Play submenu loads THEN the system SHALL display options for "Campaign", "Community Levels", and "Weekly Challenge"
3. WHEN I select a play option THEN the system SHALL launch the appropriate game mode in the webview
4. WHEN I am in the Play submenu THEN the system SHALL provide a "Back to Menu" option

### Requirement 3

**User Story:** As a creator, I want to access Build mode from the main menu, so that I can create and edit Galaxy Explorer levels.

#### Acceptance Criteria

1. WHEN I click the "Build" button THEN the system SHALL navigate to a Build mode submenu
2. WHEN the Build submenu loads THEN the system SHALL display options for "Create New Level", "Edit My Levels", and "Building Tutorial"
3. WHEN I select a build option THEN the system SHALL launch the appropriate editor mode in the webview
4. WHEN I am in the Build submenu THEN the system SHALL provide a "Back to Menu" option

### Requirement 4

**User Story:** As a user, I want smooth navigation between menu screens, so that I have a seamless experience using the interface.

#### Acceptance Criteria

1. WHEN I navigate between menu screens THEN the system SHALL use state management to track the current page
2. WHEN transitioning between screens THEN the system SHALL maintain consistent visual styling
3. WHEN I press back buttons THEN the system SHALL return to the previous menu screen
4. WHEN navigation occurs THEN the system SHALL provide visual feedback (loading states, button states)

### Requirement 5

**User Story:** As a user, I want the main menu to integrate properly with the webview client, so that game modes launch correctly when selected.

#### Acceptance Criteria

1. WHEN I select a game mode option THEN the system SHALL pass the correct parameters to the webview
2. WHEN launching the webview THEN the system SHALL include mode, action, and context information
3. WHEN the webview loads THEN the system SHALL provide proper error handling if launch fails
4. WHEN webview integration occurs THEN the system SHALL use the existing client-server architecture

### Requirement 6

**User Story:** As a moderator, I want to create Galaxy Explorer main menu posts easily, so that I can set up the game in my subreddit.

#### Acceptance Criteria

1. WHEN I access the moderator menu THEN the system SHALL provide a "Create Galaxy Explorer Menu" option
2. WHEN I create a main menu post THEN the system SHALL generate a post with the custom Galaxy Explorer post type
3. WHEN the post is created THEN the system SHALL provide confirmation feedback
4. WHEN the custom post type is used THEN the system SHALL render the block-based main menu interface
