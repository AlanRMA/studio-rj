'use client';
import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Invoice } from '@/lib/types';
import { EMITTER_DATA, INVOICE_PREVIEW_WIDTH } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface InvoicePreviewProps {
  invoice: Invoice;
  logo: string | null;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ invoice, logo }, ref) => {
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const deliveryFee = invoice.deliveryFee || 0;
  const adjustment = invoice.adjustment || 0;
  const total = subtotal + deliveryFee + adjustment;

  const formatQuantity = (quantity: number) =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(quantity || 0);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Data Inválida';
      return format(new Date(`${dateString}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return 'Data Inválida';
    }
  };

  const displayName = invoice.clientName || invoice.companyName || 'Cliente';

  return (
    <Card
      ref={ref}
      className="invoice-preview bg-white text-black font-sans shadow-lg shrink-0"
      style={{
        width: `${INVOICE_PREVIEW_WIDTH}px`,
        minWidth: `${INVOICE_PREVIEW_WIDTH}px`,
        maxWidth: `${INVOICE_PREVIEW_WIDTH}px`,
        padding: '18px',
        boxSizing: 'border-box',
      }}
    >
      <CardContent className="p-0">
        <header className="flex flex-row justify-between items-start gap-3 pb-3">
          <div className="shrink-0">
            {logo ? (
              <div className="w-20 h-20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo da Empresa" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Logo da Empresa</span>
              </div>
            )}
          </div>

          <div className="text-right flex-1 min-w-0">
            <h1 className="text-base font-semibold text-purple-600">NOTA DE PAGAMENTO</h1>
            <p className="text-[10px] leading-tight text-gray-500 mt-0.5 break-all">Ref: {invoice.invoiceNumber}</p>
            <p className="text-sm font-cursive text-gray-700 mt-0.5 break-words">
              {EMITTER_DATA.name}
            </p>
            <p className="text-xs leading-tight text-gray-500">
              {EMITTER_DATA.label}: {EMITTER_DATA.document}
            </p>
            <p className="text-xs leading-tight text-gray-500">{formatDate(invoice.issueDate)}</p>
          </div>
        </header>

        <Separator className="my-3" />

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">COBRANÇA PARA</p>
            <p className="font-bold text-sm break-words leading-tight">{displayName}</p>

          </div>
          <div className="text-right min-w-0">
            <p className="text-xs text-gray-500 mb-1">TIPO DE SERVIÇO</p>
            <p className="font-bold text-sm break-words leading-tight">{invoice.service || 'Serviço Prestado'}</p>
          </div>
        </div>

        <div className="mb-3">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[9%] py-1 px-1 text-left text-[10px] font-medium">REF.</th>
                <th className="w-[46%] py-1 px-1 text-left text-[10px] font-medium">DESCRIÇÃO</th>
                <th className="w-[17%] py-1 px-1 text-center text-[10px] leading-tight font-medium">Qntd/<wbr />Comprimento</th>
                <th className="w-[14%] py-1 px-1 text-right text-[10px] leading-tight font-medium">VALOR<br />UNIT.</th>
                <th className="w-[14%] py-1 px-1 text-right text-[10px] font-medium">VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length > 0 ? (
                invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-1 px-1 text-[10px] leading-tight align-top break-words tabular-nums">{item.ref || '-'}</td>
                    <td className="py-1 px-1 text-[10px] align-top break-words whitespace-pre-wrap leading-tight">
                      {item.description}
                    </td>
                    <td className="py-1 px-1 text-[10px] leading-tight text-center align-top whitespace-nowrap">
                      {formatQuantity(item.quantity)}
                    </td>
                    <td className="py-1 px-1 text-[10px] leading-tight text-right align-top whitespace-nowrap">
                      {formatCurrency(item.unitPrice || 0)}
                    </td>
                    <td className="py-1 px-1 text-[10px] leading-tight text-right font-semibold align-top whitespace-nowrap">
                      {formatCurrency(item.total || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum item adicionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Separator className="my-3" />

        <div className="flex justify-end">
          <div className="w-full max-w-[16rem] space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {deliveryFee !== 0 && (
              <div className="flex justify-between text-xs">
                <span>Taxa de Entrega</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            {adjustment !== 0 && (
              <div className="flex justify-between text-xs">
                <span>{adjustment < 0 ? 'Desconto' : 'Acréscimo'}</span>
                <span>{formatCurrency(adjustment)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold text-purple-600">
              <span>Total a Pagar</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <footer className="mt-4 text-center text-[10px] text-gray-500">
          Aguardando o pagamento e o envio do comprovante
        </footer>
      </CardContent>
    </Card>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
