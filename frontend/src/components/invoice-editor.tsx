
'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { invoiceSchema } from '@/lib/types';
import { formatInvoiceValidationError, validateInvoiceForSave } from '@/lib/invoice-validation';
import { useDropdownLists } from '@/hooks/use-dropdown-lists';
import { CustomItemSelect } from '@/components/custom-item-select';
import { CustomPriceSelect } from '@/components/custom-price-select';
import { ClearOnFocusInput } from '@/components/clear-on-focus-input';
import { ClearOnFocusFloatInput } from '@/components/clear-on-focus-float-input';
import { ItemRowErrors } from '@/components/item-row-errors';
import { LogoUploader } from '@/components/logo-uploader';
import { LEGACY_PLACEHOLDER_VALUES } from '@/lib/constants';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { roundToNearestTenCents } from '@/lib/utils';

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
  listsRevision?: number;
}

export const InvoiceEditor = forwardRef<InvoiceEditorHandle, InvoiceEditorProps>(
  function InvoiceEditor({ invoice, logo, onLogoChange, onInvoiceChange, listsRevision = 0 }, ref) {
  const { descricaoItems, empresaItems, valorUnitItems, addItem } = useDropdownLists(listsRevision);
  const legacyClearValues = [...LEGACY_PLACEHOLDER_VALUES];

  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

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

  const publishInvoiceChange = useCallback(() => {
    form.trigger().then((isValid) => {
      if (isValid) {
        const parsed = validateInvoiceForSave(form.getValues() as Invoice);
        if (parsed.success) {
          onInvoiceChange(parsed.data);
        }
      }
    });
  }, [form, onInvoiceChange]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && (name.includes('.quantity') || name.includes('.unitPrice') || name.includes('.isRisk'))) {
        const itemIndex = parseInt(name.split('.')[1], 10);
        if (!isNaN(itemIndex)) {
          const item = form.getValues(`items.${itemIndex}`);
          let newTotal = (item.quantity || 0) * (item.unitPrice || 0);
          if (item.isRisk) {
            newTotal = newTotal / 100;
          }
          const roundedTotal = roundToNearestTenCents(newTotal);
          form.setValue(`items.${itemIndex}.total`, roundedTotal, { shouldDirty: true, shouldValidate: true });
        }
      }

      if (type === 'change') {
        form.trigger().then((isValid) => {
          if (isValid) {
            const parsed = validateInvoiceForSave(value as Invoice);
            if (parsed.success) {
              onInvoiceChange(parsed.data);
            }
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onInvoiceChange]);

  const handleNumericInput = (field: { onChange: (value: number) => void }, value: string) => {
    const parsedValue = parseFloat(value);
    field.onChange(isNaN(parsedValue) ? 0 : parsedValue);
  };

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
              name="companyName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <CustomItemSelect
                    label="Nome da Empresa"
                    value={field.value}
                    items={empresaItems}
                    onChange={field.onChange}
                    onAddItem={(val) => addItem('empresa', val)}
                    placeholder="Selecione a empresa"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="clientName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <ClearOnFocusInput
                      placeholder="Nome do cliente"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <CustomItemSelect
                          label="Descrição"
                          hideLabel={index !== 0}
                          value={descField.value}
                          items={descricaoItems}
                          onChange={descField.onChange}
                          onAddItem={(val) => addItem('descricao', val)}
                          placeholder="Selecione a descrição"
                        />
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
                        <Checkbox checked={riskField.value} onCheckedChange={riskField.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        É um risco? (medido em cm)
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
                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Quantidade/Complemento</FormLabel>
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
                        <CustomPriceSelect
                          label="Valor Unit. (R$)"
                          hideLabel={index !== 0}
                          value={priceField.value || 0}
                          items={valorUnitItems}
                          onChange={priceField.onChange}
                          onAddItem={(val) => addItem('valorUnit', val)}
                          placeholder="Selecione o valor"
                        />
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            {...totalField}
                            onChange={(e) => handleNumericInput(totalField, e.target.value)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => remove(index)}
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
                append({
                  id: `item-${Date.now()}`,
                  ref: '',
                  description: '',
                  isRisk: false,
                  quantity: 0,
                  unitPrice: 0,
                  total: 0,
                })
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
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      onChange={(e) => handleNumericInput(field, e.target.value)}
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
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      onChange={(e) => handleNumericInput(field, e.target.value)}
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