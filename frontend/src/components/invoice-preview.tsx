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

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Data Inválida';
      return format(new Date(`${dateString}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return 'Data Inválida';
    }
  };

  const formatQuantity = (item: Invoice['items'][number]) => {
    const qty = item.quantity ?? 0;
    return item.isRisk ? `${qty}cm` : String(qty);
  };

  const displayName = invoice.companyName || invoice.clientName || 'Cliente';

  return (
    <Card
      ref={ref}
      className="invoice-preview bg-white text-black font-sans shadow-lg shrink-0"
      style={{
        width: `${INVOICE_PREVIEW_WIDTH}px`,
        minWidth: `${INVOICE_PREVIEW_WIDTH}px`,
        maxWidth: `${INVOICE_PREVIEW_WIDTH}px`,
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <CardContent className="p-0">
        <header className="flex flex-row justify-between items-start gap-3 pb-6">
          <div className="shrink-0">
            {logo ? (
              <div className="w-28 h-28 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo da Empresa" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Logo da Empresa</span>
              </div>
            )}
          </div>

          <div className="text-right flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-purple-600">NOTA DE PAGAMENTO</h1>
            <p className="text-xs text-gray-500 mt-1 break-all">Ref: {invoice.invoiceNumber}</p>
            <p className="text-base font-cursive text-gray-700 mt-1 break-words">
              {EMITTER_DATA.name}
            </p>
            <p className="text-sm text-gray-500">
              {EMITTER_DATA.label}: {EMITTER_DATA.document}
            </p>
            <p className="text-sm text-gray-500">{formatDate(invoice.issueDate)}</p>
          </div>
        </header>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">COBRANÇA PARA</p>
            <p className="font-bold text-2xl break-words">{displayName}</p>
            {invoice.companyName && invoice.clientName ? (
              <p className="text-sm text-gray-600 mt-1 break-words">{invoice.clientName}</p>
            ) : null}
          </div>
          <div className="text-right min-w-0">
            <p className="text-xs text-gray-500 mb-1">TIPO DE SERVIÇO</p>
            <p className="font-bold break-words">{invoice.service || 'Serviço Prestado'}</p>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[12%] py-2 px-1 text-left text-xs font-medium">REF.</th>
                <th className="w-[28%] py-2 px-1 text-left text-xs font-medium">DESCRIÇÃO</th>
                <th className="w-[18%] py-2 px-1 text-center text-xs font-medium">QNTD./COMP.</th>
                <th className="w-[20%] py-2 px-1 text-right text-xs font-medium">VALOR UNIT.</th>
                <th className="w-[22%] py-2 px-1 text-right text-xs font-medium">VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length > 0 ? (
                invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-2 px-1 text-xs align-top break-words">{item.ref || '-'}</td>
                    <td className="py-2 px-1 text-xs align-top break-words leading-tight">
                      {item.description}
                    </td>
                    <td className="py-2 px-1 text-xs text-center align-top whitespace-nowrap">
                      {formatQuantity(item)}
                    </td>
                    <td className="py-2 px-1 text-right text-xs align-top whitespace-nowrap">
                      {formatCurrency(item.unitPrice || 0)}
                    </td>
                    <td className="py-2 px-1 text-right font-semibold text-xs align-top whitespace-nowrap">
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

        <Separator className="my-6" />

        <div className="flex justify-end">
          <div className="w-full max-w-[16rem] space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotais</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {deliveryFee !== 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            {adjustment !== 0 && (
              <div className="flex justify-between text-sm">
                <span>{adjustment < 0 ? 'Desconto' : 'Acréscimo'}</span>
                <span>{formatCurrency(adjustment)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold text-purple-600">
              <span>Total a Pagar</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-500">
          Aguardando o pagamento e o envio do comprovante
        </footer>
      </CardContent>
    </Card>
  );
});

InvoicePreview.displayName = 'InvoicePreview';