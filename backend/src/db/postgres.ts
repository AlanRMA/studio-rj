import pg from 'pg';
import { config } from '../config.js';
import type { IngestReceiptPayload } from '../schemas/receipt.js';
import { buildContentHash } from '../services/hash.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export interface ReceiptFilters {
  id?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export function isPostgresConfigured(): boolean {
  return Boolean(config.databaseUrl);
}

export function getPool(): pg.Pool | null {
  if (!config.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function checkPostgresConnection(): Promise<boolean> {
  const activePool = getPool();
  if (!activePool) return false;

  try {
    await activePool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function findExistingEvent(eventId: string): Promise<boolean> {
  const activePool = getPool();
  if (!activePool) return false;

  const result = await activePool.query(
    `SELECT 1 FROM ${config.receiptsTable} WHERE event_id = $1`,
    [eventId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function findRapidDuplicate(
  contentHash: string,
  eventAtIso: string,
  windowMs: number
): Promise<{ event_id: string; event_at: Date } | null> {
  const activePool = getPool();
  if (!activePool) return null;

  const cutoff = new Date(new Date(eventAtIso).getTime() - windowMs);
  const result = await activePool.query(
    `SELECT event_id, event_at
     FROM ${config.receiptsTable}
     WHERE responsavel = $1
       AND content_hash = $2
       AND event_at >= $3
     ORDER BY event_at DESC
     LIMIT 1`,
    [config.responsavel, contentHash, cutoff.toISOString()]
  );

  if (!result.rows.length) return null;
  return result.rows[0] as { event_id: string; event_at: Date };
}

export async function insertReceipt(payload: IngestReceiptPayload): Promise<void> {
  const activePool = getPool();
  if (!activePool) {
    throw new Error('Postgres não configurado');
  }

  const { receipt, export: exportMeta, event_id, event_at } = payload;
  const contentHash = buildContentHash(payload);
  const invoiceData = {
    id: receipt.id,
    invoiceNumber: receipt.invoice_number,
    clientName: receipt.client_name ?? '',
    service: receipt.service_type ?? '',
    issueDate: receipt.issue_date,
    companyName: receipt.company_name ?? '',
    deliveryFee: receipt.delivery_fee,
    adjustment: receipt.adjustment,
    items: receipt.lines.map((line) => ({
      id: line.line_id,
      ref: line.ref ?? '',
      description: line.descricao,
      quantity: line.quantity,
      unitPrice: line.unit_price,
      isRisk: line.is_risk,
      total: line.line_total,
    })),
  };

  await activePool.query(
    `INSERT INTO ${config.receiptsTable} (
      event_id, responsavel, receipt_id, invoice_number, client_name,
      service_type, issue_date, company_name,
      emitter_legal_name, emitter_document,
      delivery_fee, adjustment,
      subtotal, grand_total, item_count, export_format,
      lines, invoice_data, template_version, content_hash, event_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10,
      $11, $12,
      $13, $14, $15, $16,
      $17, $18, $19, $20, $21
    )
    ON CONFLICT (event_id) DO NOTHING`,
    [
      event_id,
      config.responsavel,
      receipt.id,
      receipt.invoice_number,
      receipt.client_name?.trim() || null,
      receipt.service_type ?? null,
      receipt.issue_date,
      receipt.company_name?.trim() || null,
      receipt.emitter.legal_name,
      receipt.emitter.document_number,
      receipt.delivery_fee,
      receipt.adjustment,
      receipt.totals.subtotal,
      receipt.totals.grand_total,
      receipt.totals.item_count,
      exportMeta.format,
      JSON.stringify(receipt.lines),
      JSON.stringify(invoiceData),
      1,
      contentHash,
      event_at,
    ]
  );
}

export async function listReceipts(filters: ReceiptFilters = {}): Promise<Record<string, unknown>[]> {
  const activePool = getPool();
  if (!activePool) throw new Error('Postgres não configurado');

  const values: unknown[] = [config.responsavel];
  const where = ['responsavel = $1'];

  if (filters.id) {
    values.push(filters.id);
    where.push(`(event_id = $${values.length} OR receipt_id = $${values.length} OR invoice_number = $${values.length})`);
  }

  if (filters.date) {
    values.push(filters.date);
    where.push(`issue_date = $${values.length}`);
  }

  values.push(Math.min(Math.max(filters.limit ?? 50, 1), 200));
  const limitParam = `$${values.length}`;
  values.push(Math.max(filters.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const result = await activePool.query(
    `SELECT event_id, receipt_id, invoice_number, responsavel, client_name, company_name,
            service_type, grand_total, issue_date, export_format, event_at, ingested_at
     FROM ${config.receiptsTable}
     WHERE ${where.join(' AND ')}
     ORDER BY ingested_at DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    values
  );
  return result.rows;
}

export async function getReceipt(id: string): Promise<Record<string, unknown> | null> {
  const activePool = getPool();
  if (!activePool) throw new Error('Postgres não configurado');

  const result = await activePool.query(
    `SELECT * FROM ${config.receiptsTable}
     WHERE responsavel = $2
       AND (event_id = $1 OR receipt_id = $1 OR invoice_number = $1)
     ORDER BY ingested_at DESC
     LIMIT 1`,
    [id, config.responsavel]
  );
  return result.rows[0] ?? null;
}

export async function updateReceiptClientName(
  eventId: string,
  clientName: string
): Promise<Record<string, unknown> | null> {
  const activePool = getPool();
  if (!activePool) throw new Error('Postgres não configurado');

  const result = await activePool.query(
    `UPDATE ${config.receiptsTable}
     SET client_name = $1
     WHERE event_id = $2 AND responsavel = $3
     RETURNING event_id, client_name, grand_total, issue_date`,
    [clientName, eventId, config.responsavel]
  );
  return result.rows[0] ?? null;
}

export async function deleteReceipt(eventId: string): Promise<boolean> {
  const activePool = getPool();
  if (!activePool) throw new Error('Postgres não configurado');

  const result = await activePool.query(
    `DELETE FROM ${config.receiptsTable} WHERE event_id = $1 AND responsavel = $2`,
    [eventId, config.responsavel]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
