# Supabase shared application content

The `public.app_content` table stores **public, non-personal application content only**.

## Contract

- Primary key: `(content_key, version)`.
- `payload` is a JSON object; its internal `schema_version` defines the payload shape.
- Clients may only read rows where `published = true` and `published_at` is null or in the past.
- The app uses the Supabase publishable key. Never put a service-role or secret key in the client.
- Client roles have SELECT only. Publishing and editing content are administrative operations.
- Family notes, photos, videos, audio, letters, local identifiers, and game progress must never be stored here.

## Current content

| Key | Version | Payload | State |
| --- | ---: | --- | --- |
| `game.base` | 1 | Main release: 30 challenges, 20 care cards, 20 rewards | Published |

The Android app validates the payload shape before replacing its bundled fallback data. If the request fails or the payload is invalid, the bundled cards remain active.

## Publishing a new version

1. Add a new immutable version row; do not overwrite a published version.
2. Keep the existing payload schema compatible, or increment `schema_version` and add client support first.
3. Verify card counts, identifiers, and required fields.
4. Publish the new row only after the client can read it.
5. Keep the previous version available for rollback.

Database changes are tracked in `supabase/migrations/`. Migration filenames match the versions recorded in the connected Supabase project.
