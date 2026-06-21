'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NOVO_PLUS_VALUE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface CustomPriceSelectProps {
  label: string;
  value: number;
  items: string[];
  onChange: (value: number) => void;
  onAddItem: (value: string) => boolean;
  placeholder?: string;
  hideLabel?: boolean;
}

function formatPriceLabel(raw: string): string {
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) return raw;
  return formatCurrency(parsed);
}

function normalizePriceInput(raw: string): string {
  const cleaned = raw.replace(',', '.').trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) return '';
  return String(Math.round(parsed * 100) / 100);
}

export function CustomPriceSelect({
  label,
  value,
  items,
  onChange,
  onAddItem,
  placeholder = 'Selecione o valor',
  hideLabel = false,
}: CustomPriceSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const [error, setError] = useState('');

  const selectableItems = items.filter((item) => item !== NOVO_PLUS_VALUE);
  const selectedKey = value > 0 ? normalizePriceInput(String(value)) : '';
  const displayValue =
    selectedKey && selectableItems.includes(selectedKey) ? selectedKey : undefined;

  const handleSelectChange = (selected: string) => {
    if (selected === NOVO_PLUS_VALUE) {
      setNewItemValue('');
      setError('');
      setDialogOpen(true);
      return;
    }
    onChange(parseFloat(selected) || 0);
  };

  const handleCreateItem = () => {
    const normalized = normalizePriceInput(newItemValue);
    if (!normalized) {
      setError('Digite um valor numérico válido (ex: 75 ou 75,50).');
      return;
    }
    const added = onAddItem(normalized);
    if (!added) {
      setError('Este valor já existe na lista.');
      return;
    }
    onChange(parseFloat(normalized));
    setDialogOpen(false);
    setNewItemValue('');
    setError('');
  };

  return (
    <>
      <div className="space-y-1">
        {!hideLabel && <Label>{label}</Label>}
        <Select value={displayValue} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {selectableItems.map((item) => (
              <SelectItem key={item} value={item}>
                {formatPriceLabel(item)}
              </SelectItem>
            ))}
            <SelectItem value={NOVO_PLUS_VALUE} className="text-primary font-medium">
              NOVO+
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo valor — {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newItemValue}
              onChange={(e) => {
                setNewItemValue(e.target.value);
                setError('');
              }}
              placeholder="Ex: 75,00"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateItem()}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateItem}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}