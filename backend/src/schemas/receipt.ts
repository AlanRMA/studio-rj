import { z } from 'zod';

const requiredText = (message: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, message));

export const receiptLineSchema = z.object({
  line_id: z.string().min(1),
  line_order: z.number().int().positive(),
  ref: z.string().optional(),
  descricao: requiredText('descricao é obrigatória'),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  is_risk: z.boolean(),
  line_total: z.number().gt(0, 'line_total deve ser maior que zero'),
});

export const receiptTotalsSchema = z.object({
  subtotal: z.number().gt(0, 'subtotal deve ser maior que zero'),
  delivery_fee: z.number().min(0),
  adjustment: z.number(),
  grand_total: z.number().gt(0, 'grand_total deve ser maior que zero'),
  item_count: z.number().int().positive(),
});

export const ingestReceiptSchema = z
  .object({
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
      totals: receiptTotalsSchema,
    }),
  })
  .superRefine((data, ctx) => {
    const clientName = data.receipt.client_name?.trim() ?? '';
    const companyName = data.receipt.company_name?.trim() ?? '';
    if (!clientName && !companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe company_name ou client_name',
        path: ['receipt', 'client_name'],
      });
    }
  });

export type IngestReceiptPayload = z.infer<typeof ingestReceiptSchema>;