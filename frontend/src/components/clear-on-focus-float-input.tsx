'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface ClearOnFocusFloatInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/** Mantém só dígitos e um separador decimal (vírgula ou ponto). */
function sanitizeFloatString(raw: string): string {
  let cleaned = raw.replace(/[^\d.,]/g, '');
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex >= 0) {
    const before = cleaned.slice(0, separatorIndex + 1);
    const after = cleaned.slice(separatorIndex + 1).replace(/[.,]/g, '');
    cleaned = before + after;
  }
  return cleaned;
}

function parseFloatValue(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatDisplayValue(value: number): string {
  if (value === 0) return '';
  return String(value).replace('.', ',');
}

export const ClearOnFocusFloatInput = forwardRef<HTMLInputElement, ClearOnFocusFloatInputProps>(
  function ClearOnFocusFloatInput(
    { value, onChange, placeholder = '0', className, id, disabled },
    ref
  ) {
    const [display, setDisplay] = useState(() => formatDisplayValue(value));
    const focusedRef = useRef(false);

    useEffect(() => {
      if (!focusedRef.current) {
        setDisplay(formatDisplayValue(value));
      }
    }, [value]);

    return (
      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        value={display}
        onFocus={() => {
          focusedRef.current = true;
          setDisplay('');
        }}
        onChange={(e) => {
          const sanitized = sanitizeFloatString(e.target.value);
          setDisplay(sanitized);
          onChange(parseFloatValue(sanitized));
        }}
        onBlur={() => {
          focusedRef.current = false;
          const parsed = parseFloatValue(display);
          onChange(parsed);
          setDisplay(formatDisplayValue(parsed));
        }}
      />
    );
  }
);