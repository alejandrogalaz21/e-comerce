-- CLIENTS

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  rfc VARCHAR(13) UNIQUE NOT NULL,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
	second_last_name TEXT,

  phone VARCHAR(20),
  legal_name TEXT NOT NULL,

  status client_status DEFAULT 'active',

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_clients
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- CREDENTIALS

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  client_id UUID UNIQUE NOT NULL
    REFERENCES clients(id) ON DELETE CASCADE,

  cer_s3_path TEXT NOT NULL,
  key_s3_path TEXT NOT NULL,

  encrypted_password BYTEA NOT NULL,
  encryption_iv BYTEA NOT NULL,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_credentials
BEFORE UPDATE ON credentials
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- TAX PROFILES

CREATE TABLE tax_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  client_id UUID NOT NULL
    REFERENCES clients(id) ON DELETE CASCADE,

  rfc VARCHAR(13) NOT NULL,

  commercial_name TEXT,
  status VARCHAR(20),
  start_operations DATE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_tax_profiles_client
ON tax_profiles(client_id);

CREATE TRIGGER trg_tax_profiles
BEFORE UPDATE ON tax_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- TAX ADDRESSES

CREATE TABLE tax_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tax_profile_id UUID NOT NULL
    REFERENCES tax_profiles(id) ON DELETE CASCADE,

  postal_code VARCHAR(10) NOT NULL,

  street_name TEXT,
  neighborhood TEXT,

  exterior_number TEXT,
  interior_number TEXT,

  city TEXT,
  state TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_tax_addresses_profile
ON tax_addresses(tax_profile_id);

CREATE TRIGGER trg_tax_addresses
BEFORE UPDATE ON tax_addresses
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- TAX REGIMES

CREATE TABLE tax_regimes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tax_profile_id UUID NOT NULL
    REFERENCES tax_profiles(id) ON DELETE CASCADE,

  regime_name TEXT,
  start_date DATE,
  end_date DATE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER trg_tax_regimes
BEFORE UPDATE ON tax_regimes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- TAX ACTIVITIES

CREATE TABLE tax_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tax_profile_id UUID NOT NULL
    REFERENCES tax_profiles(id) ON DELETE CASCADE,

  activity TEXT,
  percentage INT CHECK (percentage BETWEEN 0 AND 100),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_tax_activities
BEFORE UPDATE ON tax_activities
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- TAX OBLIGATIONS

CREATE TABLE tax_obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tax_profile_id UUID NOT NULL
    REFERENCES tax_profiles(id) ON DELETE CASCADE,

  obligation TEXT,
  description TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TRIGGER trg_tax_obligations
BEFORE UPDATE ON tax_obligations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
