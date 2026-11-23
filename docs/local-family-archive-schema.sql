-- Мамчкин и Папчкин — локальная схема SQLite (семейный архив)
-- ПРОЕКТНЫЙ ДОКУМЕНТ. Ничего не выполнялось, ни одна миграция не применена.
-- Не содержит ничего, что уходит на сервер: вся схема живёт только на устройстве.
-- Игровой прогресс (ключи mp2_*, mp2_mem, mp2_wait, mp2snd в localStorage) в эту схему
-- НЕ переносится и НЕ смешивается — он остаётся отдельным механизмом (см. финальный документ, раздел 2).

PRAGMA foreign_keys = ON;

-- ───────────────────────────── app_settings ─────────────────────────────
-- Единственная "служебная" таблица: локальные настройки архива, включая
-- local_owner_id (локальный псевдо-владелец, НЕ отправляется на сервер)
-- и URI папки для автобэкапа, если пользователь её выбрал.
CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Примеры строк:
-- ('local_owner_id', '7e3f1a2c-9b4d-4e11-8a2f-0c1d9e7b5a33')
-- ('backup_folder_uri', 'content://com.android.externalstorage.documents/tree/primary%3AMamchkinPapchkin')
-- ('backup_folder_kind', 'saf_local')        -- см. раздел 1 финального документа: saf_local | saf_cloud_suspected | none
-- ('last_backup_at', '2026-11-22T08:00:00Z')

-- ───────────────────────────── templates ─────────────────────────────
-- Локальный кэш шаблонов, полученных из Supabase (общий, не персональный контент).
CREATE TABLE templates (
    id            TEXT PRIMARY KEY,       -- template_id, присвоенный в Supabase
    name          TEXT NOT NULL,
    version       INTEGER NOT NULL,       -- версия СХЕМЫ шаблона (не путать с версией приложения)
    schema_json   TEXT NOT NULL,          -- JSON: допустимые типы блоков, порядок, оформление
    downloaded_at TEXT NOT NULL,
    assets_ready  INTEGER NOT NULL DEFAULT 0   -- 1 = картинки/шрифты шаблона скачаны и закэшированы локально
);

-- ───────────────────────────── family_pages ─────────────────────────────
-- Страницы Книги памяти.
CREATE TABLE family_pages (
    id               TEXT PRIMARY KEY,       -- UUID, генерируется на устройстве
    local_owner_id   TEXT NOT NULL,
    template_id      TEXT NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    template_version INTEGER NOT NULL,       -- версия шаблона НА МОМЕНТ создания страницы — не меняется при обновлении templates.version
    title            TEXT,
    event_date       TEXT,                   -- дата самого события ("первые шаги" — 2026-03-01), НЕ дата создания записи
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active',   -- active | trashed | purged
    trashed_at       TEXT,                   -- когда помечена удалённой (мягко)
    purge_after      TEXT                    -- дата, после которой можно физически стереть медиафайлы (см. раздел 1)
);
CREATE INDEX idx_family_pages_owner ON family_pages(local_owner_id, status, event_date);

-- ───────────────────────────── future_letters ─────────────────────────────
-- Письма в будущее.
CREATE TABLE future_letters (
    id             TEXT PRIMARY KEY,
    local_owner_id TEXT NOT NULL,
    title          TEXT,
    text_content   TEXT,
    open_basis     TEXT NOT NULL,           -- 'fixed_date' | 'child_age'
    open_at        TEXT NOT NULL,           -- ВСЕГДА конкретная дата — для child_age конвертируется один раз при сохранении
    status         TEXT NOT NULL DEFAULT 'locked',   -- locked | opened | trashed | purged
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    opened_at      TEXT,
    trashed_at     TEXT,
    purge_after    TEXT
);
CREATE INDEX idx_future_letters_owner ON future_letters(local_owner_id, status, open_at);

-- ───────────────────────────── parent_notes ─────────────────────────────
-- Записки родителей (с календарём/хронологией).
CREATE TABLE parent_notes (
    id             TEXT PRIMARY KEY,
    local_owner_id TEXT NOT NULL,
    text_content   TEXT NOT NULL,
    note_date      TEXT NOT NULL,           -- дата, под которой заметка видна в календаре (может отличаться от created_at)
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'active',
    trashed_at     TEXT,
    purge_after    TEXT
);
CREATE INDEX idx_parent_notes_owner ON parent_notes(local_owner_id, status, note_date);

-- ───────────────────────────── content_blocks ─────────────────────────────
-- Единая таблица вложений/блоков для family_pages И future_letters (полиморфная связь).
-- Решение объединить, а не дублировать: fото/видео/аудио/текст нужны и странице,
-- и письму с одинаковыми правилами (несколько вложений, порядок, статус доступности,
-- мягкое удаление) — отдельная таблица на каждый тип владельца продублировала бы
-- всю логику health-check и ZIP-экспорта. Плата за это: SQLite не может объявить
-- внешний ключ, который указывает то на family_pages, то на future_letters —
-- целостность owner_id проверяется кодом приложения, а не схемой БД. Это явный
-- компромисс, а не недосмотр (см. открытые вопросы финального документа).
CREATE TABLE content_blocks (
    id              TEXT PRIMARY KEY,
    owner_type      TEXT NOT NULL CHECK (owner_type IN ('family_page', 'future_letter')),
    owner_id        TEXT NOT NULL,          -- id строки в family_pages ИЛИ future_letters, по owner_type
    block_type      TEXT NOT NULL CHECK (block_type IN ('photo', 'video', 'audio', 'text')),
    position        INTEGER NOT NULL,       -- порядок на странице/в письме, можно менять (условие 6 ТЗ)
    text_content    TEXT,                   -- для block_type = 'text'; NULL для media-блоков
    media_path      TEXT,                   -- относительный путь в приватном хранилище приложения; NULL для 'text'
    media_mime      TEXT,                   -- например, 'image/jpeg', 'video/mp4', 'audio/m4a'
    media_size_bytes INTEGER,
    media_added_at  TEXT,                   -- когда файл физически скопирован/записан (условие 3 ТЗ)
    media_status    TEXT NOT NULL DEFAULT 'ok' CHECK (media_status IN ('ok', 'missing', 'checking')),
    media_checked_at TEXT,                  -- когда MediaHealthService последний раз проверял доступность
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX idx_content_blocks_owner ON content_blocks(owner_type, owner_id, position);
CREATE INDEX idx_content_blocks_health ON content_blocks(media_status) WHERE block_type != 'text';

-- ───────────────────────────── Примеры записей ─────────────────────────────
-- Страница "Первые шаги" с двумя фото, одним видео и текстом:
--
-- INSERT INTO family_pages VALUES (
--   'pg_7a1', 'owner_1', 'tpl_first_steps', 2, 'Первые шаги',
--   '2026-03-01', '2026-03-02T10:00:00Z', '2026-03-02T10:00:00Z', 'active', NULL, NULL);
--
-- INSERT INTO content_blocks VALUES
--   ('cb_1', 'family_page', 'pg_7a1', 'text',  0, 'Сегодня Миша сделал первые шаги!', NULL, NULL, NULL, NULL, 'ok', NULL, '2026-03-02T10:00:00Z', '2026-03-02T10:00:00Z'),
--   ('cb_2', 'family_page', 'pg_7a1', 'photo', 1, NULL, 'media/pg_7a1/photo_1.jpg', 'image/jpeg', 2411200, '2026-03-02T10:01:00Z', 'ok', '2026-11-22T08:00:00Z', '2026-03-02T10:01:00Z', '2026-03-02T10:01:00Z'),
--   ('cb_3', 'family_page', 'pg_7a1', 'photo', 2, NULL, 'media/pg_7a1/photo_2.jpg', 'image/jpeg', 1987300, '2026-03-02T10:01:30Z', 'ok', '2026-11-22T08:00:00Z', '2026-03-02T10:01:30Z', '2026-03-02T10:01:30Z'),
--   ('cb_4', 'family_page', 'pg_7a1', 'video', 3, NULL, 'media/pg_7a1/video_1.mp4', 'video/mp4', 18340000, '2026-03-02T10:02:00Z', 'ok', '2026-11-22T08:00:00Z', '2026-03-02T10:02:00Z', '2026-03-02T10:02:00Z');
--
-- Письмо в будущее с аудио, открывается в 18 лет (конвертировано в фикс. дату при сохранении):
--
-- INSERT INTO future_letters VALUES (
--   'ltr_3', 'owner_1', 'Письмо к совершеннолетию', 'Сынок, когда ты это услышишь...',
--   'child_age', '2044-03-01T00:00:00Z', 'locked', '2026-03-05T09:00:00Z', '2026-03-05T09:00:00Z', NULL, NULL, NULL);
--
-- INSERT INTO content_blocks VALUES
--   ('cb_9', 'future_letter', 'ltr_3', 'audio', 0, NULL, 'media/ltr_3/voice_1.m4a', 'audio/m4a', 980000, '2026-03-05T09:05:00Z', 'ok', NULL, '2026-03-05T09:05:00Z', '2026-03-05T09:05:00Z');
