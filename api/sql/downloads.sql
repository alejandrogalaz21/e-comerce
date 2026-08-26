-- DOWNLOAD JOBS

CREATE TABLE download_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  client_id UUID NOT NULL
    REFERENCES clients(id) ON DELETE CASCADE,

  request_type request_type NOT NULL,

  date_start DATE NOT NULL,
  date_end DATE NOT NULL,

  status job_status DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CHECK (date_end >= date_start)
);

CREATE INDEX idx_jobs_client ON download_jobs(client_id);
CREATE INDEX idx_jobs_status ON download_jobs(status);

CREATE TRIGGER trg_download_jobs
BEFORE UPDATE ON download_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- DOWNLOAD CHUNKS

CREATE TABLE download_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  job_id UUID NOT NULL
    REFERENCES download_jobs(id) ON DELETE CASCADE,

  chunk_start TIMESTAMP NOT NULL,
  chunk_end TIMESTAMP NOT NULL,

  status chunk_status DEFAULT 'queued',

  attempts INT DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CHECK (chunk_end >= chunk_start)
);

CREATE UNIQUE INDEX unique_chunk_range
ON download_chunks(job_id, chunk_start, chunk_end);

CREATE INDEX idx_chunks_status ON download_chunks(status);
CREATE INDEX idx_chunks_job ON download_chunks(job_id);

CREATE TRIGGER trg_download_chunks
BEFORE UPDATE ON download_chunks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- SAT REQUESTS

CREATE TABLE sat_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  chunk_id UUID NOT NULL
    REFERENCES download_chunks(id) ON DELETE CASCADE,

  sat_request_uuid VARCHAR(100),

  status_code VARCHAR(10),
  sat_message TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sat_chunk ON sat_requests(chunk_id);

CREATE TRIGGER trg_sat_requests
BEFORE UPDATE ON sat_requests
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- RFC SCHEDULER

CREATE TABLE rfc_scheduler_state (
  client_id UUID PRIMARY KEY
    REFERENCES clients(id) ON DELETE CASCADE,

  locked_until TIMESTAMP,
  last_request_at TIMESTAMP,

  cooldown_reason TEXT,
  consecutive_failures INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_scheduler
BEFORE UPDATE ON rfc_scheduler_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- OUTBOX EVENTS

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  aggregate_type VARCHAR(50),
  aggregate_id UUID,

  event_type VARCHAR(100),

  payload JSONB,

  status outbox_status DEFAULT 'pending',

  retry_count INT DEFAULT 0,
  last_error TEXT,

  available_at TIMESTAMP DEFAULT now(),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_outbox_pending
ON outbox_events(status, available_at);

CREATE TRIGGER trg_outbox
BEFORE UPDATE ON outbox_events
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
