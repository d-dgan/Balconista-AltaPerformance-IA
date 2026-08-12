import { useState, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Check,
    AlertCircle,
    X,
    Download,
    Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const REQUIRED_COLUMNS = ['Nome'] as const;
const OPTIONAL_COLUMNS = ['DDI', 'DDD', 'WhatsApp', 'Instagram', 'MessengerID'] as const;
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;

type ColumnHeader = typeof ALL_COLUMNS[number];

interface ImportContactsProps {
    onClose: () => void;
}

interface ParsedRow extends Record<string, any> {
    Nome: string;
    DDI?: string;
    DDD?: string;
    WhatsApp?: string;
    Instagram?: string;
    MessengerID?: string;
}

export default function ImportContacts({ onClose }: ImportContactsProps) {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[] | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isValid, setIsValid] = useState(false);
    const [importing, setImporting] = useState(false);
    const [imported, setImported] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setFile(f);
        setErrors([]);
        setIsValid(false);
        setParsedData(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) parseCSV(text);
        };
        reader.readAsText(f);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
            setErrors([t('O arquivo está vazio ou não contém dados.', 'The file is empty or contains no data.')]);
            return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '')) as string[];
        const missingCols = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

        if (missingCols.length > 0) {
            setErrors([`${t('Colunas obrigatórias ausentes: ', 'Missing required columns: ')}${missingCols.join(', ')}`]);
            return;
        }

        const data: ParsedRow[] = [];
        const rowErrors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
                if (ALL_COLUMNS.includes(h as any)) {
                    row[h] = values[idx] || '';
                }
            });

            if (!row.Nome) rowErrors.push(`${t('Linha', 'Line')} ${i + 1}: ${t('Nome vazio', 'Empty name')}`);
            if (!row.WhatsApp && !row.Instagram && !row.MessengerID) {
                rowErrors.push(`${t('Linha', 'Line')} ${i + 1}: ${t('Pelo menos um canal (WhatsApp, Instagram ou MessengerID) é obrigatório', 'At least one channel (WhatsApp, Instagram or MessengerID) is required')}`);
            }

            data.push(row as ParsedRow);
        }

        if (rowErrors.length > 0) {
            setErrors(rowErrors.slice(0, 5));
        }

        setParsedData(data);
        setIsValid(rowErrors.length === 0);
    };

    const handleImport = async () => {
        setImporting(true);
        // Simulate API call
        await new Promise((r) => setTimeout(r, 2000));
        setImporting(false);
        setImported(true);
    };

    const downloadTemplate = () => {
        const csv = 'Nome,DDI,DDD,WhatsApp,Instagram,MessengerID\n"Maria Silva","55","11","999876543","",""\n"João Insta","","","","@joao.insta",""\n"Ana Messenger","","","","","1234567890"';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_contatos.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-lg glass-panel rounded-4xl border border-white/10 shadow-3xl overflow-hidden scale-in">
                {/* Decoration */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl" />

                <div className="relative p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                <Upload size={20} className="text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('Importar Contatos', 'Import Contacts')}</h3>
                                <p className="text-xs text-white/40 font-medium">{t('Sincronize sua base via CSV', 'Sync your base via CSV')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all text-white/30 hover:text-white cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>

                    {!imported ? (
                        <div className="space-y-6">
                            {/* Template Download */}
                            <button
                                onClick={downloadTemplate}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-primary-400 hover:bg-white/10 hover:border-primary-500/30 transition-all cursor-pointer"
                            >
                                <Download size={14} />
                                {t('Baixar Modelo de Exemplo', 'Download Example Template')}
                            </button>

                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative group border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${file ? 'border-primary-500/50 bg-primary-500/10' : 'border-white/10 hover:border-primary-500/30 hover:bg-white/5'}`}
                            >
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-white/3 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet size={32} className={`transition-colors ${file ? 'text-primary-400' : 'opacity-20'}`} />
                                    </div>
                                    <p className="text-sm font-bold text-white mb-1">
                                        {file ? file.name : t('Selecione seu arquivo CSV', 'Select your CSV file')}
                                    </p>
                                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-tighter">
                                        Nome • WhatsApp • Instagram • MessengerID
                                    </p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Validation Results */}
                            {errors.length > 0 && (
                                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-shake">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle size={16} className="text-rose-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{t('Erros Detectados', 'Errors Detected')}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {errors.map((err, i) => (
                                            <p key={i} className="text-[11px] text-rose-300/70 font-medium flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-rose-500/40" />
                                                {err}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            {parsedData && isValid && (
                                <div className="space-y-3 fade-in">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Check size={16} className="text-emerald-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                                                {t(`${parsedData.length} contatos validados`, `${parsedData.length} contacts validated`)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                                        <div className="max-h-32 overflow-y-auto scrollbar-thin">
                                            <table className="w-full text-left">
                                                <thead className="sticky top-0 bg-[#0c0c11] border-b border-white/5">
                                                    <tr>
                                                        <th className="px-4 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">{t('Nome', 'Name')}</th>
                                                        <th className="px-4 py-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">{t('WhatsApp', 'WhatsApp')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {parsedData.slice(0, 3).map((row, i) => (
                                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-2 text-[11px] font-medium text-white/80">{row.Nome}</td>
                                                            <td className="px-4 py-2 text-[11px] font-mono text-white/40">{row.WhatsApp || row.Instagram || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Import Button */}
                            <button
                                onClick={handleImport}
                                disabled={!isValid || importing}
                                className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${isValid && !importing
                                    ? 'bg-primary-500 text-white hover:bg-primary-600 cursor-pointer shadow-primary-500/25 border border-primary-400/20'
                                    : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                                    }`}
                            >
                                {importing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        {t('Processando...', 'Processing...')}
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        {t('Iniciar Importação', 'Start Import')}
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Success State */
                        <div className="text-center py-10 fade-in">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                                <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <Check size={40} className="text-emerald-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{t('Sucesso!', 'Success!')}</h3>
                            <p className="text-sm text-white/40 font-medium mb-8">
                                <span className="text-emerald-400">{parsedData?.length}</span> {t('contatos foram adicionados à sua base de dados.', 'contacts were added to your database.')}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-widest border border-white/10 transition-all cursor-pointer"
                            >
                                {t('Fechar Janela', 'Close Window')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
