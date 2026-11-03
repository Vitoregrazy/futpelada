import React, { useState } from 'react';
import { Check, Copy, Link2, Plus, Share2, Users, Wifi } from 'lucide-react';
import { Player, RoomState } from '../types/pelada';

interface LiveRoomViewProps {
  roomCode: string;
  userName: string;
  isConnected: boolean;
  roomState: RoomState | null;
  onJoinRoom: (code: string, userName: string) => void;
  onCreateNewPrivateRoom: (roomName: string, hostName: string) => Promise<void>;
  onAddGuestPlayerToRoom: (player: Player) => void;
  onToggleRoomPlayerPresence: (playerId: string) => void;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  roomCode,
  userName,
  isConnected,
  roomState,
  onJoinRoom,
  onCreateNewPrivateRoom,
  onAddGuestPlayerToRoom,
  onToggleRoomPlayerPresence,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState(roomCode);
  const [joinNameInput, setJoinNameInput] = useState(userName);
  const [newRoomTitle, setNewRoomTitle] = useState('Pelada Privada Quinta 20h');
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [guestIsGk, setGuestIsGk] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const shareUrl = `${window.location.origin}/?room=${roomCode}`;

  const handleCopyInviteLink = async () => {
    const inviteMessage = `⚽️ Entre na nossa Sala Ao Vivo no PeladaPro!\nCódigo da Sala: ${roomCode}\nLink direto: ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleGuestAddSelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestPlayerName.trim()) return;
    const newPlayer: Player = {
      id: `p-live-${Date.now()}`,
      name: guestPlayerName.trim(),
      isGoalkeeper: guestIsGk,
      rating: 4,
      confirmed: true,
    };
    onAddGuestPlayerToRoom(newPlayer);
    setGuestPlayerName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Active Live Room & Invite Panel */}
      <div className="lg:col-span-7 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Wifi
                  className={`w-3.5 h-3.5 ${
                    isConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <span>
                  {isConnected
                    ? 'Sincronizado via WebSocket em Tempo Real'
                    : 'Conectando à sala...'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-200">Sala {roomCode}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-1">
                {roomState?.name || `Arena Privada ${roomCode}`}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4" />
                  Convite Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Convidar Amigos (Link + Código)
                </>
              )}
            </button>
          </div>

          {/* Invite Link Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-400">
                Link Direto para Amigos Acompanharem o Sorteio e Placar Ao Vivo:
              </div>
              <div className="text-xs font-mono text-emerald-400 truncate mt-0.5">
                {shareUrl}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Código {roomCode}
            </button>
          </div>

          {/* Real-time Guest Presence Confirmation Form */}
          <form
            onSubmit={handleGuestAddSelf}
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-200">
              Confirmar Presença na Lista Ao Vivo (Visível para todos na sala):
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Nome do amigo ou convidado..."
                aria-label="Nome do jogador para confirmar presença na sala"
                value={guestPlayerName}
                onChange={(e) => setGuestPlayerName(e.target.value)}
                className="flex-1 min-w-[180px] px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-300 px-2 py-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={guestIsGk}
                  onChange={(e) => setGuestIsGk(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
                Sou Goleiro
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Entrar na Lista
              </button>
            </div>
          </form>

          {/* Live Room Players Check-in List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Jogadores Sincronizados na Sala</span>
              <span className="font-mono tabular-nums">
                {roomState?.players.filter((p) => p.confirmed).length || 0} confirmados
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/70 bg-slate-950 border border-slate-800 rounded-xl px-4">
              {(roomState?.players || []).map((p) => (
                <div
                  key={p.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-100">{p.name}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">
                      {p.isGoalkeeper ? 'Goleiro' : 'Linha'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleRoomPlayerPresence(p.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      p.confirmed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {p.confirmed ? 'Confirmado' : 'Ausente'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Right 5 Cols: Switch / Create Room & Real-Time Activity Stream */}
      <div className="lg:col-span-5 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-400" />
            Entrar em Outra Sala ou Criar Nova
          </h3>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="live-your-name"
                className="block text-xs text-slate-400 mb-1"
              >
                Seu Nome na Sala
              </label>
              <input
                id="live-your-name"
                type="text"
                value={joinNameInput}
                onChange={(e) => setJoinNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor="live-room-code"
                  className="block text-xs text-slate-400 mb-1"
                >
                  Código da Sala Privada
                </label>
                <input
                  id="live-room-code"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ex: SOC-10"
                  className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={() => onJoinRoom(joinCodeInput, joinNameInput)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Conectar à Sala
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label
              htmlFor="new-private-room-title"
              className="block text-xs text-slate-400"
            >
              Ou crie uma sala privada exclusiva para hoje:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="new-private-room-title"
                type="text"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
              <button
                type="button"
                onClick={() => onCreateNewPrivateRoom(newRoomTitle, joinNameInput)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Gerar Nova Sala
              </button>
            </div>
          </div>
        </section>

        {/* Connected Participants & Live Activity Feed */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Amigos Online ({roomState?.participants.length || 1})
            </h3>
            <span className="text-xs text-slate-400">Tempo Real</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(roomState?.participants || []).map((part) => (
              <span
                key={part.clientId}
                className="text-xs text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg"
              >
                {part.name} {part.role === 'host' ? '· Organizador' : ''}
              </span>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs font-medium text-slate-400">
              Feed de Eventos Sincronizados
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
              {(roomState?.activityFeed || []).map((act) => (
                <div
                  key={act.id}
                  className="text-slate-300 py-1.5 border-b border-slate-800/60 flex items-center justify-between gap-2"
                >
                  <span>{act.text}</span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
