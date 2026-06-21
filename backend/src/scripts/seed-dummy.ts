import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { closePostgres, getPool } from '../db/postgres.js';
import { buildContentHash } from '../services/hash.js';
import type { IngestReceiptPayload } from '../schemas/receipt.js';

const CLIENTS = [
  { name: 'João Pereira', weight: 10, avgSpend: 200 },
  { name: 'Construtora Alfa', weight: 8, avgSpend: 450 },
  { name: 'Maria Santos', weight: 7, avgSpend: 120 },
  { name: 'Reforma Total', weight: 6, avgSpend: 380 },
  { name: 'Pedro Lima', weight: 5, avgSpend: 95 },
] as const;

const DESCRICOES = ['Instalação', 'Manutenção', 'Reparo', 'Serviço', 'Acabamento'] as const;
const FORMATS = ['jpeg', 'pdf'] as const;

function pickWeighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randomDateInLastDays(days: number): Date {
  const now = new Date();
  const offset = Math.floor(Math.random() * days);
  const date = new Date(now);
  date.setDate(date.getDate() - offset);
  date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return date;
}

function buildDummyReceipt(client: (typeof CLIENTS)[number], issueDate: Date): IngestReceiptPayload {
  const eventId = randomUUID();
  const receiptId = randomUUID();
  const invoiceNumber = randomUUID();
  const lineCount = 1 + Math.floor(Math.random() * 2);
  const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];
  const useCompany = Math.random() > 0.5;

  const lines = Array.from({ length: lineCount }, (_, index) => {
    const isRisk = Math.random() > 0.7;
    const quantity = isRisk ? randomBetween(50, 200) : randomBetween(1, 5);
    const unitPrice = randomBetween(10, 80);
    let lineTotal = quantity * unitPrice;
    if (isRisk) lineTotal = lineTotal / 100;
    lineTotal = Math.round(lineTotal * 100) / 100;

    return {
      line_id: `item-${randomUUID().slice(0, 8)}`,
      line_order: index + 1,
      ref: String(1 + Math.floor(Math.random() * 5)),
      descricao: DESCRICOES[Math.floor(Math.random() * DESCRICOES.length)],
      quantity,
      unit_price: unitPrice,
      is_risk: isRisk,
      line_total: Math.max(lineTotal, 0.1),
    };
  });

  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.line_total, 0) * 100) / 100;
  const deliveryFee = Math.random() > 0.7 ? randomBetween(10, 35) : 0;
  const adjustment = Math.random() > 0.8 ? randomBetween(-30, -5) : 0;
  const grandTotal = Math.round((subtotal + deliveryFee + adjustment) * 100) / 100;
  const eventAt = issueDate.toISOString();
  const issueDateStr = issueDate.toISOString().slice(0, 10);

  return {
    source_system: 'studio-rm-james',
    event_type: 'receipt.saved',
    event_id: eventId,
    event_at: eventAt,
    export: {
      id: eventId,
      format,
      file_mime_type: format === 'pdf' ? 'application/pdf' : 'image/jpeg',
    },
    receipt: {
      id: receiptId,
      invoice_number: invoiceNumber,
      client_name: useCompany ? null : client.name,
      service_type: 'Serviço Prestado',
      issue_date: issueDateStr,
      company_name: useCompany ? `${client.name} Ltda` : null,
      emitter: {
        document_type: 'cpf',
        legal_name: 'James Mendes da Silva',
        document_number: '622.388.163-15',
      },
      delivery_fee: deliveryFee,
      adjustment,
      lines,
      totals: {
        subtotal,
        delivery_fee: deliveryFee,
        adjustment,
        grand_total: grandTotal,
        item_count: lines.length,
      },
    },
  };
}

async function seedDummy(count = 15) {
  const pool = getPool();
  if (!pool) {
    console.error('DATABASE_URL não configurada.');
    process.exit(1);
  }

  console.log(`Inserindo ${count} recibos dummy em ${config.receiptsTable}...`);

  for (let i = 0; i < count; i++) {
    const client = pickWeighted(CLIENTS);
    const issueDate = randomDateInLastDays(90);
    const payload = buildDummyReceipt(client, issueDate);
    const contentHash = buildContentHash(payload);
    const { receipt, export: exportMeta, event_id, event_at } = payload;

    await pool.query(
      `INSERT INTO ${config.receiptsTable} (
        event_id, responsavel, receipt_id, invoice_number, client_name,
        service_type, issue_date, company_name,
        emitter_legal_name, emitter_document,
        delivery_fee, adjustment,
        subtotal, grand_total, item_count, export_format,
        lines, content_hash, event_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19
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
        contentHash,
        event_at,
      ]
    );
  }

  console.log(`Seed concluído: ${count} recibo(s) em ${config.receiptsTable}.`);
  await closePostgres();
}

const count = Number(process.argv[2] ?? 15);
seedDummy(count).catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});