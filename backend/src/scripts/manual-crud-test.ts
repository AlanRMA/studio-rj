import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import {
  checkPostgresConnection,
  closePostgres,
  deleteReceipt,
  getReceipt,
  listReceipts,
  updateReceiptClientName,
} from '../db/postgres.js';
import { migrate } from './migrate.js';

const API = `http://localhost:${config.port}`;
const KEY = config.ingestApiKey;

function log(step: string, detail?: unknown) {
  console.log(`\n✓ ${step}`);
  if (detail !== undefined) console.log(JSON.stringify(detail, null, 2));
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  throw new Error(message);
}

function buildPayload(eventId: string) {
  const receiptId = randomUUID();
  const invoiceNumber = randomUUID();

  return {
    source_system: 'studio-rm-james' as const,
    event_type: 'receipt.saved' as const,
    event_id: eventId,
    event_at: new Date().toISOString(),
    export: {
      id: eventId,
      format: 'jpeg' as const,
      file_mime_type: 'image/jpeg',
    },
    receipt: {
      id: receiptId,
      invoice_number: invoiceNumber,
      client_name: 'Cliente Teste CRUD',
      service_type: 'Serviço Prestado',
      issue_date: new Date().toISOString().slice(0, 10),
      company_name: null,
      emitter: {
        document_type: 'cpf' as const,
        legal_name: 'James Mendes da Silva',
        document_number: '622.388.163-15',
      },
      delivery_fee: 10,
      adjustment: -5,
      lines: [
        {
          line_id: 'item-test-1',
          line_order: 1,
          ref: 'A1',
          descricao: 'Instalação de rodapé',
          quantity: 2,
          unit_price: 75,
          is_risk: false,
          line_total: 150,
        },
      ],
      totals: {
        subtotal: 150,
        delivery_fee: 10,
        adjustment: -5,
        grand_total: 155,
        item_count: 1,
      },
    },
  };
}

async function apiCreate(eventId: string) {
  const response = await fetch(`${API}/api/v1/ingest/james/receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
      'X-Idempotency-Key': eventId,
    },
    body: JSON.stringify(buildPayload(eventId)),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`CREATE falhou (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  console.log('=== Teste manual CRUD — James / Supabase ===\n');

  if (!config.databaseUrl) {
    fail(
      'DATABASE_URL não configurada.\n' +
        'Cole a mesma DATABASE_URL do backend da Rosania em james/backend/.env'
    );
  }

  log('1. Migration');
  await migrate();

  const connected = await checkPostgresConnection();
  if (!connected) {
    fail('Não conectou ao Postgres. Verifique DATABASE_URL e senha no Supabase.');
  }
  log('2. Conexão Postgres OK', { table: config.receiptsTable });

  const eventId = randomUUID();
  log('3. CREATE via API (POST /james/receipt)', { event_id: eventId });

  let serverRunning = true;
  try {
    const health = await fetch(`${API}/api/v1/ingest/health`);
    if (!health.ok) serverRunning = false;
  } catch {
    serverRunning = false;
  }

  if (!serverRunning) {
    fail(
      `Backend não está rodando em ${API}.\n` +
        'Abra outro terminal e rode: npm run dev'
    );
  }

  const created = await apiCreate(eventId);
  log('CREATE resposta', created);

  const readOne = await getReceipt(eventId);
  if (!readOne) fail('READ falhou — recibo não encontrado após CREATE');
  log('4. READ um recibo (SQL direto)', {
    event_id: readOne.event_id,
    responsavel: readOne.responsavel,
    client_name: readOne.client_name,
    grand_total: readOne.grand_total,
    lines: readOne.lines,
  });

  const list = await listReceipts(5);
  log('5. READ lista (últimos 5)', list);

  const updated = await updateReceiptClientName(eventId, 'Cliente Atualizado CRUD');
  if (!updated) fail('UPDATE falhou');
  log('6. UPDATE client_name', updated);

  const deleted = await deleteReceipt(eventId);
  if (!deleted) fail('DELETE falhou');
  log('7. DELETE', { event_id: eventId });

  const gone = await getReceipt(eventId);
  if (gone) fail('DELETE não removeu o registro');
  log('8. Verificação pós-DELETE — recibo removido');

  console.log('\n=== Todos os testes passaram! Pode conectar o frontend James. ===\n');
  await closePostgres();
}

main().catch((error) => {
  console.error('\n✗ Erro:', error);
  process.exit(1);
});