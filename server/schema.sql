-- StablePay KYB Database Schema
-- Run: psql -U stablepay -d stablepay_kyb -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- KYB Applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  risk_tier VARCHAR(10),
  form_data JSONB NOT NULL DEFAULT '{}',
  submission_meta JSONB,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uploaded documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  original_name VARCHAR(255),
  file_path VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  checksum_sha256 VARCHAR(64),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Document fraud analysis results
CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  composite_score INT,
  composite_level VARCHAR(20),
  integrity_data JSONB,
  exif_data JSONB,
  ela_data JSONB,
  ai_data JSONB,
  findings JSONB DEFAULT '[]',
  document_type_match BOOLEAN DEFAULT true,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Liveness verification
CREATE TABLE IF NOT EXISTS liveness_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  bo_index INT NOT NULL,
  challenge_count INT,
  captures JSONB,
  verified BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(30) DEFAULT 'reviewer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_type VARCHAR(20) NOT NULL,
  actor_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  detail JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Application notes
CREATE TABLE IF NOT EXISTS application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  author_id UUID REFERENCES admin_users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STR Reports
CREATE TABLE IF NOT EXISTS str_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reporter_name VARCHAR(255),
  reporter_designation VARCHAR(255),
  report_date DATE,
  transactions JSONB DEFAULT '[]',
  grounds TEXT,
  generated_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Applicant users (email OTP login for KYB applicants)
CREATE TABLE IF NOT EXISTS applicant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  company_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- OTP codes for email verification
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link applications to applicant users
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_id UUID REFERENCES applicant_users(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_ref ON applications(ref_code);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_users_email ON applicant_users(email);
CREATE INDEX IF NOT EXISTS idx_documents_app ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id);
