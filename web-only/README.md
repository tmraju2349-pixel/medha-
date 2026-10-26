# Medha AI Cognitive Care — Web App

Medha is now a browser-only Vite application. Expo, React Native, native permissions, mobile bundlers, and mobile-only artifacts have been removed.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Build and serve a production bundle

```bash
pnpm build
pnpm serve
```

The build is written to `artifacts/medha-caregiver-portal/dist/public`.

## Deploy

Deploy the contents of `artifacts/medha-caregiver-portal/dist/public` to any static hosting provider. For a subpath deployment, set `BASE_PATH` while building:

```bash
BASE_PATH=/medha/ pnpm build
```

The application does not require a server or database for its local browser experience. The existing API server remains in the repository for future authentication and cloud synchronization work, but it is not required to run the web UI.

## Bluetooth

Open **Devices** and choose **Scan for Bluetooth devices**. Web Bluetooth is supported in Chromium-based browsers, including Chrome and Edge, on `localhost` or a secure HTTPS deployment. The browser controls the device permission dialog.

## File transfer

Open **More → Transfer care data** to export the local care plan and device settings as a JSON file. Use **Import data** on another browser or computer to restore that file. Data stays in browser local storage unless explicitly exported.
