export const NOVO_PLUS_VALUE = '__NOVO_PLUS__';
export const MAX_CUSTOM_ITEM_LENGTH = 32;

export const STORAGE_KEYS = {
  logo: 'jm-notas-logo',
  invoices: 'jm-notas-invoices',
  companyName: 'jm-notas-company-name',
  empresaList: 'jm-notas-empresa-list',
  descricaoList: 'jm-notas-descricao-list',
  valorUnitList: 'jm-notas-valor-unit-list',
  saveFormat: 'jm-notas-save-format',
  savedExports: 'jm-notas-saved-exports',
} as const;

/** Valores antigos que não devem permanecer como texto preenchido */
export const LEGACY_PLACEHOLDER_VALUES = [
  'Sua Empresa',
  'Sua Empresa Inc.',
  'Serviço Prestado',
] as const;

import type { SaveFormat } from '@/lib/types';

export const DEFAULT_SAVE_FORMAT: SaveFormat = 'jpeg';

export const DEFAULT_DESCRICAO_ITEMS: string[] = [];

export const DEFAULT_EMPRESA_ITEMS: string[] = [];

export const DEFAULT_VALOR_UNIT_ITEMS: string[] = [];

export const EMITTER_DATA = {
  name: 'James Mendes da Silva',
  document: '622.388.163-15',
  label: 'CPF',
} as const;

export const INVOICE_PREVIEW_WIDTH = 600;