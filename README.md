# Real APK Builder — MIAN X NIAZI

This is a real HTML-to-Android APK builder, not a fake/prank UI.

## How it works
1. User enters an app name and HTML.
2. Browser sends HTML to `/api/build`.
3. Node.js creates a temporary Android project.
4. Gradle compiles a real debug APK.
5. Server returns the APK for download.

## Run locally
Requirements: Node.js 20+ and Android SDK/Gradle (or use Docker).

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Recommended deployment
Use a Docker-capable server/VPS. A normal static host such as GitHub Pages cannot execute the Android/Gradle build server.

```bash
docker build -t apk-builder .
docker run -p 3000:3000 apk-builder
```

For production, add authentication, rate limiting, a build queue, disk cleanup, request-size limits, and an isolated worker/container per build. Do not run untrusted build scripts with host privileges.
