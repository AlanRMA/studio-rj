import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(path.resolve(__dirname, '../..'), '.env');

async function main() {
  console.log('\n=== Diagnóstico James Backend ===\n');
  console.log(`Pasta atual esperada: studio-rj/backend`);
  console.log(`.env existe: ${fs.existsSync(envPath) ? 'sim' : 'NÃO'}`);
  console.log(`DATABASE_URL configurada: ${config.databaseUrl ? 'sim' : 'NÃO'}`);
  console.log(`APP_ENV: ${config.appEnv}`);
  console.log(`Tabela: ${config.receiptsTable}`);

  if (!config.databaseUrl) {
    console.error(
      '\n✗ Configure DATABASE_URL no .env antes de rodar migrate.\n' +
        '  cp .env.example .env\n'
    );
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await pool.query('SELECT 1');
    console.log('\n✓ Conexão Postgres OK');

    for (const schema of ['dev', 'prod'] as const) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = 'james_receipts'
        ) AS exists`,
        [schema]
      );
      const exists = result.rows[0]?.exists;
      console.log(`  ${schema}.james_receipts: ${exists ? 'existe' : 'ainda não criada'}`);
    }

    console.log('\nSe as tabelas não existem, rode: npm run migrate:all\n');
  } catch (error) {
    console.error('\n✗ Erro de conexão:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();