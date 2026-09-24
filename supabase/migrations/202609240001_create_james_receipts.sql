CREATE TABLE IF NOT EXISTS public.james_receipts (
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
  export_format         TEXT NOT NULL CHECK (export_format IN ('jpeg', 'pdf')),
  lines                 JSONB NOT NULL,
  invoice_data          JSONB NOT NULL,
  template_version      INT NOT NULL DEFAULT 1,
  event_at              TIMESTAMPTZ NOT NULL,
  ingested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_james_receipts_issue_date
  ON public.james_receipts (issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_james_receipts_receipt_id
  ON public.james_receipts (receipt_id);
CREATE INDEX IF NOT EXISTS idx_james_receipts_invoice_number
  ON public.james_receipts (invoice_number);
CREATE INDEX IF NOT EXISTS idx_james_receipts_ingested_at
  ON public.james_receipts (ingested_at DESC);

ALTER TABLE public.james_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.james_receipts FROM anon, authenticated;
GRANT ALL ON TABLE public.james_receipts TO service_role;
