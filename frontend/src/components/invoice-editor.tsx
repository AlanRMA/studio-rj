
'use client';

import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { invoiceSchema } from '@/lib/types';
import { formatInvoiceValidationError, validateInvoiceForSave } from '@/lib/invoice-validation';
import { ClearOnFocusInput } from '@/components/clear-on-focus-input';
import { ClearOnFocusFloatInput } from '@/components/clear-on-focus-float-input';
import { ItemRowErrors } from '@/components/item-row-errors';
import { LogoUploader } from '@/components/logo-uploader';
import { LEGACY_PLACEHOLDER_VALUES } from '@/lib/constants';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { calculateItemTotal } from '@/lib/meter-total';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export interface InvoiceEditorHandle {
  validateForSave: () => Promise<
    { ok: true; invoice: Invoice } | { ok: false; message: string }
  >;
}

interface InvoiceEditorProps {
  invoice: Invoice;
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  onInvoiceChange: (invoice: Invoice) => void;
}

export const InvoiceEditor = forwardRef<InvoiceEditorHandle, InvoiceEditorProps>(
  function InvoiceEditor({ invoice, logo, onLogoChange, onInvoiceChange }, ref) {
  const legacyClearValues = [...LEGACY_PLACEHOLDER_VALUES];

  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const watchedItems = form.watch('items');

  useImperativeHandle(ref, () => ({
    validateForSave: async () => {
      await form.trigger();
      const values = form.getValues() as Invoice;
      const result = validateInvoiceForSave(values);
      if (!result.success) {
        return { ok: false, message: formatInvoiceValidationError(result.error) };
      }
      return { ok: true, invoice: result.data };
    },
  }));

  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name && (name.includes('.quantity') || name.includes('.unitPrice') || name.includes('.isRisk'))) {
        const itemIndex = parseInt(name.split('.')[1], 10);
        if (!isNaN(itemIndex)) {
          const item = form.getValues(`items.${itemIndex}`);
          form.setValue(
            `items.${itemIndex}.total`,
            calculateItemTotal(item.quantity, item.unitPrice, item.isRisk),
            { shouldDirty: true, shouldValidate: true }
          );
        }
      }

      if (name) {
        onInvoiceChange(structuredClone(form.getValues()));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onInvoiceChange]);

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Sua Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoUploader logo={logo} onLogoChange={onLogoChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Detalhes da Nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              name="clientName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa/Cliente</FormLabel>
                  <FormControl>
                    <ClearOnFocusInput
                      placeholder="Nome da empresa ou cliente"
                      clearOnFocusValues={legacyClearValues}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="service"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Serviço</FormLabel>
                  <FormControl>
                    <ClearOnFocusInput
                      placeholder="Serviço Prestado"
                      clearOnFocusValues={legacyClearValues}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                name="invoiceNumber"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ref. da Nota</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="issueDate"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-3 border rounded-md space-y-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,5fr)] gap-3">
                  <FormField
                    name={`items.${index}.ref`}
                    control={form.control}
                    render={({ field: refField }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Ref.</FormLabel>
                        <FormControl>
                          <ClearOnFocusInput
                            placeholder="Ref."
                            clearOnFocusValues={legacyClearValues}
                            {...refField}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.description`}
                    control={form.control}
                    render={({ field: descField }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea rows={1} className="h-10 min-h-10 resize-y" placeholder="Descreva o serviço ou item" {...descField} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`items.${index}.isRisk`}
                  render={({ field: riskField }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={riskField.value}
                          onCheckedChange={(checked) => riskField.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        É um risco? (medido em centímetros)
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField
                    name={`items.${index}.quantity`}
                    control={form.control}
                    render={({ field: qtyField }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          {watchedItems[index]?.isRisk ? 'Comprimento (cm)' : 'Quantidade'}
                        </FormLabel>
                        <FormControl>
                          <ClearOnFocusFloatInput
                            value={qtyField.value ?? 0}
                            onChange={qtyField.onChange}
                            placeholder="0"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.unitPrice`}
                    control={form.control}
                    render={({ field: priceField }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>
                          {watchedItems[index]?.isRisk ? 'Valor por metro (R$)' : 'Valor unitário (R$)'}
                        </FormLabel>
                        <FormControl>
                          <ClearOnFocusFloatInput value={priceField.value ?? 0} onChange={priceField.onChange} placeholder="0,00" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.total`}
                    control={form.control}
                    render={({ field: totalField }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Valor Final (R$)</FormLabel>
                        <FormControl>
                          <ClearOnFocusFloatInput
                            value={totalField.value ?? 0}
                            onChange={totalField.onChange}
                            placeholder="0,00"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {watchedItems[index]?.isRisk
                    ? 'Total = comprimento em cm × valor por metro ÷ 100.'
                    : 'Total = quantidade × valor unitário.'}{' '}
                  Você pode ajustar o valor final; alterar os valores acima refaz o cálculo.
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => { remove(index); onInvoiceChange(structuredClone(form.getValues())); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <ItemRowErrors index={index} />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                (() => { append({
                  id: `item-${Date.now()}`,
                  ref: '',
                  description: '',
                  isRisk: true,
                  quantity: 0,
                  unitPrice: 0,
                  total: 0,
                }); onInvoiceChange(structuredClone(form.getValues())); })()
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Ajuste Final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              name="deliveryFee"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa de Entrega</FormLabel>
                  <FormControl>
                    <ClearOnFocusFloatInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      placeholder="0,00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="adjustment"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desconto ou Acréscimo</FormLabel>
                  <FormControl>
                    <ClearOnFocusFloatInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      placeholder="0,00"
                      allowNegative
                    />
                  </FormControl>
                  <FormDescription>
                    Use um valor negativo para descontos (ex: -50,00).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
});
