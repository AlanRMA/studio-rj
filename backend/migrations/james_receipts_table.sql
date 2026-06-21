CREATE SCHEMA IF NOT EXISTS {{SCHEMA}};

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.james_receipts (
  event_id              TEXT PRIMARY KEY,
  responsavel           TEXT NOT NULL DEFAULT 'James',
  receipt_id            TEXT NOT NULL,
  invoice_number        TEXT NOT NULL,
  client_name           TEXT,
  service_type          TEXT,
  issue_date            DATE NOT NULL,
  company_name          TEXT,
  emitter_legal_name    TEXT NOT NULL DEFAULT 'James Mendes da Silva',
  emitter_document      TEXT NOT NULL DEFAULT '622.388.163-15',
  delivery_fee          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  adjustment            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal              NUMERIC(12, 2) NOT NULL,
  grand_total           NUMERIC(12, 2) NOT NULL,
  item_count            INT NOT NULL,
  export_format         TEXT CHECK (export_format IN ('jpeg', 'pdf')),
  lines                 JSONB NOT NULL,
  content_hash          TEXT NOT NULL,
  event_at              TIMESTAMPTZ NOT NULL,
  ingested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{{SCHEMA}}_james_receipts_responsavel
  ON {{SCHEMA}}.james_receipts (responsavel);

CREATE INDEX IF NOT EXISTS idx_{{SCHEMA}}_james_receipts_issue_date
  ON {{SCHEMA}}.james_receipts (issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_{{SCHEMA}}_james_receipts_client
  ON {{SCHEMA}}.james_receipts (client_name);

CREATE INDEX IF NOT EXISTS idx_{{SCHEMA}}_james_receipts_receipt_id
  ON {{SCHEMA}}.james_receipts (receipt_id);

CREATE INDEX IF NOT EXISTS idx_{{SCHEMA}}_james_receipts_content_hash
  ON {{SCHEMA}}.james_receipts (responsavel, content_hash, event_at DESC);