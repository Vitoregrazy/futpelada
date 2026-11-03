import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Crown,
  Download,
  EyeOff,
  FileSpreadsheet,
  Lock,
  Play,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Star,
  Trash2,
  Trophy,
  Users,
  Wifi,
} from 'lucide-react';
import {
  Championship,
  CoinTossState,
  DrawnTeam,
  LiveMatchState,
  MatchRules,
  Player,
  RiggingConfig,
  RoomState,
} from './types/pelada';
import {
  createChampionshipFromTeams,
  DEFAULT_RULES,
  drawTeams,
  evaluateMatchStatus,
  INITIAL_PLAYERS,
  rotateKingOfTheCourt,
} from './utils/peladaLogic';
import { exportPeladaPdf } from './utils/pdfExport';
import { TacticalPitchCard } from './components/TacticalPitchCard';
import { WhatsAppModal } from './components/WhatsAppModal';
import { MatchRefereeView } from './components/MatchRefereeView';
import { ChampionshipView } from './components/ChampionshipView';
import { LiveRoomView } from './components/LiveRoomView';

type ActiveTab = 'draw' | 'match' | 'tournament' | 'live';

const FORMATION_PRESETS = [
  { label: '3+1 (Mini Quadra)', line: 3, gk: 1 },
  { label: '4+1 (Futsal)', line: 4, gk: 1 },
  { label: '5+1 (Society)', line: 5, gk: 1 },
  { label: '6+1 (Society Maior)', line: 6, gk: 1 },
  { label: '7+1 (Fut7)', line: 7, gk: 1 },
  { label: '10+1 (Campo Oficial)', line: 10, gk: 1 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('draw');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_RULES);

  // Discreet Rigging ("Modo Panela Invisível")
  const [rigging, setRigging] = useState<RiggingConfig>({
    enabled: false,
    mode: 'top_stars',
    pinnedTeammateIds: ['p-5', 'p-6'],
    excludedRivalIds: [],
    camouflageStars: true,
  });
  const [showDiscreetPanel, setShowDiscreetPanel] = useState(false);

  // Initial drawn teams
  const [drawnTeams, setDrawnTeams] = useState<DrawnTeam[]>(() =>
    drawTeams(
      INITIAL_PLAYERS,
      DEFAULT_RULES,
      { enabled: false, mode: 'balanced', pinnedTeammateIds: [], excludedRivalIds: [] },
      () => 0.42
    )
  );

  // New Player Form State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerIsGk, setNewPlayerIsGk] = useState(false);
  const [newPlayerRating, setNewPlayerRating] = useState(4);
  const [rosterFilter, setRosterFilter] = useState<'all' | 'line' | 'gk'>('all');

  // WhatsApp Modal & PDF Export Feedback
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);

  // Coin Toss State
  const [coinToss, setCoinToss] = useState<CoinTossState>({
    result: null,
    callerTeamId: 'team-1',
    callerChoice: 'cara',
    winnerTeamId: null,
    ballTeamId: null,
    fieldSideTeamA: 'Lado Norte (Esquerdo)',
    fieldSideTeamB: 'Lado Sul (Direito)',
    flippedAt: null,
  });

  // Live Match Timer & Scoreboard State
  const [liveMatch, setLiveMatch] = useState<LiveMatchState>({
    isRunning: false,
    remainingSeconds: DEFAULT_RULES.durationMinutes * 60,
    configuredMinutes: DEFAULT_RULES.durationMinutes,
    addedStoppageMinutes: 0,
    scoreA: 0,
    scoreB: 0,
    teamAId: 'team-1',
    teamBId: 'team-2',
    events: [],
    winnerTeamId: null,
    endedReason: null,
  });

  // Championship State
  const [championship, setChampionship] = useState<Championship | null>(() =>
    createChampionshipFromTeams('Copa Society dos Amigos', 'pontos_corridos', drawnTeams)
  );

  // Real-Time WebSocket Room State
  const initialUrlRoom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room')
      : null;
  const [roomCode, setRoomCode] = useState<string>(
    initialUrlRoom ? initialUrlRoom.toUpperCase() : 'SOC-10'
  );
  const [userName, setUserName] = useState<string>('Vitor (Organizador)');
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isApplyingRemoteRef = useRef(false);

  // Connect to WebSocket Room
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsWsConnected(true);
          socket?.send(
            JSON.stringify({
              type: 'room:join',
              roomCode,
              userName,
              role: 'host',
            })
          );
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'room:state' && data.room) {
              isApplyingRemoteRef.current = true;
              const r: RoomState = data.room;
              setRoomState(r);
              setPlayers(r.players);
              setRules(r.rules);
              setDrawnTeams(r.drawnTeams);
              setCoinToss(r.coinToss);
              setLiveMatch(r.liveMatch);
              if (r.championship) setChampionship(r.championship);
              setTimeout(() => {
                isApplyingRemoteRef.current = false;
              }, 40);
            }
          } catch {
            // ignore malformed frame
          }
        };

        socket.onclose = () => {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        setIsWsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [roomCode]);

  const broadcastSync = (
    partial: Partial<{
      players: Player[];
      rules: MatchRules;
      drawnTeams: DrawnTeam[];
      coinToss: CoinTossState;
      liveMatch: LiveMatchState;
      championship: Championship | null;
    }>,
    activityText?: string
  ) => {
    if (isApplyingRemoteRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:sync_full',
          payload: {
            players: partial.players ?? players,
            rules: partial.rules ?? rules,
            drawnTeams: partial.drawnTeams ?? drawnTeams,
            coinToss: partial.coinToss ?? coinToss,
            liveMatch: partial.liveMatch ?? liveMatch,
            championship:
              partial.championship !== undefined ? partial.championship : championship,
          },
          activityText,
        })
      );
    }
  };

  // Match Countdown Interval
  useEffect(() => {
    if (!liveMatch.isRunning) return;
    const interval = setInterval(() => {
      setLiveMatch((prev) => {
        if (!prev.isRunning) return prev;
        const nextSec = Math.max(0, prev.remainingSeconds - 1);
        const evalStatus = evaluateMatchStatus(
          prev.scoreA,
          prev.scoreB,
          nextSec,
          rules.goalLimit
        );

        if (evalStatus.isFinished) {
          return {
            ...prev,
            remainingSeconds: nextSec,
            isRunning: false,
            endedReason: evalStatus.reason,
          };
        }
        return {
          ...prev,
          remainingSeconds: nextSec,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [liveMatch.isRunning, rules.goalLimit]);

  // Handlers
  const handleExecuteDraw = () => {
    const nextTeams = drawTeams(players, rules, rigging);
    setDrawnTeams(nextTeams);

    const nextMatch: LiveMatchState = {
      ...liveMatch,
      isRunning: false,
      remainingSeconds: rules.durationMinutes * 60,
      configuredMinutes: rules.durationMinutes,
      addedStoppageMinutes: 0,
      scoreA: 0,
      scoreB: 0,
      teamAId: nextTeams[0]?.id || 'team-1',
      teamBId: nextTeams[1]?.id || 'team-2',
      winnerTeamId: null,
      endedReason: null,
    };
    setLiveMatch(nextMatch);

    const nextChamp = createChampionshipFromTeams(
      championship?.name || 'Copa Society dos Amigos',
      championship?.format || 'pontos_corridos',
      nextTeams
    );
    setChampionship(nextChamp);

    // Automatically hide the discreet rigging drawer after drawing so no one sees it
    setShowDiscreetPanel(false);

    broadcastSync(
      {
        drawnTeams: nextTeams,
        liveMatch: nextMatch,
        championship: nextChamp,
      },
      `Novo sorteio realizado (${rules.linePlayersPerTeam}+${rules.goalkeepersPerTeam})`
    );
  };

  const handleUpdateRules = (nextRules: MatchRules) => {
    setRules(nextRules);
    const updatedTeams = drawTeams(players, nextRules, rigging);
    setDrawnTeams(updatedTeams);
    const nextMatch: LiveMatchState = {
      ...liveMatch,
      configuredMinutes: nextRules.durationMinutes,
      remainingSeconds: liveMatch.isRunning
        ? liveMatch.remainingSeconds
        : nextRules.durationMinutes * 60,
      teamAId: updatedTeams[0]?.id || 'team-1',
      teamBId: updatedTeams[1]?.id || 'team-2',
    };
    setLiveMatch(nextMatch);
    broadcastSync(
      { rules: nextRules, drawnTeams: updatedTeams, liveMatch: nextMatch },
      `Regras alteradas: ${nextRules.linePlayersPerTeam} na linha + ${nextRules.goalkeepersPerTeam} no gol (${nextRules.durationMinutes} min)`
    );
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const created: Player = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      isGoalkeeper: newPlayerIsGk,
      rating: newPlayerRating,
      confirmed: true,
    };
    const nextPlayers = [created, ...players];
    setPlayers(nextPlayers);
    setNewPlayerName('');
    broadcastSync(
      { players: nextPlayers },
      `${created.name} adicionado à lista (${created.isGoalkeeper ? 'Goleiro' : 'Linha'})`
    );
  };

  const handleImportWhatsAppPlayers = (
    imported: Omit<Player, 'id'>[],
    replaceExisting: boolean
  ) => {
    const withIds: Player[] = imported.map((item, idx) => ({
      ...item,
      id: `p-wa-${Date.now()}-${idx}`,
      isHost: idx === 0 && !item.isGoalkeeper,
    }));

    const nextPlayers = replaceExisting ? withIds : [...players, ...withIds];
    setPlayers(nextPlayers);
    const nextTeams = drawTeams(nextPlayers, rules, rigging);
    setDrawnTeams(nextTeams);
    broadcastSync(
      { players: nextPlayers, drawnTeams: nextTeams },
      `Lista do WhatsApp importada (${withIds.length} atletas)`
    );
  };

  const handleToggleHostPlayer = (playerId: string) => {
    const nextPlayers = players.map((p) => ({
      ...p,
      isHost: p.id === playerId,
    }));
    setPlayers(nextPlayers);
  };

  const handleTogglePinTeammate = (playerId: string) => {
    setRigging((prev) => {
      const exists = prev.pinnedTeammateIds.includes(playerId);
      const pinnedTeammateIds = exists
        ? prev.pinnedTeammateIds.filter((id) => id !== playerId)
        : [...prev.pinnedTeammateIds, playerId];
      const excludedRivalIds = prev.excludedRivalIds.filter((id) => id !== playerId);
      return {
        ...prev,
        enabled: true,
        mode: 'handpicked',
        pinnedTeammateIds,
        excludedRivalIds,
      };
    });
  };

  const handleToggleExcludeRival = (playerId: string) => {
    setRigging((prev) => {
      const exists = prev.excludedRivalIds.includes(playerId);
      const excludedRivalIds = exists
        ? prev.excludedRivalIds.filter((id) => id !== playerId)
        : [...prev.excludedRivalIds, playerId];
      const pinnedTeammateIds = prev.pinnedTeammateIds.filter((id) => id !== playerId);
      return {
        ...prev,
        enabled: true,
         excludedRivalIds,
        pinnedTeammateIds,
      };
    });
  };

  const handleRotateWinnerStays = (winner: 'A' | 'B' | 'draw') => {
    const rotated = rotateKingOfTheCourt(drawnTeams, winner);
    setDrawnTeams(rotated);
    const nextMatch: LiveMatchState = {
      ...liveMatch,
      isRunning: false,
      remainingSeconds: rules.durationMinutes * 60,
      addedStoppageMinutes: 0,
      scoreA: 0,
      scoreB: 0,
      teamAId: rotated[0]?.id || 'team-1',
      teamBId: rotated[1]?.id || 'team-2',
      winnerTeamId: null,
      endedReason: null,
    };
    setLiveMatch(nextMatch);
    broadcastSync(
      { drawnTeams: rotated, liveMatch: nextMatch },
      `Fila rodou! Em campo: ${rotated[0]?.name} x ${rotated[1]?.name}`
    );
  };

  const handleCreateNewPrivateRoom = async (roomTitle: string, host: string) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomTitle,
          hostName: host,
          customState: {
            players,
            rules,
            drawnTeams,
            championship,
          },
        }),
      });
      const data = await res.json();
      if (data.room?.code) {
        setUserName(host);
        setRoomCode(data.room.code);
      }
    } catch {
      // fallback code
      setRoomCode(`FUT-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const confirmedPlayers = players.filter((p) => p.confirmed);
  const confirmedGks = confirmedPlayers.filter((p) => p.isGoalkeeper);
  const confirmedLine = confirmedPlayers.filter((p) => !p.isGoalkeeper);

  const filteredRoster = players.filter((p) => {
    if (rosterFilter === 'gk') return p.isGoalkeeper;
    if (rosterFilter === 'line') return !p.isGoalkeeper;
    return true;
  });

  const hostPlayer = players.find((p) => p.isHost);

  const handleExportPdf = () => {
    exportPeladaPdf({
      roomCode,
      rules,
      players,
      drawnTeams,
      camouflageStars: rigging.enabled && Boolean(rigging.camouflageStars),
    });
    setPdfExported(true);
    setTimeout(() => setPdfExported(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-10">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('draw');
          }}
          className="text-xl font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          PeladaPro
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Navegação Principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'draw'
                ? 'text-emerald-400 border-emerald-400'
                : 'border-transparent'
            }`}
          >
            Sorteio & Elenco
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('match')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'match'
                ? 'text-emerald-400 border-emerald-400'
                : 'border-transparent'
            }`}
          >
            Juiz, Moeda & Tempo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tournament')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'tournament'
                ? 'text-emerald-400 border-emerald-400'
                : 'border-transparent'
            }`}
          >
            Campeonatos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'live'
                ? 'text-emerald-400 border-emerald-400'
                : 'border-transparent'
            }`}
          >
            Sala Ao Vivo ({roomCode})
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsWhatsAppOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Lista do WhatsApp
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px Desktop Presence) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 space-y-6 flex-1">
        {/* Contextual Workspace Strip */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Formato Ativo:</span>
              <strong className="text-emerald-400 tabular-nums">
                {rules.linePlayersPerTeam} na Linha + {rules.goalkeepersPerTeam} no Gol
              </strong>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Duração: {rules.durationMinutes} min</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Limite: {rules.goalLimit ? `${rules.goalLimit} Gols` : 'Sem limite'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {confirmedLine.length} Linha / {confirmedGks.length} Goleiros confirmados
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              Sorteio Inteligente de Times, Arbitragem & Campeonatos
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Discreet Calibration Trigger ("Modo Panela Invisível" disguised as innocent Parâmetros button) */}
            <button
              type="button"
              onClick={() => setShowDiscreetPanel(!showDiscreetPanel)}
              title="Parâmetros Avançados e Calibragem do Sorteio"
              className="px-3.5 py-2.5 text-xs font-medium rounded-xl border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Parâmetros
            </button>

            <button
              type="button"
              onClick={handleExecuteDraw}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg shadow-emerald-950/50"
            >
              <Shuffle className="w-4 h-4" />
              Sortear Times Agora
            </button>
          </div>
        </div>

        {/* Discreet Rigging ("Modo Panela Invisível") Drawer */}
        {showDiscreetPanel && (
          <section
            aria-label="Configuração de Sorteio Discreto"
            className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Modo Panela Invisível · Oculto Automaticamente ao Sortear</span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                  Jogar com os Melhores Jogadores Sem Ninguém Saber
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quando ativado, o sorteio coloca você ({hostPlayer?.name || 'Organizador'}) junto com os melhores craques e o melhor goleiro, mantendo a aparência de um sorteio 100% aleatório.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(rigging.camouflageStars)}
                    onChange={(e) =>
                      setRigging((prev) => ({
                        ...prev,
                        camouflageStars: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                  />
                  Camuflar Média de Estrelas (4.2★)
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setRigging((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    rigging.enabled
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-950 text-slate-300 border border-slate-800'
                  }`}
                >
                  {rigging.enabled
                    ? 'Modo Panela: ATIVADO (Invisível)'
                    : 'Ativar Modo Panela Secreto'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscreetPanel(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 whitespace-nowrap"
                >
                  Ocultar Painel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-semibold text-slate-200">
                  1. Quem é você na lista?
                </div>
                <p className="text-slate-400">
                  Selecione seu nome para garantir que você saia no Time A titular:
                </p>
                <select
                  aria-label="Selecionar meu jogador"
                  value={hostPlayer?.id || ''}
                  onChange={(e) => handleToggleHostPlayer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rating}★)
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-semibold text-slate-200">
                  2. Estratégia de Favorecimento
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setRigging((prev) => ({
                        ...prev,
                        enabled: true,
                        mode: 'top_stars',
                      }))
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      rigging.enabled && rigging.mode === 'top_stars'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    Automático: Puxar os Jogadores 5★ + Melhor Goleiro
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRigging((prev) => ({
                        ...prev,
                        enabled: true,
                        mode: 'handpicked',
                      }))
                    }
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      rigging.enabled && rigging.mode === 'handpicked'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    Manual: Escolher Parceiros Fixos na Lista Abaixo
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-semibold text-slate-200">
                  3. Parceiros Fixados no Seu Time ({rigging.pinnedTeammateIds.length})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {players
                    .filter((p) => !p.isHost)
                    .map((p) => {
                      const isPinned = rigging.pinnedTeammateIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleTogglePinTeammate(p.id)}
                          className={`px-2.5 py-1 rounded-md border transition-colors ${
                            isPinned
                              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isPinned ? '✓ ' : '+ '}
                          {p.name.split(' ')[0]} ({p.rating}★)
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 1: SORTEIO & ELENCO */}
        {activeTab === 'draw' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Custom Rules & Player Roster */}
            <div className="lg:col-span-5 space-y-6">
              {/* Match Format & Rules Customizer */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">
                      Formação, Tempo e Limite de Gols
                    </div>
                    <h2 className="text-lg font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                      Regras da Partida Personalizadas
                    </h2>
                  </div>
                </div>

                {/* Quick Formation Presets (3+1, 4+1, 5+1, 10+1, etc.) */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    Modalidade Rápida (ou personalize abaixo):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FORMATION_PRESETS.map((preset) => {
                      const isSelected =
                        rules.linePlayersPerTeam === preset.line &&
                        rules.goalkeepersPerTeam === preset.gk;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            handleUpdateRules({
                              ...rules,
                              linePlayersPerTeam: preset.line,
                              goalkeepersPerTeam: preset.gk,
                            })
                          }
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap truncate ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Steppers: Jogadores na Linha, Goleiro, Tempo, Limite de Gols */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <label
                      htmlFor="input-line-players"
                      className="text-xs text-slate-400 block"
                    >
                      Jogadores na Linha
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        id="input-line-players"
                        type="number"
                        min={1}
                        max={11}
                        value={rules.linePlayersPerTeam}
                        onChange={(e) =>
                          handleUpdateRules({
                            ...rules,
                            linePlayersPerTeam: Math.max(
                              1,
                              Math.min(11, Number(e.target.value) || 5)
                            ),
                          })
                        }
                        className="w-16 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm font-bold text-slate-100 tabular-nums"
                      />
                      <span className="text-xs text-slate-400">por time</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <label
                      htmlFor="select-gk-per-team"
                      className="text-xs text-slate-400 block"
                    >
                      Goleiro por Time
                    </label>
                    <select
                      id="select-gk-per-team"
                      value={rules.goalkeepersPerTeam}
                      onChange={(e) =>
                        handleUpdateRules({
                          ...rules,
                          goalkeepersPerTeam: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-100"
                    >
                      <option value={1}>1 no Gol ({rules.linePlayersPerTeam}+1)</option>
                      <option value={0}>Sem Goleiro Fixo</option>
                    </select>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <label
                      htmlFor="input-duration-mins"
                      className="text-xs text-slate-400 block"
                    >
                      Tempo da Partida (min)
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        id="input-duration-mins"
                        type="number"
                        min={1}
                        max={90}
                        value={rules.durationMinutes}
                        onChange={(e) =>
                          handleUpdateRules({
                            ...rules,
                            durationMinutes: Math.max(
                              1,
                              Math.min(90, Number(e.target.value) || 10)
                            ),
                          })
                        }
                        className="w-16 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm font-bold text-slate-100 tabular-nums"
                      />
                      <span className="text-xs text-slate-400">minutos</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <label
                      htmlFor="select-goal-limit"
                      className="text-xs text-slate-400 block"
                    >
                      Fim por Limite de Gols
                    </label>
                    <select
                      id="select-goal-limit"
                      value={rules.goalLimit ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateRules({
                          ...rules,
                          goalLimit: val === 0 ? null : val,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-100"
                    >
                      <option value={1}>1 Gol (Gol de Ouro)</option>
                      <option value={2}>2 Gols (Padrão Society)</option>
                      <option value={3}>3 Gols</option>
                      <option value={4}>4 Gols</option>
                      <option value={5}>5 Gols</option>
                      <option value={0}>Sem Limite de Gols</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Player Roster Management */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">
                      Elenco Confirmado ({confirmedPlayers.length} atletas)
                    </div>
                    <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                      Lista de Jogadores & Goleiros
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
                  >
                    Colar do WhatsApp
                  </button>
                </div>

                {/* Add Single Player Form */}
                <form
                  onSubmit={handleAddPlayer}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar jogador (ex: Neymar Jr)..."
                      aria-label="Nome do novo jogador"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newPlayerIsGk}
                        onChange={(e) => setNewPlayerIsGk(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                      />
                      Joga no Gol (Goleiro Fixo)
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Nível:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewPlayerRating(star)}
                          aria-label={`Definir nível ${star} estrelas`}
                          className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                            newPlayerRating >= star
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </form>

                {/* Filter Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRosterFilter('all')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      rosterFilter === 'all'
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos ({players.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('line')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      rosterFilter === 'line'
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Linha ({players.filter((p) => !p.isGoalkeeper).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('gk')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      rosterFilter === 'gk'
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Goleiros ({players.filter((p) => p.isGoalkeeper).length})
                  </button>
                </div>

                {/* Roster Items */}
                <div className="divide-y divide-slate-800/70 max-h-96 overflow-y-auto pr-1">
                  {filteredRoster.map((player) => (
                    <div
                      key={player.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={player.confirmed}
                          aria-label={`Confirmar presença de ${player.name}`}
                          onChange={() => {
                            const next = players.map((p) =>
                              p.id === player.id ? { ...p, confirmed: !p.confirmed } : p
                            );
                            setPlayers(next);
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-100 truncate flex items-center gap-1.5">
                            <span>{player.name}</span>
                            {player.isHost && (
                              <Crown
                                className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                aria-label="Organizador"
                              />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = players.map((p) =>
                                  p.id === player.id
                                    ? { ...p, isGoalkeeper: !p.isGoalkeeper }
                                    : p
                                );
                                setPlayers(next);
                              }}
                              className="hover:text-slate-200 underline decoration-slate-700"
                            >
                              {player.isGoalkeeper ? 'Goleiro' : 'Linha'}
                            </button>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-amber-400 tabular-nums">
                              {player.rating}★
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextRating = (player.rating % 5) + 1;
                            setPlayers(
                              players.map((p) =>
                                p.id === player.id ? { ...p, rating: nextRating } : p
                              )
                            );
                          }}
                          aria-label={`Alterar estrelas de ${player.name}`}
                          className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono tabular-nums"
                        >
                          {player.rating}★
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPlayers(players.filter((p) => p.id !== player.id))
                          }
                          aria-label={`Remover ${player.name}`}
                          className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-950 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right 7 Cols: Drawn Teams & Tactical Pitch Cards */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">
                    Algoritmo: Equilíbrio Tático · {drawnTeams.length} Equipes Formadas
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">
                    Times Sorteados & Esquema Tático ({rules.linePlayersPerTeam}+
                    {rules.goalkeepersPerTeam})
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="export-pdf-main-btn"
                    onClick={handleExportPdf}
                    className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    {pdfExported ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        PDF Gerado!
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        Exportar PDF (WhatsApp)
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('match')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Ir para Moeda & Cronômetro
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {drawnTeams.map((team, idx) => (
                  <TacticalPitchCard
                    key={team.id}
                    team={team}
                    index={idx}
                    rules={rules}
                    camouflageStars={rigging.enabled && Boolean(rigging.camouflageStars)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JUIZ, MOEDA & CRONÔMETRO */}
        {activeTab === 'match' && (
          <MatchRefereeView
            drawnTeams={drawnTeams}
            rules={rules}
            onUpdateRules={handleUpdateRules}
            coinToss={coinToss}
            onUpdateCoinToss={(nextToss) => {
              setCoinToss(nextToss);
              broadcastSync(
                { coinToss: nextToss },
                `Sorteio de moeda: deu ${nextToss.result?.toUpperCase()}`
              );
            }}
            liveMatch={liveMatch}
            onUpdateLiveMatch={(nextMatch) => {
              setLiveMatch(nextMatch);
              broadcastSync({ liveMatch: nextMatch });
            }}
            onRotateQueueWinnerStays={handleRotateWinnerStays}
          />
        )}

        {/* TAB 3: CAMPEONATOS */}
        {activeTab === 'tournament' && (
          <ChampionshipView
            drawnTeams={drawnTeams}
            championship={championship}
            onUpdateChampionship={(nextChamp) => {
              setChampionship(nextChamp);
              broadcastSync(
                { championship: nextChamp },
                `Tabela do campeonato "${nextChamp.name}" atualizada`
              );
            }}
            onSendMatchToReferee={(teamAId, teamBId) => {
              const nextMatch: LiveMatchState = {
                ...liveMatch,
                isRunning: false,
                remainingSeconds: rules.durationMinutes * 60,
                addedStoppageMinutes: 0,
                scoreA: 0,
                scoreB: 0,
                teamAId,
                teamBId,
                winnerTeamId: null,
                endedReason: null,
              };
              setLiveMatch(nextMatch);
              setActiveTab('match');
            }}
          />
        )}

        {/* TAB 4: SALA AO VIVO (MULTIPLAYER WEBSOCKET) */}
        {activeTab === 'live' && (
          <LiveRoomView
            roomCode={roomCode}
            userName={userName}
            isConnected={isWsConnected}
            roomState={roomState}
            onJoinRoom={(code, name) => {
              setUserName(name || 'Atleta');
              setRoomCode(code.toUpperCase());
            }}
            onCreateNewPrivateRoom={handleCreateNewPrivateRoom}
            onAddGuestPlayerToRoom={(newPlayer) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'room:add_player',
                    player: newPlayer,
                  })
                );
              } else {
                setPlayers((prev) => [...prev, newPlayer]);
              }
            }}
            onToggleRoomPlayerPresence={(playerId) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'room:toggle_presence',
                    playerId,
                  })
                );
              }
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Natural Thumb Zone, <= 15% height) */}
      <nav
        aria-label="Navegação Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-14 px-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab('draw')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium ${
            activeTab === 'draw' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          <span className="mt-0.5">Sorteio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium ${
            activeTab === 'match' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="mt-0.5">Juiz & Moeda</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tournament')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium ${
            activeTab === 'tournament' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="mt-0.5">Campeonato</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium ${
            activeTab === 'live' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span className="mt-0.5">Ao Vivo</span>
        </button>
      </nav>

      {/* WhatsApp Import/Export Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        players={players}
        rules={rules}
        drawnTeams={drawnTeams}
        onImportPlayers={handleImportWhatsAppPlayers}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
}
