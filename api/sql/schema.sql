-- extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- enums

CREATE TYPE client_status AS ENUM (
  'active',
  'inactive',
  'suspended'
);

CREATE TYPE job_status AS ENUM (
  'pending','processing','completed','paused','blocked','failed'
);

CREATE TYPE chunk_status AS ENUM (
  'queued','sent','verifying','downloaded','failed','cooldown'
);

CREATE TYPE request_type AS ENUM ('xml','metadata');

CREATE TYPE outbox_status AS ENUM ('pending','sent','failed');

-- trigger function

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
