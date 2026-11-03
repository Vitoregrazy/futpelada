import React, { useState } from 'react';
import { Check, Copy, Download, FileText, Upload, X } from 'lucide-react';
import { DrawnTeam, MatchRules, Player } from '../types/pelada';
import { exportWhatsAppList, parseWhatsAppList } from '../utils/peladaLogic';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  rules: MatchRules;
  drawnTeams: DrawnTeam[];
  onImportPlayers: (newPlayers: Omit<Player, 'id'>[], replaceExisting: boolean) => void;
  onExportPdf?: () => void;
}

const SAMPLE_WHATSAPP_LIST = `Pelada Society Quarta 21h ⚽️
Local: Arena Gol de Placa

GOLEIROS:
1. Marcos Muralha (Goleiro) ⭐⭐⭐⭐⭐
2. Diego Luva 🧤 ⭐⭐⭐⭐
3. Julio Cesar (GK) ⭐⭐⭐⭐

LINHA:
1. Vitor Craque ⭐⭐⭐⭐⭐
2. Lucas Paquetá ⭐⭐⭐⭐⭐
3. Bruno Guimarães ⭐⭐⭐⭐⭐
4. Gabriel Jesus ⭐⭐⭐⭐⭐
5. Arrascaeta ⭐⭐⭐⭐⭐
6. Rafinha Canhota ⭐⭐⭐⭐
7. Pedro Queixada ⭐⭐⭐⭐
8. Thiago Silva ⭐⭐⭐⭐
9. Danilo Lateral ⭐⭐⭐⭐
10. Marquinhos Zaga ⭐⭐⭐⭐
11. Gerson Coringa ⭐⭐⭐⭐
12. Everton Cebolinha ⭐⭐⭐
13. André Volante ⭐⭐⭐
14. Caio Paulista ⭐⭐⭐
15. Léo Pereira ⭐⭐⭐`;

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  players,
  rules,
  drawnTeams,
  onImportPlayers,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [rawText, setRawText] = useState(SAMPLE_WHATSAPP_LIST);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [exportMode, setExportMode] = useState<'teams' | 'list'>('teams');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const parsedPreview = parseWhatsAppList(rawText);
  const totalParsed = parsedPreview.goalkeepers.length + parsedPreview.linePlayers.length;

  const exportedText =
    exportMode === 'teams' && drawnTeams.length > 0
      ? exportWhatsAppList(players, rules, drawnTeams)
      : exportWhatsAppList(players, rules);

  const handleConfirmImport = () => {
    const combined = [...parsedPreview.goalkeepers, ...parsedPreview.linePlayers];
    if (combined.length === 0) return;
    onImportPlayers(combined, replaceExisting);
    onClose();
  };

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="whatsapp-modal-title" className="text-xl font-bold text-slate-100">
              Importar & Exportar Lista do WhatsApp
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Cole a lista do grupo para preenchimento automático ou copie os times sorteados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela do WhatsApp"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Lista Colada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar para o Grupo
          </button>
        </div>

        {activeTab === 'import' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="whatsapp-raw-input"
                className="text-xs font-medium text-slate-300"
              >
                Cole abaixo o texto copiado do WhatsApp (com números, emojis ou cabeçalhos):
              </label>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_WHATSAPP_LIST)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap shrink-0"
              >
                Preencher Exemplo 18 Atletas
              </button>
            </div>

            <textarea
              id="whatsapp-raw-input"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Ex:&#10;GOLEIROS:&#10;1. Marcos&#10;LINHA:&#10;1. João&#10;2. Pedro"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />

            {/* Live Parsed Summary */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Detectados automaticamente:</span>
                <strong className="text-slate-100 tabular-nums">
                  {parsedPreview.linePlayers.length} na Linha
                </strong>
                <span aria-hidden="true">·</span>
                <strong className="text-amber-400 tabular-nums">
                  {parsedPreview.goalkeepers.length} Goleiros
                </strong>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                Substituir lista atual
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={totalParsed === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Importar {totalParsed} Jogadores Agora
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportMode('teams')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  exportMode === 'teams'
                    ? 'bg-slate-800 border-emerald-500/50 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Formato Times Sorteados
              </button>
              <button
                type="button"
                onClick={() => setExportMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  exportMode === 'list'
                    ? 'bg-slate-800 border-emerald-500/50 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Formato Lista de Chamada
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={exportedText}
              aria-label="Texto formatado para WhatsApp"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 font-mono"
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Baixar PDF para WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyExport}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado para o WhatsApp!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Texto Formatado
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
