-- =============================================================================
-- bot-schema.sql
-- WhatsApp Bot Tables Migration
-- =============================================================================
-- SAFE TO RUN MULTIPLE TIMES (fully idempotent).
-- Deploy with:
--   psql -U postgres -d ustaadpro_db -f bot-schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. bot_services
--    Stores WhatsApp bot service definitions (categories, options menu, etc.)
--    Source-of-truth: config/db.js + models/botService.js
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_services (
    id          SERIAL PRIMARY KEY,
    category    VARCHAR(100)    NOT NULL,
    name        VARCHAR(200)    NOT NULL,
    msg         TEXT            NOT NULL,
    options     JSONB           NOT NULL DEFAULT '[]'::jsonb,
    active      BOOLEAN         NOT NULL DEFAULT true,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index: fast lookup by category (used in findByCategory + getCategories)
CREATE INDEX IF NOT EXISTS idx_bot_services_category
    ON bot_services (category);

-- Index: fast filter for active services
CREATE INDEX IF NOT EXISTS idx_bot_services_active
    ON bot_services (active);

-- ---------------------------------------------------------------------------
-- 2. bot_bookings
--    Stores bookings created by users through the WhatsApp bot flow.
--    Source-of-truth: config/db.js + models/botBooking.js
--
--    NOTE: customer_phone was present in botBooking.js SELECT/INSERT
--    but missing from the original config/db.js CREATE TABLE.
--    It is included here as the correct authoritative definition.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_bookings (
    id              SERIAL          PRIMARY KEY,
    user_id         VARCHAR(50)     NOT NULL,           -- WhatsApp JID (e.g. 923001234567@c.us)
    main_category   VARCHAR(100),
    service_type    VARCHAR(200),
    sub_service     TEXT,
    date            VARCHAR(50),
    time            VARCHAR(50),
    customer_phone  VARCHAR(50),                        -- extracted phone number
    address         TEXT,
    address_type    VARCHAR(20),                        -- 'text' or 'map'
    has_image       VARCHAR(50)     DEFAULT 'No Picture',
    image_data      BYTEA,                              -- optional photo of issue
    image_mime      VARCHAR(50),
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',  -- pending|confirmed|completed|cancelled
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index: fast lookup by user (WhatsApp JID)
CREATE INDEX IF NOT EXISTS idx_bot_bookings_user_id
    ON bot_bookings (user_id);

-- Index: fast filter by status (admin dashboard filters)
CREATE INDEX IF NOT EXISTS idx_bot_bookings_status
    ON bot_bookings (status);

-- Index: fast time-based sorting / today's count query
CREATE INDEX IF NOT EXISTS idx_bot_bookings_created_at
    ON bot_bookings (created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. bot_sessions
--    Tracks per-user conversation state for the WhatsApp bot flow.
--    Source-of-truth: config/db.js + models/botSession.js
--
--    UNIQUE constraint on user_id enables the ON CONFLICT upsert pattern
--    used in Session.upsert().
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bot_sessions (
    id                      SERIAL          PRIMARY KEY,
    user_id                 VARCHAR(50)     NOT NULL UNIQUE,  -- WhatsApp JID
    step                    VARCHAR(50)     NOT NULL DEFAULT 'SELECT_CATEGORY',
    order_details           JSONB           NOT NULL DEFAULT '{}'::jsonb,
    current_service_key     VARCHAR(10),
    current_service_type    VARCHAR(100),
    change_date_temp        VARCHAR(50),
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index: fast lookup by user (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_bot_sessions_user_id
    ON bot_sessions (user_id);

-- Index: sort by most recently active session (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_bot_sessions_updated_at
    ON bot_sessions (updated_at DESC);

-- =============================================================================
-- Verify (optional — comment out if running non-interactively)
-- =============================================================================
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c
     WHERE c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_name IN ('bot_services', 'bot_bookings', 'bot_sessions')
  AND table_schema = 'public'
ORDER BY table_name;
