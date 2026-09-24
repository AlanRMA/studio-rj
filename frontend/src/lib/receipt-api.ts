import { EMITTER_DATA, STORAGE_KEYS } from '@/lib/constants';
import type { Invoice, SaveFormat } from '@/lib/types';
import { generateId } from '@/lib/utils';

export interface RemoteReceiptSummary {
  event_id: string;
  receipt_id: string;
  invoice_number: string;
  client_name: string | null;
  company_name: string | null;
  service_type: string | null;
  grand_total: string | number;
  issue_date: string;
  export_format: SaveFormat;
  event_at: string;
  ingested_at: string;
}

interface RemoteReceiptDetail extends RemoteReceiptSummary {
  delivery_fee: string | number;
  adjustment: string | number;
  lines: Array<{
    line_id: string;
    ref?: string;
    descricao: string;
    quantity: number;
    unit_price: number;
    is_risk: boolean;
    line_total: number;
  }>;
  invoice_data?: Invoice | null;
}

export interface ReceiptSearchFilters {
  id?: string;
  date?: string;
  limit?: number;
}

interface ReceiptApiConfig {
  url: string;
  apiKey: string;
}

interface ReceiptPayload {
  source_system: 'studio-rm-james';
  event_type: 'receipt.saved';
  event_id: string;
  event_at: string;
  export: {
    id: string;
    format: SaveFormat;
    file_mime_type: string;
  };
  receipt: {
    id: string;
    invoice_number: string;
    client_name: string | null;
    service_type: string;
    issue_date: string;
    company_name: string | null;
    emitter: {
      document_type: 'cpf';
      legal_name: string;
      document_number: string;
    };
    delivery_fee: number;
    adjustment: number;
    lines: Array<{
      line_id: string;
      line_order: number;
      ref?: string;
      descricao: string;
      quantity: number;
      unit_price: number;
      is_risk: boolean;
      line_total: number;
    }>;
    totals: {
      subtotal: number;
      delivery_fee: number;
      adjustment: number;
      grand_total: number;
      item_count: number;
    };
  };
}

function readStoredString(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as string) : '';
  } catch {
    return '';
  }
}

function getApiConfig(): ReceiptApiConfig | null {
  const url = readStoredString(STORAGE_KEYS.backendUrl).trim().replace(/\/$/, '');
  const apiKey = readStoredString(STORAGE_KEYS.backendApiKey).trim();
  return url && apiKey ? { url, apiKey } : null;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  configOverride?: ReceiptApiConfig
): Promise<T> {
  const config = configOverride ?? getApiConfig();
  if (!config) {
    throw new Error('Configure a URL e a chave do servidor em Configurações.');
  }

  const response = await fetch(`${config.url}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `O servidor respondeu com erro ${response.status}.`);
  }
  return body;
}

function buildReceiptPayload(invoice: Invoice, eventId: string, format: SaveFormat): ReceiptPayload {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal + invoice.deliveryFee + invoice.adjustment;

  return {
    source_system: 'studio-rm-james',
    event_type: 'receipt.saved',
    event_id: eventId,
    event_at: new Date().toISOString(),
    export: {
      id: eventId,
      format,
      file_mime_type: format === 'pdf' ? 'application/pdf' : 'image/jpeg',
    },
    receipt: {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      client_name: invoice.clientName || null,
      service_type: invoice.service ?? '',
      issue_date: invoice.issueDate,
      company_name: invoice.companyName || null,
      emitter: {
        document_type: 'cpf',
        legal_name: EMITTER_DATA.name,
        document_number: EMITTER_DATA.document,
      },
      delivery_fee: invoice.deliveryFee,
      adjustment: invoice.adjustment,
      lines: invoice.items.map((item, index) => ({
        line_id: item.id,
        line_order: index + 1,
        ref: item.ref,
        descricao: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        is_risk: item.isRisk,
        line_total: item.total,
      })),
      totals: {
        subtotal,
        delivery_fee: invoice.deliveryFee,
        adjustment: invoice.adjustment,
        grand_total: grandTotal,
        item_count: invoice.items.length,
      },
    },
  };
}

function readPendingPayloads(): ReceiptPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.pendingReceiptSync);
    return value ? (JSON.parse(value) as ReceiptPayload[]) : [];
  } catch {
    return [];
  }
}

function writePendingPayloads(payloads: ReceiptPayload[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.pendingReceiptSync, JSON.stringify(payloads));
}

function queuePayload(payload: ReceiptPayload): void {
  const pending = readPendingPayloads();
  if (!pending.some((item) => item.event_id === payload.event_id)) {
    writePendingPayloads([...pending, payload]);
  }
}

async function sendPayload(payload: ReceiptPayload): Promise<'saved' | 'server-queued'> {
  const response = await apiFetch<{ queued?: boolean }>('/api/v1/ingest/james/receipt', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': payload.event_id },
    body: JSON.stringify(payload),
  });
  return response.queued ? 'server-queued' : 'saved';
}

export async function saveReceiptRecord(
  invoice: Invoice,
  eventId: string,
  format: SaveFormat
): Promise<'saved' | 'queued' | 'disabled'> {
  if (!getApiConfig()) return 'disabled';

  const payload = buildReceiptPayload(invoice, eventId, format);
  try {
    const result = await sendPayload(payload);
    if (result === 'server-queued') {
      queuePayload(payload);
      return 'queued';
    }
    return 'saved';
  } catch {
    queuePayload(payload);
    return 'queued';
  }
}

export async function flushPendingReceiptRecords(): Promise<number> {
  if (!getApiConfig()) return 0;
  const pending = readPendingPayloads();
  if (pending.length === 0) return 0;

  const remaining: ReceiptPayload[] = [];
  let synced = 0;
  for (const payload of pending) {
    try {
      const result = await sendPayload(payload);
      if (result === 'saved') {
        synced += 1;
      } else {
        remaining.push(payload);
      }
    } catch {
      remaining.push(payload);
    }
  }
  writePendingPayloads(remaining);
  return synced;
}

export function getPendingReceiptCount(): number {
  return readPendingPayloads().length;
}

export async function testReceiptApi(url: string, apiKey: string): Promise<boolean> {
  const response = await apiFetch<{ ok: boolean }>(
    '/api/v1/ingest/auth-check',
    undefined,
    { url: url.trim().replace(/\/$/, ''), apiKey: apiKey.trim() }
  );
  return response.ok;
}

export async function searchReceiptRecords(
  filters: ReceiptSearchFilters
): Promise<RemoteReceiptSummary[]> {
  const params = new URLSearchParams();
  if (filters.id?.trim()) params.set('id', filters.id.trim());
  if (filters.date) params.set('date', filters.date);
  params.set('limit', String(filters.limit ?? 100));

  const response = await apiFetch<{ receipts: RemoteReceiptSummary[] }>(
    `/api/v1/ingest/james/receipts?${params.toString()}`
  );
  return response.receipts;
}

export async function getReceiptRecord(id: string): Promise<Invoice> {
  const response = await apiFetch<{ receipt: RemoteReceiptDetail }>(
    `/api/v1/ingest/james/receipts/${encodeURIComponent(id)}`
  );
  const record = response.receipt;

  if (record.invoice_data) {
    return structuredClone(record.invoice_data);
  }

  return {
    id: record.receipt_id || generateId(),
    invoiceNumber: record.invoice_number,
    clientName: record.client_name ?? '',
    service: record.service_type ?? '',
    issueDate: String(record.issue_date).slice(0, 10),
    companyName: record.company_name ?? '',
    deliveryFee: Number(record.delivery_fee ?? 0),
    adjustment: Number(record.adjustment ?? 0),
    items: record.lines.map((line) => ({
      id: line.line_id || generateId(),
      ref: line.ref ?? '',
      description: line.descricao,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unit_price),
      isRisk: line.is_risk,
      total: Number(line.line_total),
    })),
  };
}
