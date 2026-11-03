import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Coins,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import {
  CoinTossState,
  DrawnTeam,
  LiveMatchState,
  MatchEvent,
  MatchRules,
} from '../types/pelada';
import { flipVirtualCoin } from '../utils/peladaLogic';

interface MatchRefereeViewProps {
  drawnTeams: DrawnTeam[];
  rules: MatchRules;
  onUpdateRules: (next: MatchRules) => void;
  coinToss: CoinTossState;
  onUpdateCoinToss: (next: CoinTossState) => void;
  liveMatch: LiveMatchState;
  onUpdateLiveMatch: (next: LiveMatchState) => void;
  onRotateQueueWinnerStays: (winner: 'A' | 'B' | 'draw') => void;
}

export const MatchRefereeView: React.FC<MatchRefereeViewProps> = ({
  drawnTeams,
  rules,
  onUpdateRules,
  coinToss,
  onUpdateCoinToss,
  liveMatch,
  onUpdateLiveMatch,
  onRotateQueueWinnerStays,
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState(
    String(rules.durationMinutes)
  );
  const [selectedScorerTeam, setSelectedScorerTeam] = useState<'A' | 'B' | null>(null);

  const teamA =
    drawnTeams.find((t) => t.id === liveMatch.teamAId) || drawnTeams[0] || null;
  const teamB =
    drawnTeams.find((t) => t.id === liveMatch.teamBId) || drawnTeams[1] || null;
  const queueTeams = drawnTeams.filter(
    (t) => t.id !== teamA?.id && t.id !== teamB?.id
  );

  const formatClock = (totalSec: number) => {
    const clamped = Math.max(0, totalSec);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFlipCoin = () => {
    if (!teamA || !teamB || isFlipping) return;
    setIsFlipping(true);
    const nextToss = flipVirtualCoin(
      coinToss.callerTeamId || teamA.id,
      coinToss.callerChoice,
      teamA.id,
      teamB.id
    );
    setTimeout(() => {
      onUpdateCoinToss(nextToss);
      setIsFlipping(false);
    }, 650);
  };

  const handleSwapFieldSides = () => {
    onUpdateCoinToss({
      ...coinToss,
      fieldSideTeamA:
        coinToss.fieldSideTeamA === 'Lado Norte (Esquerdo)'
          ? 'Lado Sul (Direito)'
          : 'Lado Norte (Esquerdo)',
      fieldSideTeamB:
        coinToss.fieldSideTeamB === 'Lado Norte (Esquerdo)'
          ? 'Lado Sul (Direito)'
          : 'Lado Norte (Esquerdo)',
    });
  };

  const handleAddStoppageTime = (minutesToAdd: number) => {
    const newStoppage = liveMatch.addedStoppageMinutes + minutesToAdd;
    const newRemaining = liveMatch.remainingSeconds + minutesToAdd * 60;
    const evt: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: 'extra_time',
      minuteMark: formatClock(liveMatch.remainingSeconds),
      description: `+${minutesToAdd} min de acréscimo adicionado pelo árbitro`,
      timestamp: Date.now(),
    };
    onUpdateLiveMatch({
      ...liveMatch,
      addedStoppageMinutes: newStoppage,
      remainingSeconds: newRemaining,
      endedReason: null,
      winnerTeamId: null,
      events: [evt, ...liveMatch.events],
    });
  };

  const handleApplyCustomDuration = () => {
    const mins = Math.max(1, Math.min(90, Number(customMinutesInput) || 10));
    onUpdateRules({ ...rules, durationMinutes: mins });
    onUpdateLiveMatch({
      ...liveMatch,
      isRunning: false,
      configuredMinutes: mins,
      remainingSeconds: mins * 60,
      addedStoppageMinutes: 0,
      endedReason: null,
      winnerTeamId: null,
    });
  };

  const handleScoreGoal = (side: 'A' | 'B', scorerName?: string) => {
    if (!teamA || !teamB) return;
    const nextScoreA = side === 'A' ? liveMatch.scoreA + 1 : liveMatch.scoreA;
    const nextScoreB = side === 'B' ? liveMatch.scoreB + 1 : liveMatch.scoreB;
    const scoringTeam = side === 'A' ? teamA : teamB;

    const reachedGoalLimit =
      rules.goalLimit !== null &&
      rules.goalLimit > 0 &&
      (nextScoreA >= rules.goalLimit || nextScoreB >= rules.goalLimit);

    const evt: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: 'goal',
      teamId: scoringTeam.id,
      playerName: scorerName || 'Gol da Equipe',
      minuteMark: formatClock(liveMatch.remainingSeconds),
      description: `Gol do ${scoringTeam.name}: ${scorerName || 'Atleta'} (${nextScoreA} x ${nextScoreB})`,
      timestamp: Date.now(),
    };

    onUpdateLiveMatch({
      ...liveMatch,
      scoreA: nextScoreA,
      scoreB: nextScoreB,
      isRunning: reachedGoalLimit ? false : liveMatch.isRunning,
      winnerTeamId: reachedGoalLimit ? scoringTeam.id : liveMatch.winnerTeamId,
      endedReason: reachedGoalLimit ? 'goal_limit' : liveMatch.endedReason,
      events: [evt, ...liveMatch.events],
    });
    setSelectedScorerTeam(null);
  };

  const handleAdjustScoreMinus = (side: 'A' | 'B') => {
    const nextScoreA = side === 'A' ? Math.max(0, liveMatch.scoreA - 1) : liveMatch.scoreA;
    const nextScoreB = side === 'B' ? Math.max(0, liveMatch.scoreB - 1) : liveMatch.scoreB;
    onUpdateLiveMatch({
      ...liveMatch,
      scoreA: nextScoreA,
      scoreB: nextScoreB,
      endedReason: null,
      winnerTeamId: null,
    });
  };

  const handleResetMatch = () => {
    onUpdateLiveMatch({
      ...liveMatch,
      isRunning: false,
      remainingSeconds: rules.durationMinutes * 60,
      configuredMinutes: rules.durationMinutes,
      addedStoppageMinutes: 0,
      scoreA: 0,
      scoreB: 0,
      events: [],
      winnerTeamId: null,
      endedReason: null,
    });
  };

  const winnerSide: 'A' | 'B' | 'draw' =
    liveMatch.scoreA > liveMatch.scoreB
      ? 'A'
      : liveMatch.scoreB > liveMatch.scoreA
      ? 'B'
      : 'draw';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Main Scoreboard, Clock & Stoppage Time Controls */}
      <div className="lg:col-span-7 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Placar Oficial & Cronômetro</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                   Tempo Padrão: {rules.durationMinutes} min
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Meta: {rules.goalLimit ? `${rules.goalLimit} Gols` : 'Sem limite'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                Painel de Arbitragem Digital
              </h2>
            </div>

            {/* Custom Time Quick Config */}
            <div className="flex items-center gap-2">
              <label htmlFor="custom-match-minutes" className="text-xs text-slate-400">
                Minutos:
              </label>
              <input
                id="custom-match-minutes"
                type="number"
                min={1}
                max={90}
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                className="w-16 px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 tabular-nums"
              />
              <button
                type="button"
                onClick={handleApplyCustomDuration}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Definir Tempo
              </button>
            </div>
          </div>

          {/* Digital Clock Display */}
          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Cronômetro Regressivo</span>
              {liveMatch.addedStoppageMinutes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-semibold tabular-nums">
                    +{liveMatch.addedStoppageMinutes} min de Acréscimo
                  </span>
                </>
              )}
            </div>

            <div
              className={`text-6xl sm:text-7xl font-mono font-bold tracking-tight tabular-nums ${
                liveMatch.remainingSeconds <= 60
                  ? 'text-red-400'
                  : liveMatch.isRunning
                  ? 'text-emerald-400'
                  : 'text-slate-100'
              }`}
              data-testid="match-timer-display"
            >
              {formatClock(liveMatch.remainingSeconds)}
            </div>

            {/* Primary Clock Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  onUpdateLiveMatch({ ...liveMatch, isRunning: !liveMatch.isRunning })
                }
                className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  liveMatch.isRunning
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {liveMatch.isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pausar Partida
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Iniciar Cronômetro
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetMatch}
                className="px-4 py-3 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar Jogo
              </button>
            </div>

            {/* Stoppage Time (Acréscimos) Bar */}
            <div className="pt-4 border-t border-slate-900 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Dar Acréscimo:</span>
              {[1, 2, 3, 5].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleAddStoppageTime(mins)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums"
                >
                  +{mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Match Finished Alert Banner */}
          {liveMatch.endedReason && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  {liveMatch.endedReason === 'goal_limit'
                    ? `Fim de Jogo! Limite de ${rules.goalLimit} Gols Atingido`
                    : 'Fim do Tempo Regulamentar!'}
                </div>
                <p className="text-sm text-slate-200">
                  {winnerSide === 'A'
                    ? `Vitória do ${teamA?.name}!`
                    : winnerSide === 'B'
                    ? `Vitória do ${teamB?.name}!`
                    : 'Partida encerrada em empate.'}
                </p>
              </div>
              {queueTeams.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRotateQueueWinnerStays(winnerSide)}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Próximo da Fila (Vencedor Fica)
                </button>
              )}
            </div>
          )}

          {/* Teams Scoreboard */}
          {teamA && teamB ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team A Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      {coinToss.fieldSideTeamA}
                      {coinToss.ballTeamId === teamA.id ? ' · Com a Bola' : ''}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: teamA.accentHex }}
                      />
                      {teamA.name}
                    </h3>
                  </div>
                  <span
                    className="text-4xl font-mono font-bold text-slate-100 tabular-nums"
                    data-testid="score-team-a"
                  >
                    {liveMatch.scoreA}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleScoreGoal('A')}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Gol {teamA.shortName}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedScorerTeam(selectedScorerTeam === 'A' ? null : 'A')
                    }
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Autor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustScoreMinus('A')}
                    aria-label={`Diminuir gol de ${teamA.name}`}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-mono rounded-lg transition-colors"
                  >
                    -1
                  </button>
                </div>

                {selectedScorerTeam === 'A' && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block">
                      Selecione quem marcou pelo {teamA.shortName}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[...(teamA.goalkeeper ? [teamA.goalkeeper] : []), ...teamA.linePlayers].map(
                        (p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleScoreGoal('A', p.name)}
                            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-emerald-950 text-slate-200 border border-slate-800 rounded-md transition-colors"
                          >
                            {p.name.split(' ')[0]}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Team B Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      {coinToss.fieldSideTeamB}
                      {coinToss.ballTeamId === teamB.id ? ' · Com a Bola' : ''}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: teamB.accentHex }}
                      />
                      {teamB.name}
                    </h3>
                  </div>
                  <span
                    className="text-4xl font-mono font-bold text-slate-100 tabular-nums"
                    data-testid="score-team-b"
                  >
                    {liveMatch.scoreB}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleScoreGoal('B')}
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Gol {teamB.shortName}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedScorerTeam(selectedScorerTeam === 'B' ? null : 'B')
                    }
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Autor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustScoreMinus('B')}
                    aria-label={`Diminuir gol de ${teamB.name}`}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-mono rounded-lg transition-colors"
                  >
                    -1
                  </button>
                </div>

                {selectedScorerTeam === 'B' && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block">
                      Selecione quem marcou pelo {teamB.shortName}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[...(teamB.goalkeeper ? [teamB.goalkeeper] : []), ...teamB.linePlayers].map(
                        (p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleScoreGoal('B', p.name)}
                            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-blue-950 text-slate-200 border border-slate-800 rounded-md transition-colors"
                          >
                            {p.name.split(' ')[0]}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Match Events Log */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-bold text-slate-100">
            Súmula Ao Vivo da Partida
          </h3>
          {liveMatch.events.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">
              Nenhum gol ou acréscimo registrado ainda nesta partida.
            </p>
          ) : (
            <div className="divide-y divide-slate-800 text-xs">
              {liveMatch.events.map((ev) => (
                <div
                  key={ev.id}
                  className="py-2.5 flex items-center justify-between gap-4"
                >
                  <span className="text-slate-200">{ev.description}</span>
                  <span className="font-mono text-slate-400 tabular-nums shrink-0">
                    {ev.minuteMark}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right 5 Cols: Virtual Coin Toss (Cara ou Coroa) & Queue Rotation */}
      <div className="lg:col-span-5 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">
                Sorteio de Lado de Campo e Bola
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Cara ou Coroa Virtual
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSwapFieldSides}
              className="px-3 py-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Inverter Lados
            </button>
          </div>

          {/* Choice Selector for Team A */}
          {teamA && teamB && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-300">
                Escolha do <strong>{teamA.shortName}</strong>:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCoinToss({
                      ...coinToss,
                      callerTeamId: teamA.id,
                      callerChoice: 'cara',
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    coinToss.callerChoice === 'cara'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CARA (Escudo)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCoinToss({
                      ...coinToss,
                      callerTeamId: teamA.id,
                      callerChoice: 'coroa',
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    coinToss.callerChoice === 'coroa'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  COROA (Bola)
                </button>
              </div>
            </div>
          )}

          {/* Interactive 3D Coin Display */}
          <div className="flex flex-col items-center justify-center py-4 gap-4">
            <div
              className={`w-28 h-28 rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-xl flex flex-col items-center justify-center text-slate-950 select-none ${
                isFlipping ? 'animate-coin-flip' : ''
              }`}
              data-testid="virtual-coin-graphic"
            >
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase opacity-80">
                PELADAPRO
              </span>
              <span className="text-lg font-extrabold tracking-tight mt-0.5">
                {isFlipping
                  ? 'GIRANDO...'
                  : coinToss.result
                  ? coinToss.result.toUpperCase()
                  : 'MOEDA'}
              </span>
              <span className="text-[10px] font-semibold opacity-80">
                {coinToss.result === 'cara'
                  ? 'Lado Escudo'
                  : coinToss.result === 'coroa'
                  ? 'Lado Bola'
                  : 'Pronta'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFlipCoin}
              disabled={isFlipping}
              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
            >
              {isFlipping ? 'Lançando Moeda para o Alto...' : 'Lançar Moeda (Cara ou Coroa)'}
            </button>
          </div>

          {/* Coin Result Summary */}
          {coinToss.result && teamA && teamB && (
            <div
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
              data-testid="coin-toss-result"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Resultado da Moeda:</span>
                <strong className="text-amber-400 uppercase">{coinToss.result}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Posse de Bola Inicial:</span>
                <strong className="text-emerald-400">
                  {coinToss.ballTeamId === teamA.id ? teamA.name : teamB.name}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{teamA.shortName}:</span>
                <span className="text-slate-200">{coinToss.fieldSideTeamA}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{teamB.shortName}:</span>
                <span className="text-slate-200">{coinToss.fieldSideTeamB}</span>
              </div>
            </div>
          )}
        </section>

        {/* Queue / Rei da Quadra Rotation */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <div className="text-xs text-slate-400">Rodízio de Times (Rei da Quadra)</div>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              Fila de Espera & Próximos Jogos
            </h3>
          </div>

          {queueTeams.length === 0 ? (
            <p className="text-xs text-slate-400">
              Apenas 2 times sorteados no momento. Adicione mais jogadores para formar fila de espera.
            </p>
          ) : (
            <div className="space-y-3">
              {queueTeams.map((qt, idx) => (
                <div
                  key={qt.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Próximo #{idx + 1} na Fila
                    </span>
                    <span className="text-sm font-semibold text-slate-100">
                      {qt.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-400 tabular-nums">
                    {qt.averageRating.toFixed(1)} ★
                  </span>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onRotateQueueWinnerStays('A')}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap truncate"
                >
                  {teamA?.shortName} Venceu (Fica)
                </button>
                <button
                  type="button"
                  onClick={() => onRotateQueueWinnerStays('B')}
                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap truncate"
                >
                  {teamB?.shortName} Venceu (Fica)
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
