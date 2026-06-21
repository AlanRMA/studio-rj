import { createHash } from 'node:crypto';
import type { IngestReceiptPayload } from '../schemas/receipt.js';

export function buildContentHash(payload: IngestReceiptPayload): string {
  const { receipt } = payload;
  const fingerprint = {
    responsavel: 'James',
    receipt_id: receipt.id,
    invoice_number: receipt.invoice_number,
    client_name: (receipt.client_name ?? '').trim().toLowerCase(),
    company_name: (receipt.company_name ?? '').trim().toLowerCase(),
    issue_date: receipt.issue_date,
    delivery_fee: receipt.delivery_fee,
    adjustment: receipt.adjustment,
    grand_total: receipt.totals.grand_total,
    lines: receipt.lines.map((line) => ({
      line_id: line.line_id,
      descricao: line.descricao,
      quantity: line.quantity,
      unit_price: line.unit_price,
      is_risk: line.is_risk,
      line_total: line.line_total,
    })),
  };

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
}