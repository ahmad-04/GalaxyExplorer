# GalaxyExplorer AI Coding Agent Instructions

This document provides essential guidance for AI coding agents to effectively contribute to the GalaxyExplorer codebase.

## 🚀 Big Picture Architecture

GalaxyExplorer is a web-based game built with Phaser and integrated into the Reddit ecosystem using Devvit. The project has a distinct client-server architecture:

-   **`src/client`**: This is the frontend of the application, containing the Phaser game logic. It's a single-page application built with Vite. The game itself is structured into scenes (e.g., `MainMenu`, `StarshipScene`), entities (e.g., `Enemy`, `Player`), and factories.
-   **`src/server`**: This is the backend, powered by Express. It handles API requests from the client, and interacts with Devvit services.
-   **`src/shared`**: Contains shared types and interfaces used by both the client and server, ensuring type safety across the application.
-   **Devvit Integration**: The application is designed to be deployed as a Reddit app using Devvit. The `devvit.json` file configures the app, and the server-side code in `src/server/core` handles Devvit-specific logic like custom posts.

## 🧑‍💻 Developer Workflows

### Build & Development

-   **`npm run dev`**: This is the primary command for development. It uses `concurrently` to start the client and server in watch mode, and also starts the Devvit playtest environment. This allows for live-reloading on both the client and server as you make changes.
-   **`npm run build`**: This command builds both the client and server for production.
-   **`npm run deploy`**: This command builds the application and uploads it to Devvit.

### Testing

The project does not currently have a dedicated testing setup.

### Debugging

-   **Client-side**: Use the browser's developer tools to debug the Phaser game.
-   **Server-side**: Use `console.log` statements in the server code and view the output in the terminal where the `dev` command is running.

## 🧩 Project-Specific Conventions

### Client-Side (Phaser)

-   **Scene Management**: The game is divided into multiple scenes, located in `src/client/game/scenes`. The `Boot` scene is the first to load and is responsible for loading assets and starting the `MainMenu` scene.
-   **Entity Management**: Game objects like enemies and the player are managed as classes. The `EnemyManager` is a good example of how to manage a group of related entities.
-   **Factories**: Factories, like `EnemyFactory`, are used to create game objects. This helps to keep the scene files clean and organized.

### Server-Side (Express & Devvit)

-   **API Endpoints**: The server exposes API endpoints that the client can call using `fetch`. These are defined in the `src/server/core` directory.
-   **Devvit Integration**: The server uses the `@devvit/public-api` to interact with Reddit's services. For example, creating custom posts that embed the game.

### Code Generation

-   **`npm run generate-powerups`**: This script generates power-up related code, which can be found in `tools/generate-powerups.cjs`. When adding new power-ups, this script should be updated and run.

## 🔌 Integration Points & Dependencies

-   **Phaser**: The core of the client-side game. Familiarity with Phaser's concepts (scenes, sprites, physics) is crucial.
-   **Devvit**: The platform for deploying the app on Reddit. Understanding the Devvit lifecycle and its API is important for backend development.
-   **Express**: The web server framework used for the backend.
-   **Vite**: The build tool for both the client and server. Configuration files are `src/client/vite.config.ts` and `src/server/vite.config.ts`.
