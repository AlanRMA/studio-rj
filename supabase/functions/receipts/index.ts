import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';
import { z } from 'npm:zod@3.24.2';

const ALLOWED_ORIGINS = new Set([
  'https://studio-riscos-digitais.vercel.app',
  'http://localhost:9003',
]);

const requiredText = (message: string) =>
  z.string().transform((value) => value.trim()).pipe(z.string().min(1, message));

const receiptLineSchema = z.object({
  line_id: z.string().min(1),
  line_order: z.number().int().positive(),
  ref: z.string().optional(),
  descricao: requiredText('descricao é obrigatória'),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  is_risk: z.boolean(),
  line_total: z.number().gt(0),
});

const ingestReceiptSchema = z.object({
  source_system: z.literal('studio-rm-james'),
  event_type: z.literal('receipt.saved'),
  event_id: z.string().uuid(),
  event_at: z.string().datetime(),
  export: z.object({
    id: z.string().uuid(),
    format: z.enum(['jpeg', 'pdf']),
    file_mime_type: z.string().min(1),
  }),
  receipt: z.object({
    id: z.string().uuid(),
    invoice_number: requiredText('invoice_number é obrigatório'),
    client_name: z.string().nullable(),
    service_type: z.string().optional(),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    company_name: z.string().nullable(),
    emitter: z.object({
      document_type: z.literal('cpf'),
      legal_name: z.string().min(1),
      document_number: z.string().min(1),
    }),
    delivery_fee: z.number().min(0),
    adjustment: z.number(),
    lines: z.array(receiptLineSchema).min(1),
    totals: z.object({
      subtotal: z.number().gt(0),
      delivery_fee: z.number().min(0),
      adjustment: z.number(),
      grand_total: z.number().gt(0),
      item_count: z.number().int().positive(),
    }),
  }),
});

type ReceiptPayload = z.infer<typeof ingestReceiptSchema>;
type ReceiptSummary = {
  event_id: string;
  receipt_id: string;
  invoice_number: string;
  client_name: string | null;
  company_name: string | null;
  service_type: string | null;
  grand_total: number | string;
  issue_date: string;
  export_format: 'jpeg' | 'pdf';
  event_at: string;
  ingested_at: string;
};

const SUMMARY_COLUMNS =
  'event_id,receipt_id,invoice_number,client_name,company_name,service_type,grand_total,issue_date,export_format,event_at,ingested_at';

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://studio-riscos-digitais.vercel.app',
    'Access-Control-Allow-Headers': 'content-type,x-app-key,x-idempotency-key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    Vary: 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const currentKey = secretKeys
    ? (JSON.parse(secretKeys) as Record<string, string>).default
    : undefined;
  const key = currentKey || legacyKey;
  if (!url || !key) throw new Error('Credenciais internas do Supabase indisponíveis');
  return createClient(url, key, { auth: { persistSession: false } });
}

function authorize(request: Request): boolean {
  const expected = Deno.env.get('APP_ACCESS_KEY');
  const received = request.headers.get('x-app-key');
  return Boolean(expected && received && received === expected);
}

function invoiceData(payload: ReceiptPayload) {
  const receipt = payload.receipt;
  return {
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
}

async function saveReceipt(request: Request, supabase: SupabaseClient): Promise<Response> {
  const parsed = ingestReceiptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json(request, { error: 'Payload inválido', details: parsed.error.flatten() }, 400);
  }

  const payload = parsed.data;
  const receipt = payload.receipt;
  const idempotencyKey = request.headers.get('x-idempotency-key');
  if (idempotencyKey && idempotencyKey !== payload.event_id) {
    return json(request, { error: 'X-Idempotency-Key deve ser igual a event_id' }, 400);
  }

  const { error } = await supabase.from('james_receipts').insert({
    event_id: payload.event_id,
    responsavel: 'James',
    receipt_id: receipt.id,
    invoice_number: receipt.invoice_number,
    client_name: receipt.client_name,
    service_type: receipt.service_type ?? '',
    issue_date: receipt.issue_date,
    company_name: receipt.company_name,
    emitter_legal_name: receipt.emitter.legal_name,
    emitter_document: receipt.emitter.document_number,
    delivery_fee: receipt.delivery_fee,
    adjustment: receipt.adjustment,
    subtotal: receipt.totals.subtotal,
    grand_total: receipt.totals.grand_total,
    item_count: receipt.totals.item_count,
    export_format: payload.export.format,
    lines: receipt.lines,
    invoice_data: invoiceData(payload),
    template_version: 1,
    event_at: payload.event_at,
  });

  if (error?.code === '23505') {
    return json(request, { ok: true, status: 'idempotent', event_id: payload.event_id, queued: false });
  }
  if (error) {
    console.error('[save]', error);
    return json(request, { error: 'Não foi possível registrar a nota' }, 503);
  }

  return json(request, { ok: true, status: 'ingested', event_id: payload.event_id, queued: false }, 201);
}

function applyDate(query: any, date: string | null) {
  return date ? query.eq('issue_date', date) : query;
}

async function searchReceipts(request: Request, supabase: SupabaseClient): Promise<Response> {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') ?? '').trim();
  const date = url.searchParams.get('date');
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json(request, { error: 'date deve usar o formato YYYY-MM-DD' }, 400);
  }

  if (!id) {
    let query = supabase.from('james_receipts').select(SUMMARY_COLUMNS).eq('responsavel', 'James');
    query = applyDate(query, date);
    const { data, error } = await query.order('ingested_at', { ascending: false }).limit(limit);
    if (error) return json(request, { error: 'Não foi possível consultar as notas' }, 503);
    return json(request, { ok: true, count: data.length, receipts: data });
  }

  const escapedPrefix = id.replace(/[\\%_]/g, '\\$&');
  const buildQuery = () => {
    let query = supabase.from('james_receipts').select(SUMMARY_COLUMNS).eq('responsavel', 'James');
    return applyDate(query, date).order('ingested_at', { ascending: false });
  };

  const [byEvent, byReceipt, byReference] = await Promise.all([
    buildQuery().eq('event_id', id).limit(limit),
    buildQuery().eq('receipt_id', id).limit(limit),
    buildQuery().ilike('invoice_number', `${escapedPrefix}%`).limit(limit),
  ]);

  const error = byEvent.error || byReceipt.error || byReference.error;
  if (error) {
    console.error('[search]', error);
    return json(request, { error: 'Não foi possível consultar as notas' }, 503);
  }

  const unique = new Map<string, ReceiptSummary>();
  for (const row of [...(byEvent.data ?? []), ...(byReceipt.data ?? []), ...(byReference.data ?? [])] as ReceiptSummary[]) {
    unique.set(row.event_id, row);
  }
  const receipts = [...unique.values()]
    .sort((a, b) => Date.parse(b.ingested_at) - Date.parse(a.ingested_at))
    .slice(0, limit);

  return json(request, { ok: true, count: receipts.length, receipts });
}

async function findReceipt(supabase: SupabaseClient, id: string) {
  for (const field of ['event_id', 'receipt_id', 'invoice_number'] as const) {
    const { data, error } = await supabase
      .from('james_receipts')
      .select('*')
      .eq('responsavel', 'James')
      .eq(field, id)
      .order('ingested_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (!authorize(request)) {
    return json(request, { error: 'Chave de acesso inválida' }, 401);
  }

  try {
    const path = new URL(request.url).pathname;
    const supabase = adminClient();

    if (request.method === 'GET' && path.endsWith('/auth-check')) {
      return json(request, { ok: true });
    }
    if (request.method === 'POST' && path.endsWith('/james/receipt')) {
      return await saveReceipt(request, supabase);
    }
    if (request.method === 'GET' && path.endsWith('/james/receipts')) {
      return await searchReceipts(request, supabase);
    }
    if (request.method === 'GET' && path.includes('/james/receipts/')) {
      const id = decodeURIComponent(path.split('/james/receipts/')[1] ?? '');
      const receipt = await findReceipt(supabase, id);
      return receipt
        ? json(request, { ok: true, receipt })
        : json(request, { error: 'Recibo não encontrado' }, 404);
    }

    return json(request, { error: 'Rota não encontrada' }, 404);
  } catch (error) {
    console.error('[receipts]', error);
    return json(request, { error: 'Erro interno no Supabase' }, 500);
  }
});
