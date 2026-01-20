🐱 Neko Drive: Technical Specification & Implementation Guide
Project Status: Development (Local-First Phase) Logic Model: Distributed Zero-Knowledge Object Storage

---

1. System Overview & Stack
   Neko Drive is a professional-grade personal cloud that uses Discord as a raw object store. It prioritizes zero-latency (Local DB) and zero-knowledge (Client-Side Encryption).

The "BHVR" Stack

• Runtime: Bun (Native SQLite, Fast I/O)

• Backend: Hono (Standard Web APIs, Proxy Streaming)

• Frontend: React + Vite (UI)

• Security: Web Workers (AES-GCM-256)

• Database: Bun:SQLite (WAL Mode)

---

2. Directory Structure (Clean Feature-Based)

```

neko-drive/

├── package.json          # Root scripts (concurrently "dev")

├── server/               # Proxy & Librarian Layer

│   ├── src/

│   │   ├── db/           # SQLite initialization & CRUD logic

│   │   ├── routes/       # API Handlers (REST)

│   │   ├── lib/          # Discord CDN & Backup Utilities

│   │   └── index.ts      # Hono Entry Point

│   └── .env              # DISCORD_TOKEN, API_SECRET

└── client/               # Encryption & Interface Layer

    ├── src/

    │   ├── engine/       # crypto.worker.ts (Background CPU tasks)

    │   ├── api/          # TanStack Query & Fetch wrappers

    │   ├── components/   # Shadcn UI & Dashboard Layouts

    │   ├── hooks/        # Worker & Auth Bridges

    │   └── types/        # TypeScript interfaces (Synced with Server)

```

---

3. Data Schema (SQLite)

```

-- Metadata Table

CREATE TABLE files (

  id TEXT PRIMARY KEY,

  name TEXT NOT NULL,         -- Supports Emojis

  size INTEGER NOT NULL,      -- Total bytes

  type TEXT,                  -- MIME (video/mp4, etc)

  iv TEXT NOT NULL,           -- Hex: Unique per file

  salt TEXT NOT NULL,         -- Hex: PBKDF2 salt

  status TEXT DEFAULT 'pending',

  created_at INTEGER DEFAULT (strftime('%s', 'now'))

);

-- Chunk Mapping

CREATE TABLE chunks (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  file_id TEXT NOT NULL,

  idx INTEGER NOT NULL,       -- Sequence: 0, 1, 2...

  message_id TEXT NOT NULL,   -- Discord Message Pointer

  channel_id TEXT NOT NULL,   -- Discord Channel ID

  size INTEGER NOT NULL,

  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE

);

```

---

4. The "Smart Pipe" Logic (Backend Handlers)
   The backend never writes file content to disk. It acts as a memory-efficient stream proxy.

A. Upload Handler (`POST /api/file/:id/chunk/:index`)

1. Receive: Accepts `ArrayBuffer` from Client.

2. Transform: Wraps buffer in `FormData` (Multipart).

3. Pipe: Forwards `FormData` to Discord API.

4. Record: Saves Discord `message_id` to SQLite `chunks` table.

B. Download Handler (`GET /api/file/:id/chunk/:index`)

1. Lookup: Retrieves `message_id` from SQLite.

2. Refresh: Fetches a fresh JIT (Just-In-Time) CDN URL from Discord API.

3. Stream: Uses `stream.pipe()` to send binary data to client.

4. Header: Injects `Content-Disposition: attachment; filename*=UTF-8''...` for Emoji support.

---

5. The "Crypto Pipeline" Logic (Frontend Worker)
   All CPU-heavy math is offloaded to a background thread.

A. Encryption Flow (Upload)

1. Key Derivation: `PBKDF2(Password, Salt)` -> `AES-GCM-256 Key`.

2. Slicing: `File.slice(0, 8MB)`.

3. Encryption: `SubtleCrypto.encrypt(iv + index, Key, Buffer)`.

4. Transmission: Worker directly calls `fetch()` to Server API.

B. Decryption Flow (Playback/Download)

1. Fetch: Worker fetches encrypted chunks from Server Proxy.

2. Decryption: `SubtleCrypto.decrypt()`.

3. Assembly: Combines chunks into a `Blob` or `MediaSource` for the UI.

---

6. Security & Disaster Recovery
   The Two-Key Rule

• `API_SECRET`: Stored in `.env`. Authorizes communication between Client and Server.

• `User Password`: Stored in RAM ONLY. Used for local decryption. Server is content-blind.

Auto-Backup Protocol

1. After every successful upload (`finalize`), the server triggers a background task.

2. It runs `VACUUM` on `neko.db` to compress metadata.

3. It uploads the entire `.db` file as an attachment to a private #backups Discord channel.

4. Recovery: Download the latest `.db` -> Place in `server/` -> System Restored.

---

7. Implementation Commands

```

# Start the entire engine (Root folder)

"dev": "concurrently \"cd server && bun run dev\" \"cd client && bun run dev\""

# Install all dependencies

"install-all": "cd server && bun install && cd ../client && bun install"

```
