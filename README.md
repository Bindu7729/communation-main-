# 🛡️ Ghostline — Private & Secure Communication Platform

[![CI](https://github.com/Bindu7729/communation-main-/actions/workflows/ci.yml/badge.svg)](https://github.com/Bindu7729/communation-main-/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Vitest-426%20Passed-brightgreen)](https://github.com/Bindu7729/communation-main-)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Live Website URL:**  
> [https://communation-main.vercel.app/](https://communation-main.vercel.app/)

Ghostline is a high-performance, private messaging and calling application built for real connections.

---

## 🌐 Live Website & Deployment
- **Vercel Deployment URL:** [https://communation-main.vercel.app/](https://communation-main.vercel.app/)
- **GitHub Repository:** [https://github.com/Bindu7729/communation-main-](https://github.com/Bindu7729/communation-main-)

---

## 🏗️ System Architecture

Ghostline strictly separates identity authentication from application data and binary storage:

```
┌──────────────────────────────────────────────────────────┐
│                     Ghostline Client                     │
│        (Web PWA • Android Capacitor • Desktop Web)       │
└──────────────┬─────────────────────────────┬─────────────┘
               │ (JWT Auth Only)             │ (REST / Realtime / Calls)
               ▼                             ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│        Supabase Auth         │ │    Ghostline App Server      │
│   (Identity & Credentials)   │ │  (TanStack Start / Nitro)    │
└──────────────────────────────┘ └──────────────┬───────────────┘
                                                │ (Pooled Queries)
                                                ▼
                                 ┌──────────────────────────────┐
                                 │       Neon PostgreSQL        │
                                 │   (Single Source of Truth)   │
                                 │ Messages • Profiles • Media  │
                                 │ E2EE Relay • Calls • State   │
                                 └──────────────────────────────┘
```

- **Supabase:** Authentication and identity provider ONLY (JWT validation, sessions, OAuth).
- **Neon PostgreSQL:** Application source of truth for all structured data, conversations, contacts, reactions, and chunked binary media (`BYTEA`).
- **WebRTC:** Peer-to-peer end-to-end encrypted audio and video calling with DTLS-SRTP.
- **Signal Protocol (E2EE):** Zero-knowledge relay transport supporting pre-key bundles and double-ratchet envelopes.

---

## ✨ Key Features

- **Instant Realtime Messaging:** Low-latency message delivery, edit history, message deletion, forward/reply, pin/star, reactions, and seen/read receipts.
- **Rich Media & Attachments:** Fast photo/video compression, documents/files, voice notes with live waveforms, location sharing, contact sharing, camera capture, and animated GIFs/stickers.
- **P2P Audio & Video Calling:** Real-time WebRTC audio/video calls with incoming call overlays, mute/camera controls, and call history.
- **Private Vanish Mode:** Ephemeral disappearing conversations with countdown timers and automated client cleanup.
- **Multi-Device & Security:** Device registration, active session management, one-click remote device revocation, and brute-force protections.
- **Responsive Mobile UX:** Native bottom-sheet presentation on mobile, touch-manipulation optimizations (zero 300ms tap delay), safe-area insets, and keyboard-aware scroll stability.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Routing & SSR:** TanStack Router, TanStack Start (Nitro SSR).
- **Database & ORM:** Neon Serverless PostgreSQL (`postgres.js`).
- **Mobile Runtime:** Capacitor 7 (Android native permissions, push, camera, and audio).
- **Testing & QA:** Vitest (42 test suites, 426 tests passing).

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Data Repository Driver (Neon is the canonical production driver)
DATA_REPOSITORY_DRIVER="neon"

# Neon PostgreSQL Database URL
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"

# Supabase Auth Integration
VITE_SUPABASE_URL="https://[project-ref].supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="[anon-key]"

# WebRTC STUN/TURN Servers
VITE_STUN_SERVER_URL="stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
```

---

## 🧪 Testing

To run the complete test suite:

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npx vitest
```

**Test Coverage Highlights:**
- **42 test suites, 426 tests passing (100%)**
- Cryptographic double-ratchet & PQXDH identity ratification
- Group conversation role-based access control (RBAC) & member permissions
- WebRTC call state machine lifecycle & ICE candidate queueing
- Multi-device revocation isolation & token invalidation
- Ephemeral vanish mode broadcast protocol
- Postgres repository integration & write-freeze maintenance gates
