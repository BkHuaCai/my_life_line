# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A **local-first Android app** for recording life timeline events (time, photos, text). Built with uni-app (Vue 3), compiles to native Android APK. Data is stored locally in SQLite with no network dependency.

## Common Commands

All commands run from the `frontend/` directory:

```bash
cd frontend

# Install dependencies
npm install

# Run H5 development server (for debugging)
npm run dev:h5

# Build Android resources (outputs to dist/)
npm run build:app

# Run unit tests
npm test
```

**APK Building Note**: This repository produces Android resources only. To generate an APK, use HBuilderX on Windows:
1. File → Open directory → Select project root
2. Run → Run to phone/emulator (USB debugging enabled)
3. Release → Native App Cloud Build (requires DCloud account)

## Architecture

### Technology Stack
- **Frontend**: uni-app (Vue 3) → compiled to Android App
- **Storage**: SQLite via `plus.sqlite` API (native) or in-memory adapter (tests/H5)
- **Images**: App private directory via `plus.io`, stored as compressed + thumbnail

### Data Model
All entities use **UUID primary keys** for future sharing/community features:

```
Person (UUID) → Timeline (UUID) → Event (UUID)
                                      ├── EventImage (multiple per event)
                                      ├── date_point OR (date_start + date_end)
                                      ├── title, description
                                      └── cover_image_path
```

Key tables: `person`, `timeline`, `event`, `event_image`

### Code Structure
```
frontend/src/
├── pages/           # Page components (person-list, person-detail, timeline, event-detail, edit-form)
├── components/      # Timeline view components (timeline-axis, timeline-cards, timeline-grid)
├── utils/           # Core utilities
│   ├── db.js        # Data layer abstraction - all CRUD operations go through here
│   ├── storage.js   # Storage adapter (SQLite for app, in-memory for tests/H5)
│   ├── schema.js    # SQL table definitions
│   ├── date.js      # Date utilities
│   ├── image.js     # Image compression/management
│   ├── export.js    # Import/export logic
│   └── id.js        # UUID generation
└── tests/           # Vitest unit tests
```

### Key Design Patterns

1. **Storage Adapter Pattern**: `utils/storage.js` provides `createMemoryAdapter()` for tests/H5 and `createSqliteAdapter()` for the app. The `resolveAdapter()` function detects the environment automatically. This enables full offline functionality while keeping tests runnable without native APIs.

2. **Data Layer Isolation**: All database operations go through `db.js`. This was designed for future sync capabilities — adding cloud sync would only require modifying `db.js` internals, not the UI layer.

3. **UUID for Extensibility**: All entities use UUIDs instead of auto-increment IDs to prevent collisions when sharing timelines between users in future community features.

4. **Date Type Support**: Events can be either a single time point (`date_type = 'point'`) or a range with optional "ongoing" end date (`date_type = 'range'`, `date_end = null` means "present").