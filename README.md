# GHOSTLINE — Private & Secure Communication Platform

Ghostline is a privacy-focused modern communication platform engineered for web, Progressive Web Apps (PWA), and Android. Built with React 19, TanStack Router, TanStack Start SSR, and Nitro, Ghostline provides end-to-end encrypted messaging, media sharing, WebRTC voice and video calling, and group conversation controls without unnecessary telemetry or noise.

---

## Key Features

### 1. Privacy & Cryptographic Security
- **End-to-End Encryption (E2EE):** Signal Protocol-compatible double-ratchet session establishment with prekey bundles and encrypted message envelopes.
- **Zero-Plaintext Server Relay:** Messages and push notifications are delivered as encrypted envelopes; server and database never store or inspect plaintext messages.
- **Ephemeral / Vanish Mode:** Configurable disappearing messages with countdown timers, automatic client-side pruning, and visual indicators.
- **Device & Session Isolation:** Cryptographically scoped per-device encryption keys and remote device revocation.

### 2. Real-Time Messaging & Message Actions
- **Delivery Receipt State Machine:** Realtime tracking for pending sending, sent, delivered, read, and failed states with one-tap retry.
- **Message Editing & History:** Access-controlled message editing with audit history viewer.
- **Rich Message Controls:** Emoji reactions, reply threads, message forwarding, pin cycling banner, and starred messages view.
- **Search & Jump:** Global and conversation-level keyword search with match highlighting and auto-scrolling.

### 3. Media & Attachments
- **Multi-Format Media:** Audio, video, images, voice notes, and document files with secure presigned URLs.
- **Interactive Lightbox:** In-app image previewer with zoom, pan, and download capabilities.
- **Voice Notes:** Realtime audio recording HUD and waveform playback.

### 4. Voice & Video Calling
- **WebRTC Calling:** High-quality peer-to-peer 1-to-1 voice and video calls with signaling over Supabase Realtime / WebSocket.
- **In-Call Controls:** Seamless mute, camera toggle, screen sharing, and call status overlay.
- **Call History:** Comprehensive call logs for missed, answered, and outgoing calls.

### 5. Multi-Platform Support
- **Progressive Web App (PWA):** Installable web application with service worker push notifications and offline indicators.
- **Android Native (Capacitor 8):** Native Android wrapper with configured permissions for camera, microphone, notifications, and audio.

---

## Architecture Overview

```
src/
├── components/          # Reusable UI, dialogs, media renderers, and call overlays
│   ├── calls/           # WebRTC CallProvider and CallUI overlay
│   ├── chat/            # AttachmentRenderer, Lightbox, Vanish banner
│   ├── group/           # Group administration and member permissions
│   └── ui/              # Radix UI primitives and Tailwind styled components
├── hooks/               # Custom hooks (keyboard inset, network status, vanish mode)
├── integrations/        # Supabase client, auth middleware, and RPC attacher
├── lib/
│   ├── auth/            # Session management, dev bypass, and auth services
│   ├── domain/          # Core domain models, types, and custom errors
│   ├── e2ee/            # Signal Protocol adapter, prekey repo, and crypto stores
│   ├── infra/           # Neon PostgreSQL and Supabase repository drivers
│   ├── native/          # Capacitor NativeBridge utility
│   ├── push/            # Web Push notification dispatcher
│   ├── realtime/        # Realtime WebSocket channels and presence
│   ├── repositories/    # Ports and repository implementations (Postgres/Supabase)
│   └── services/        # Message, Conversation, Profile, and Pin domain services
├── routes/              # TanStack Start file-based routing
│   ├── __root.tsx       # Application root shell with offline indicator
│   ├── auth.tsx         # Clean authentication screen (Sign In & Sign Up)
│   ├── index.tsx        # Ghostline landing page
│   └── _authenticated/  # Protected routes (Chats, Profile, Contacts, Calls, Settings)
server/
└── routes/api/          # Nitro server endpoints (e.g., /api/health)
android/                 # Capacitor Android native project
public/                  # Static assets, Web App Manifest, and Service Worker
tests/
├── browser/             # E2EE browser smoke test specifications
└── unit/                # 32 comprehensive Vitest unit and integration suites
```

---

## Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation
```bash
git clone https://github.com/Bindu7729/communation-main-.git
cd communation-main-
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

Key environment variables:
- `VITE_SUPABASE_URL`: Your Supabase instance URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/publishable key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret (backend only).
- `DATA_REPOSITORY_DRIVER`: Database driver (`supabase` or `neon`).
- `DATABASE_URL`: Connection string for Neon PostgreSQL (when driver is `neon`).
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`: Web Push VAPID keys.
- `TURN_URL` & `TURN_SECRET`: WebRTC TURN server credentials.

### Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:8080/`.

---

## Verification & Testing

### Run Automated Tests
```bash
npm run test
```
Runs the complete Vitest test suite (32 test files, 337 tests).

### Type Checking
```bash
npx tsc --noEmit
```

### Code Formatting & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```
Compiles client bundles and server SSR functions via Vite and Nitro Cloudflare module.

---

## License
Private and Confidential. All rights reserved.
