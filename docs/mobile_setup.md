# Mobile App Setup Guide

This project supports building a native Android application using Capacitor.

## Prerequisites

1.  **Node.js & npm**: Install from [nodejs.org](https://nodejs.org/).
2.  **Android Studio**: Download and install from [developer.android.com/studio](https://developer.android.com/studio).
3.  **Java/JDK**: Ensure you have JDK 17 installed (usually bundled with Android Studio).

## Setup Instructions

1.  **Navigate to the app directory**:
    ```bash
    cd app
    ```

2.  **Install Dependencies** (if not done already):
    ```bash
    npm install
    ```

3.  **Build the Web Project**:
    ```bash
    npm run build
    ```

4.  **Sync with Capacitor**:
    This copies the built web assets to the native Android project.
    ```bash
    npx cap sync
    ```

## Running the App

1.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```
    This command will launch Android Studio with the `android` project loaded.

2.  **Run on Emulator or Device**:
    - In Android Studio, wait for Gradle sync to complete.
    - Select a virtual device (Emulator) or connect a physical Android device via USB (enable USB Debugging).
    - Click the **Run** button (green triangle) in the toolbar.

## Live Reload (Optional for Development)

To develop with live reload (changes in code reflect instantly on the device):

1.  Find your local IP address (e.g., `192.168.1.x`).
2.  Update `capacitor.config.ts`:
    ```typescript
    server: {
      url: 'http://192.168.1.x:5173', // Replace with your IP and port
      cleartext: true
    }
    ```
3.  Run the dev server:
    ```bash
    npm run dev -- --host
    ```
4.  Run `npx cap sync` and run the app in Android Studio.

## Troubleshooting

-   **Gradle Errors**: Ensure your Android Studio SDK tools are up to date.
-   **Network Issues**: Allow cleartext traffic if connecting to a local API (non-HTTPS).
