import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config, type AppEnv } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const envPath = path.join(backendRoot, '.env');

type SchemaName = 'dev' | 'prod';

function loadTableSql(schema: SchemaName): string {
  const templatePath = path.resolve(backendRoot, 'migrations/james_receipts_table.sql');
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Arquivo de migration não encontrado: ${templatePath}\n` +
        'Confirme que você está na pasta backend/ (studio-rj/backend).'
    );
  }
  return fs.readFileSync(templatePath, 'utf8').replaceAll('{{SCHEMA}}', schema);
}

function assertEnvConfigured(): void {
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Arquivo .env não encontrado em ${envPath}\n\n` +
        'Passos:\n' +
        '  1. cd backend\n' +
        '  2. cp .env.example .env\n' +
        '  3. Cole a mesma DATABASE_URL do backend da Rosania\n' +
        '  4. npm run migrate:all'
    );
  }

  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL está vazia no .env\n\n' +
        `Edite o arquivo: ${envPath}\n` +
        'Use a mesma connection string do Supabase que funciona no backend da Rosania.'
    );
  }
}

async function migrateSchema(pool: pg.Pool, schema: SchemaName) {
  await pool.query(loadTableSql(schema));
  console.log(`Tabela ${schema}.james_receipts pronta.`);
}

export async function migrate(target?: AppEnv): Promise<void> {
  assertEnvConfigured();

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await pool.query('SELECT 1');
    console.log('Conexão com Supabase OK.');

    const schemas: SchemaName[] =
      target === 'production'
        ? ['prod']
        : target === 'development'
          ? ['dev']
          : ['dev', 'prod'];

    for (const schema of schemas) {
      await migrateSchema(pool, schema);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('password authentication failed')) {
      throw new Error(
        'Falha de autenticação no Supabase.\n' +
          '- Verifique a senha em DATABASE_URL\n' +
          '- Se a senha tem caracteres especiais (@, #, /), use a versão URL-encoded\n' +
          '- No Supabase: Project Settings → Database → Connection string (URI)'
      );
    }

    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      throw new Error(
        'Não foi possível conectar ao host do banco.\n' +
          '- Confira se DATABASE_URL está completa\n' +
          '- Tente a URI do pooler: ...pooler.supabase.com:5432/postgres'
      );
    }

    throw error;
  } finally {
    await pool.end();
  }
}

const arg = process.argv[2];
const target =
  arg === 'production' || arg === 'prod'
    ? 'production'
    : arg === 'development' || arg === 'dev'
      ? 'development'
      : arg === 'all'
        ? undefined
        : (process.env.APP_ENV === 'production' ? 'production' : 'development');

const isMain = process.argv[1]?.includes('migrate.ts');
if (isMain) {
  console.log(`\n=== Migration James (${target ?? 'dev + prod'}) ===`);
  console.log(`Pasta: ${backendRoot}`);
  console.log(`Tabela alvo: ${config.receiptsTable}\n`);

  migrate(target).catch((error) => {
    console.error('\n✗ Falha na migration:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}