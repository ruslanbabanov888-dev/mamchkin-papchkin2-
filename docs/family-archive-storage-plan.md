# Family archive: local storage implementation plan

Status: first implementation committed on `rustore/native-family-notes`; CI and real-device verification are pending. `@capacitor/preferences` 8.0.1 is wired to the notes module through a bundled adapter. Browser/PWA continues to use a localStorage fallback.

## Current state

- Current notes key: `mp2_family_notes_v2`, envelope schema version 1.
- Android uses Capacitor Preferences (`SharedPreferences`) as the primary store; web/PWA uses the localStorage adapter.
- The Android build bundles `src/notes-storage.js` into `www/notes-storage.js`; `prepare-web` first copies the browser fallback, then CI overwrites it with the native bundle.
- Startup reads native preferences first, then migrates from v2 localStorage or the legacy key. Native writes are read back and compared before they are treated as successful.
- Recovery source: legacy key `mp2_family_notes`; it is intentionally retained and never deleted by the current migration.
- Notes CRUD rolls back in-memory changes when persistence fails.
- Personal notes and future family media are not sent to Supabase.
- CI now exercises legacy migration, recovery-copy preservation, v2 precedence, simulated restart, invalid dates, and failed writes.

## Storage decision

### Short-term: native Preferences for small text records

The current notes are small key/value data, not yet a relational archive. Capacitor Preferences maps to Android SharedPreferences and provides a native persistence layer; its documentation explicitly says it is for lightweight data, not a database. Keep the web/PWA fallback on localStorage.

Implemented on the feature branch: the plugin is bundled into a small classic-script bridge, and notes initialization is asynchronous. The notes view shows a loading state until the native-first read/migration completes. Do not remove the fallback adapter or recovery keys until device testing passes.

### Later: SQLite + app-private files when the archive grows

When media attachments, searchable metadata, relationships, or larger collections are introduced:
- SQLite stores note metadata, timestamps, media references, and migration state.
- Binary photo/video/audio files live in app-private application storage, not in SQLite rows or localStorage.
- Store only relative file identifiers/paths and metadata in SQLite.
- Use an explicit user-initiated export/backup flow; do not silently upload personal archive data.

The currently investigated `@capacitor-community/sqlite@8.1.1` declares a Capacitor 8 peer dependency and therefore matches the project's Capacitor 8.6.2 line. However, it uses SQLCipher even for unencrypted databases. That adds build and encryption-export review considerations, so do not install it merely to store today's small text notes.

## Required migration protocol

1. Read native data first when the native adapter is available.
2. If native data is absent, read v2 localStorage; if absent/invalid, read the legacy key.
3. Normalize and validate every record using the existing date and field limits.
4. Write the complete normalized set to native storage.
5. Read it back and compare record count and canonical serialized content.
6. Only after successful read-back, mark the migration complete.
7. Keep both localStorage keys as recovery copies for multiple releases; never delete them as part of the first migration.
8. If native storage is unavailable or a write/read-back fails, keep the local fallback active and do not show a success message for a failed write.
9. Test update, delete, app restart, force-stop/relaunch, low-storage failure, upgrade from the old key, and reinstall behavior on a physical Android device.

## Implementation gates

- Add a bundled adapter and startup gate before changing the notes repository.
- Add deterministic unit tests for adapter selection and migration rollback.
- Verify the exact Capacitor plugin version against Capacitor 8.6.2 and build it in CI.
- Do not change game progress, cards, deck content, Supabase policies, or unrelated localStorage keys during this work.
- Do not claim real-device persistence until it has been tested on an Android device.


## Current implementation notes

- `@capacitor/preferences` is pinned to 8.0.1 for the project's Capacitor 8.6.2 line; npm metadata lists 8.0.1 as the stable v8 package and describes it as lightweight key/value storage. See the package and official API documentation before upgrading.
- `esbuild` is pinned to 0.28.2 and bundles the ESM plugin imports for the app's classic inline-script runtime.
- Native writes are verified by reading the exact serialized envelope back. On native failure, the app falls back to localStorage and displays a warning instead of silently claiming native persistence.
- The localStorage v2 and legacy keys remain as recovery copies. No user note is sent to Supabase.
- CI tests simulate native Preferences, migration, relaunch, precedence, invalid dates, and native failure fallback. They do not replace a physical Android force-stop/relaunch test.


CI note (2026-11-24): the first verification run correctly caught that the legacy-recovery comment and async-persistence assertion had not yet been updated alongside the implementation. Both checks were corrected on this branch; rerun the full workflow against the branch head before treating the adapter as build-verified.
