import {
  DEFAULT_DESCRICAO_ITEMS,
  DEFAULT_EMPRESA_ITEMS,
  DEFAULT_SAVE_FORMAT,
  DEFAULT_VALOR_UNIT_ITEMS,
  NOVO_PLUS_VALUE,
  STORAGE_KEYS,
} from '@/lib/constants';
import type { SaveFormat } from '@/lib/types';

export interface SettingsSnapshot {
  logo: string | null;
  saveFormat: SaveFormat;
  descricaoItems: string[];
  empresaItems: string[];
  valorUnitItems: string[];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureNovoPlusLast(items: string[]): string[] {
  const filtered = items.filter((item) => item !== NOVO_PLUS_VALUE);
  return [...filtered, NOVO_PLUS_VALUE];
}

const LEGACY_DEFAULT_DESCRICAO = ['Instalação', 'Manutenção', 'Reparo', 'Serviço'];
const LEGACY_DEFAULT_VALOR_UNIT = ['50', '75', '100'];

/** Remove listas que ainda são só os defaults antigos do código. */
export function stripLegacyDefaults(items: string[], legacyDefaults: string[]): string[] {
  const withoutNovo = items.filter((item) => item !== NOVO_PLUS_VALUE);
  if (
    withoutNovo.length === legacyDefaults.length &&
    withoutNovo.every((item) => legacyDefaults.includes(item))
  ) {
    return ensureNovoPlusLast([]);
  }
  return ensureNovoPlusLast(withoutNovo);
}

export function loadSettingsSnapshot(): SettingsSnapshot {
  const descricaoRaw = readJson(STORAGE_KEYS.descricaoList, ensureNovoPlusLast([]));
  const valorUnitRaw = readJson(STORAGE_KEYS.valorUnitList, ensureNovoPlusLast([]));

  return {
    logo: readJson<string | null>(STORAGE_KEYS.logo, null),
    saveFormat: readJson<SaveFormat>(STORAGE_KEYS.saveFormat, DEFAULT_SAVE_FORMAT),
    descricaoItems: stripLegacyDefaults(descricaoRaw, LEGACY_DEFAULT_DESCRICAO),
    empresaItems: readJson(STORAGE_KEYS.empresaList, ensureNovoPlusLast(DEFAULT_EMPRESA_ITEMS)),
    valorUnitItems: stripLegacyDefaults(valorUnitRaw, LEGACY_DEFAULT_VALOR_UNIT),
  };
}

export function saveSettingsSnapshot(snapshot: SettingsSnapshot): void {
  writeJson(STORAGE_KEYS.logo, snapshot.logo);
  writeJson(STORAGE_KEYS.saveFormat, snapshot.saveFormat);
  writeJson(STORAGE_KEYS.descricaoList, ensureNovoPlusLast(snapshot.descricaoItems));
  writeJson(STORAGE_KEYS.empresaList, ensureNovoPlusLast(snapshot.empresaItems));
  writeJson(STORAGE_KEYS.valorUnitList, ensureNovoPlusLast(snapshot.valorUnitItems));
}