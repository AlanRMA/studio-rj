
'use client';

import type { FC } from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { InvoiceEditorHandle } from '@/components/invoice-editor';
import {
  CheckCircle2,
  Database,
  Download,
  FilePlus,
  FileText,
  Search,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Invoice, SavedExport, SaveFormat } from '@/lib/types';
import type { SettingsSnapshot } from '@/lib/settings-storage';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_SAVE_FORMAT,
  INVOICE_PREVIEW_WIDTH,
  LEGACY_PLACEHOLDER_VALUES,
  MAX_SAVED_NOTES,
  STORAGE_KEYS,
} from '@/lib/constants';
import { generateId } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { calculateItemTotal } from '@/lib/meter-total';
import {
  flushPendingReceiptRecords,
  getReceiptRecord,
  saveReceiptRecord,
  searchReceiptRecords,
  type RemoteReceiptSummary,
} from '@/lib/receipt-api';
import {
  captureInvoiceImage,
  downloadDataUrl,
  downloadInvoiceJpeg,
  downloadInvoicePdf,
  generateInvoicePdfData,
} from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { InvoiceEditor } from '@/components/invoice-editor';
import { InvoicePreview } from '@/components/invoice-preview';
import { SavedExportCard } from '@/components/saved-export-card';
import { SettingsPanel } from '@/components/settings-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const createDefaultInvoice = (): Invoice => ({
  id: generateId(),
  invoiceNumber: generateId(),
  clientName: '',
  service: '',
  issueDate: format(new Date(), 'yyyy-MM-dd'),
  items: [
    {
      id: `item-${Date.now()}`,
      ref: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      total: 0,
      isRisk: true,
    },
  ],
  companyName: '',
  deliveryFee: 0,
  adjustment: 0,
});

function clearLegacyPlaceholder(value: string): string {
  return LEGACY_PLACEHOLDER_VALUES.includes(value as (typeof LEGACY_PLACEHOLDER_VALUES)[number])
    ? ''
    : value;
}

function migrateInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    clientName: [clearLegacyPlaceholder(invoice.companyName ?? ''), clearLegacyPlaceholder(invoice.clientName ?? '')].filter((value, index, values) => value && values.indexOf(value) === index).join(' / '),
    companyName: '',
    service: clearLegacyPlaceholder(invoice.service ?? ''),
    items: invoice.items.map((item) => {
      const isRisk = item.isRisk ?? true;

      return {
        ...item,
        isRisk,
        total: item.total ?? calculateItemTotal(item.quantity, item.unitPrice, isRisk),
      };
    }),
  };
}

const Page: FC = () => {
  const { toast } = useToast();
  const [logo, setLogo] = useLocalStorage<string | null>(STORAGE_KEYS.logo, null);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(STORAGE_KEYS.invoices, []);
  const [saveFormat, setSaveFormat] = useLocalStorage<SaveFormat>(
    STORAGE_KEYS.saveFormat,
    DEFAULT_SAVE_FORMAT
  );
  const [savedExports, setSavedExports] = useLocalStorage<SavedExport[]>(
    STORAGE_KEYS.savedExports,
    []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<{
    clientName: string;
    format: SaveFormat;
    serverStatus: 'saved' | 'queued' | 'disabled';
  } | null>(null);

  const isSaveLocked = isSaving || saveSuccess !== null;

  const [currentInvoice, setCurrentInvoice] = useState<Invoice>(() => createDefaultInvoice());

  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [exportToDelete, setExportToDelete] = useState<string | null>(null);
  const [databaseId, setDatabaseId] = useState('');
  const [databaseDate, setDatabaseDate] = useState('');
  const [databaseResults, setDatabaseResults] = useState<RemoteReceiptSummary[]>([]);
  const [isSearchingDatabase, setIsSearchingDatabase] = useState(false);
  const [databaseError, setDatabaseError] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const flush = () => {
      void flushPendingReceiptRecords().then((synced) => {
        if (synced > 0) {
          toast({
            title: 'Registros sincronizados',
            description: `${synced} nota(s) pendente(s) foram enviadas ao Supabase.`,
          });
        }
      });
    };

    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [toast]);

  useEffect(() => {
    if (isClient && savedExports.length > MAX_SAVED_NOTES) {
      setSavedExports((previous) => previous.slice(0, MAX_SAVED_NOTES));
    }
  }, [isClient, savedExports.length, setSavedExports]);

  useEffect(() => {
    if (isClient) {
      if (invoices.length > 0) {
        const migrated = invoices.map(migrateInvoice);
        const needsMigration = JSON.stringify(migrated) !== JSON.stringify(invoices);
        if (needsMigration) {
          setInvoices(migrated);
        }
        const currentExists = migrated.some((inv) => inv.id === currentInvoice.id);
        if (!currentExists) {
          setCurrentInvoice(migrated[0]);
        }
      } else {
        const initialInvoice = createDefaultInvoice();
        setCurrentInvoice(initialInvoice);
        setInvoices([initialInvoice]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  const previewRef = useRef<HTMLDivElement>(null);
  const previewScreenRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<InvoiceEditorHandle>(null);

  useEffect(() => {
    if (!isClient || !previewScreenRef.current) return;

    const container = previewScreenRef.current;
    const updatePreviewScale = () => {
      const availableWidth = container.clientWidth;
      const isDesktopLayout = window.matchMedia('(min-width: 1280px)').matches;
      const scale = isDesktopLayout
        ? Math.max(0.5, (availableWidth - 8) / INVOICE_PREVIEW_WIDTH)
        : 1;

      container.style.setProperty('--invoice-preview-scale', scale.toFixed(4));
    };

    updatePreviewScale();
    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [isClient]);

  const handleNewInvoice = () => {
    const newInvoice = createDefaultInvoice();
    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    setCurrentInvoice(newInvoice);
    toast({
      title: 'Nova Nota',
      description: 'Nova nota de pagamento criada.',
    });
    setActiveTab('editor');
  };

  const handleInvoiceChange = useCallback(
    (updatedInvoice: Invoice) => {
      const finalInvoice = {
        ...updatedInvoice,
        issueDate: format(new Date(), 'yyyy-MM-dd'),
      };

      setCurrentInvoice(finalInvoice);

      setInvoices((prevInvoices) => {
        const existingIndex = prevInvoices.findIndex((inv) => inv.id === finalInvoice.id);
        if (existingIndex > -1) {
          const updatedInvoices = [...prevInvoices];
          updatedInvoices[existingIndex] = finalInvoice;
          return updatedInvoices;
        }
        return [finalInvoice, ...prevInvoices];
      });
    },
    [setInvoices]
  );

  const getExportFilename = useCallback(
    (clientName: string, format: SaveFormat) => {
      const base = `nota-${clientName.replace(/\s/g, '_') || 'nota'}`;
      return format === 'pdf' ? `${base}.pdf` : `${base}.jpeg`;
    },
    []
  );

  const getReceiptLabel = useCallback((invoice: Invoice) => {
    return invoice.clientName || invoice.companyName || 'nota';
  }, []);

  const handleDismissSaveSuccess = useCallback(() => {
    setSaveSuccess(null);
    setActiveTab('notas');
  }, []);

  const handleSaveExport = useCallback(
    async (options: { downloadFormat: SaveFormat }) => {
      const node = previewRef.current;
      if (!node || isSaveLocked) return;

      const validation = await editorRef.current?.validateForSave();
      if (!validation?.ok) {
        toast({
          variant: 'destructive',
          title: 'Recibo incompleto',
          description: validation?.message ?? 'Preencha todos os campos obrigatórios.',
        });
        return;
      }

      const invoice = validation.invoice;
      const receiptLabel = getReceiptLabel(invoice);

      setIsSaving(true);
      try {
        const format = saveFormat;
        let data: string;

        if (format === 'pdf') {
          const result = await generateInvoicePdfData(node);
          data = result.dataUrl;
        } else {
          const result = await captureInvoiceImage(node);
          data = result.dataUrl;
        }

        const saved: SavedExport = {
          id: generateId(),
          invoiceId: invoice.id,
          invoice: structuredClone(invoice),
          clientName: receiptLabel,
          invoiceNumber: invoice.invoiceNumber,
          format,
          data,
          createdAt: new Date().toISOString(),
        };

        setSavedExports((previous) => [saved, ...previous].slice(0, MAX_SAVED_NOTES));
        const serverStatus = await saveReceiptRecord(invoice, saved.id, format);

        const filename = getExportFilename(receiptLabel, options.downloadFormat);
        if (options.downloadFormat === format) {
          downloadDataUrl(data, filename);
        } else if (options.downloadFormat === 'pdf') {
          await downloadInvoicePdf(node, filename);
        } else {
          await downloadInvoiceJpeg(node, filename);
        }

        setSaveSuccess({
          clientName: receiptLabel,
          format,
          serverStatus,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Falha ao salvar',
          description: error instanceof DOMException && error.name === 'QuotaExceededError'
            ? 'O armazenamento do navegador está cheio. Baixe e remova notas antigas para liberar espaço.'
            : 'Não foi possível gerar e salvar o arquivo.',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [getExportFilename, getReceiptLabel, isSaveLocked, saveFormat, setSavedExports, toast]
  );

  const handleSettingsSaved = useCallback(
    (snapshot: SettingsSnapshot) => {
      setLogo(snapshot.logo);
      setSaveFormat(snapshot.saveFormat);
    },
    [setLogo, setSaveFormat]
  );

  const handleClearInvoices = () => {
    const newInvoice = createDefaultInvoice();
    setInvoices([newInvoice]);
    setCurrentInvoice(newInvoice);
    setActiveTab('editor');
    toast({
      title: 'Cache limpo',
      description: 'Todos os rascunhos foram removidos do navegador.',
    });
  };

  const handleClearSavedExports = () => {
    setSavedExports([]);
    toast({
      title: 'Notas apagadas',
      description: 'Todos os arquivos salvos foram removidos de Minhas Notas.',
    });
  };

  const handleDownloadSavedExport = (saved: SavedExport) => {
    const link = document.createElement('a');
    link.href = saved.data;
    link.download = getExportFilename(saved.clientName, saved.format);
    link.click();
  };

  const handleOpenSavedExport = (saved: SavedExport) => {
    const source = saved.invoice ?? invoices.find((invoice) => invoice.id === saved.invoiceId);
    if (!source) {
      toast({
        variant: 'destructive',
        title: 'Dados da nota indisponíveis',
        description: 'O arquivo antigo pode ser baixado, mas seu rascunho não está mais neste navegador.',
      });
      return;
    }

    const migrated = migrateInvoice(source);
    const copy: Invoice = {
      ...structuredClone(migrated),
      id: generateId(),
      invoiceNumber: generateId(),
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      items: migrated.items.map((item) => ({ ...structuredClone(item), id: generateId() })),
    };

    setInvoices((previous) => [copy, ...previous]);
    setCurrentInvoice(copy);
    setActiveTab('editor');
    toast({
      title: 'Cópia aberta no editor',
      description: 'Edite a nota e gere um novo JPEG ou PDF. A nota original foi preservada.',
    });
  };

  const handleDeleteSavedExport = (id: string) => {
    setSavedExports((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: 'Nota removida',
      description: 'Arquivo removido de Minhas Notas.',
    });
    setExportToDelete(null);
  };

  const filteredSavedExports = savedExports.filter(
    (saved) =>
      saved.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saved.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchDatabase = async () => {
    if (!databaseId.trim() && !databaseDate) {
      setDatabaseError('Informe um ID ou uma data para pesquisar.');
      return;
    }

    setDatabaseError('');
    setIsSearchingDatabase(true);
    try {
      const results = await searchReceiptRecords({
        id: databaseId,
        date: databaseDate,
        limit: 100,
      });
      setDatabaseResults(results);
      if (results.length === 0) {
        setDatabaseError('Nenhum registro encontrado com esse filtro.');
      }
    } catch (error) {
      setDatabaseResults([]);
      setDatabaseError(error instanceof Error ? error.message : 'Não foi possível consultar o banco.');
    } finally {
      setIsSearchingDatabase(false);
    }
  };

  const handleOpenDatabaseReceipt = async (record: RemoteReceiptSummary) => {
    setDatabaseError('');
    setIsSearchingDatabase(true);
    try {
      const recovered = migrateInvoice(await getReceiptRecord(record.event_id));
      setInvoices((previous) => {
        const withoutRecovered = previous.filter((invoice) => invoice.id !== recovered.id);
        return [recovered, ...withoutRecovered];
      });
      setCurrentInvoice(recovered);
      setActiveTab('editor');
      toast({
        title: 'Nota reconstruída',
        description: `Registro ${record.event_id} carregado com seus dados originais.`,
      });
    } catch (error) {
      setDatabaseError(error instanceof Error ? error.message : 'Não foi possível abrir o registro.');
    } finally {
      setIsSearchingDatabase(false);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <header className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary text-center">
          Gerador de Nota de Pagamento
        </h1>
        <Button onClick={handleNewInvoice}>
          <FilePlus /> Nova Nota
        </Button>
      </header>

      <main className="p-2 sm:p-4 max-w-[100vw] overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="notas">Minhas Notas</TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="overflow-x-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 min-w-0">
              <div className="min-w-0">
                <InvoiceEditor
                  ref={editorRef}
                  key={currentInvoice.id}
                  invoice={currentInvoice}
                  logo={logo}
                  onLogoChange={setLogo}
                  onInvoiceChange={handleInvoiceChange}
                />
              </div>
              <div id="invoice-preview-container" className="w-full min-w-0 flex flex-col items-center">
                <div
                  ref={previewScreenRef}
                  className="invoice-preview-screen w-full flex justify-center overflow-x-auto pb-2"
                >
                  <InvoicePreview ref={previewRef} invoice={currentInvoice} logo={logo} />
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4 no-print w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSaveExport({ downloadFormat: 'jpeg' })}
                    disabled={isSaveLocked}
                    className="bg-green-600 text-white hover:bg-green-700 hover:text-white disabled:opacity-70"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Gerar JPEG'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSaveExport({ downloadFormat: 'pdf' })}
                    disabled={isSaveLocked}
                    className="bg-green-600 text-white hover:bg-green-700 hover:text-white disabled:opacity-70"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Gerar PDF'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notas">
            <Card className="mb-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h2 className="font-semibold">Buscar no banco de dados</h2>
                    <p className="text-sm text-muted-foreground">
                      Pesquise pelo ID exato, pelo início da referência ou pela data de emissão.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-3">
                  <Input
                    placeholder="ID ou início da Ref."
                    value={databaseId}
                    onChange={(event) => setDatabaseId(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleSearchDatabase();
                    }}
                  />
                  <Input
                    type="date"
                    aria-label="Data da nota no banco"
                    value={databaseDate}
                    onChange={(event) => setDatabaseDate(event.target.value)}
                  />
                  <Button
                    onClick={() => void handleSearchDatabase()}
                    disabled={isSearchingDatabase}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isSearchingDatabase ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                {databaseError ? (
                  <p className="text-sm text-destructive">{databaseError}</p>
                ) : null}
                {databaseResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {databaseResults.length} registro(s) encontrado(s)
                    </p>
                    {databaseResults.map((record) => (
                      <div
                        key={record.event_id}
                        className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {record.client_name || record.company_name || 'Cliente'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            Ref: {record.invoice_number} · ID: {record.event_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {String(record.issue_date).slice(0, 10).split('-').reverse().join('/')} ·{' '}
                            {formatCurrency(Number(record.grand_total))}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleOpenDatabaseReceipt(record)}
                          disabled={isSearchingDatabase}
                        >
                          Reconstruir nota
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar os 5 arquivos recentes deste navegador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[70vh]">
              <div className="space-y-4 pr-2">
                {filteredSavedExports.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <p>Nenhuma nota salva ainda.</p>
                      <p className="text-sm mt-2">
                        Use <strong>Gerar JPEG</strong> ou <strong>Gerar PDF</strong> no editor para guardar aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredSavedExports.map((saved) => (
                    <SavedExportCard
                      key={saved.id}
                      saved={saved}
                      onOpen={handleOpenSavedExport}
                      onDownload={handleDownloadSavedExport}
                      onDelete={(id) => setExportToDelete(id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config">
            <SettingsPanel
              invoices={invoices}
              savedExports={savedExports}
              onClearInvoices={handleClearInvoices}
              onClearSavedExports={handleClearSavedExports}
              onSettingsSaved={handleSettingsSaved}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog
        open={saveSuccess !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleDismissSaveSuccess();
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" />
              <div>
                <AlertDialogTitle className="text-xl">Salvo com sucesso!</AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-base">
                  O recibo de <strong>{saveSuccess?.clientName}</strong> foi salvo como{' '}
                  <strong>{saveSuccess?.format.toUpperCase()}</strong> em Minhas Notas.
                  {saveSuccess?.serverStatus === 'saved'
                    ? ' Os dados também foram registrados no Supabase.'
                    : saveSuccess?.serverStatus === 'queued'
                      ? ' O envio ao Supabase ficou na fila e será repetido automaticamente.'
                      : ' Configure o Supabase para manter o registro no banco de dados.'}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleDismissSaveSuccess}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              Ver Minhas Notas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={exportToDelete !== null}
        onOpenChange={(isOpen) => !isOpen && setExportToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nota salva?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo JPEG/PDF será removido permanentemente de Minhas Notas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExportToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => exportToDelete && handleDeleteSavedExport(exportToDelete)}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Page;
