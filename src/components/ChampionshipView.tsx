import React, { useState } from 'react';
import { Award, Check, Minus, Play, Plus, Trophy, UserPlus } from 'lucide-react';
import {
  Championship,
  ChampionshipMatch,
  DrawnTeam,
  Player,
} from '../types/pelada';
import {
  calculateStandings,
  calculateTopScorers,
  createChampionshipFromTeams,
  recordGoalScorerInMatch,
} from '../utils/peladaLogic';

interface ChampionshipViewProps {
  drawnTeams: DrawnTeam[];
  championship: Championship | null;
  onUpdateChampionship: (next: Championship) => void;
  onSendMatchToReferee: (teamAId: string, teamBId: string) => void;
}

export const ChampionshipView: React.FC<ChampionshipViewProps> = ({
  drawnTeams,
  championship,
  onUpdateChampionship,
  onSendMatchToReferee,
}) => {
  const [newTitle, setNewTitle] = useState('Copa Society dos Amigos');
  const [newFormat, setNewFormat] = useState<Championship['format']>('pontos_corridos');
  const [editingScores, setEditingScores] = useState<
    Record<string, { a: string; b: string }>
  >({});
  const [openScorerMatchId, setOpenScorerMatchId] = useState<string | null>(null);

  const activeChamp =
    championship ||
    createChampionshipFromTeams('Copa Society dos Amigos', 'pontos_corridos', drawnTeams);

  const standings = calculateStandings(activeChamp.teams, activeChamp.matches);
  const topScorers = calculateTopScorers(activeChamp.teams, activeChamp.matches);

  const handleCreateNewChampionship = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createChampionshipFromTeams(
      newTitle.trim() || 'Torneio PeladaPro',
      newFormat,
      drawnTeams
    );
    onUpdateChampionship(created);
  };

  const handleSaveMatchScore = (match: ChampionshipMatch) => {
    const draft = editingScores[match.id];
    const scoreA = draft?.a !== undefined ? Number(draft.a) : match.scoreA ?? 0;
    const scoreB = draft?.b !== undefined ? Number(draft.b) : match.scoreB ?? 0;

    const updatedMatches = activeChamp.matches.map((m) =>
      m.id === match.id
        ? {
            ...m,
            scoreA: Math.max(0, scoreA),
            scoreB: Math.max(0, scoreB),
            status: 'finished' as const,
          }
        : m
    );

    onUpdateChampionship({
      ...activeChamp,
      matches: updatedMatches,
    });
  };

  const handleRecordPlayerGoal = (
    match: ChampionshipMatch,
    player: Player,
    teamId: string,
    delta: 1 | -1
  ) => {
    const updatedMatch = recordGoalScorerInMatch(match, player, teamId, delta);
    const updatedMatches = activeChamp.matches.map((m) =>
      m.id === match.id ? updatedMatch : m
    );

    // Sync local input draft with updated score
    setEditingScores((prev) => ({
      ...prev,
      [match.id]: {
        a: String(updatedMatch.scoreA ?? 0),
        b: String(updatedMatch.scoreB ?? 0),
      },
    }));

    onUpdateChampionship({
      ...activeChamp,
      matches: updatedMatches,
    });
  };

  const getTeamRoster = (teamId: string): Player[] => {
    const team = activeChamp.teams.find((t) => t.id === teamId);
    if (!team) return [];
    return [...(team.goalkeeper ? [team.goalkeeper] : []), ...team.linePlayers];
  };

  return (
    <div className="space-y-6">
      {/* Top Creation / Config Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <form
          onSubmit={handleCreateNewChampionship}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="text-xs text-slate-400">
              Organizador de Torneios, Classificação & Artilharia
            </div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              {activeChamp.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="champ-name-input"
                className="block text-xs text-slate-400 mb-1"
              >
                Nome do Campeonato
              </label>
              <input
                id="champ-name-input"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 w-56"
              />
            </div>

            <div>
              <label
                htmlFor="champ-format-select"
                className="block text-xs text-slate-400 mb-1"
              >
                Formato de Disputa
              </label>
              <select
                id="champ-format-select"
                value={newFormat}
                onChange={(e) =>
                  setNewFormat(e.target.value as Championship['format'])
                }
                className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              >
                <option value="pontos_corridos">Pontos Corridos (Todos x Todos)</option>
                <option value="mata_mata">Mata-Mata / Eliminatória</option>
                <option value="rei_da_quadra">Rei da Quadra Contínuo</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Gerar Tabela com Times Atuais
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Standings Table + Ranking de Artilharia */}
        <div className="lg:col-span-7 space-y-6">
          {/* Standings Table */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">
                Classificação em Tempo Real
              </h3>
              <span className="text-xs text-slate-400">
                Vitória: 3 pts · Empate: 1 pt
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 pr-2 font-medium">#</th>
                    <th className="py-2.5 px-2 font-medium">Equipe</th>
                    <th className="py-2.5 px-2 font-semibold text-right text-slate-200">
                      PTS
                    </th>
                    <th className="py-2.5 px-2 font-medium text-right">J</th>
                    <th className="py-2.5 px-2 font-medium text-right">V</th>
                    <th className="py-2.5 px-2 font-medium text-right">E</th>
                    <th className="py-2.5 px-2 font-medium text-right">D</th>
                    <th className="py-2.5 px-2 font-medium text-right">GP</th>
                    <th className="py-2.5 px-2 font-medium text-right">GC</th>
                    <th className="py-2.5 pl-2 font-medium text-right">SG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {standings.map((row, index) => (
                    <tr key={row.teamId} className="hover:bg-slate-800/40">
                      <td className="py-3 pr-2 font-mono text-slate-400 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3 px-2 font-semibold text-slate-100 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: row.accentHex }}
                        />
                        <span className="truncate max-w-[160px]">{row.teamName}</span>
                      </td>
                      <td className="py-3 px-2 font-mono font-bold text-right text-emerald-400 tabular-nums">
                        {row.points}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.played}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.wins}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.draws}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.losses}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.goalsFor}
                      </td>
                      <td className="py-3 px-2 font-mono text-right text-slate-300 tabular-nums">
                        {row.goalsAgainst}
                      </td>
                      <td className="py-3 pl-2 font-mono text-right text-slate-200 tabular-nums">
                        {row.goalDifference > 0
                          ? `+${row.goalDifference}`
                          : row.goalDifference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ranking de Artilharia Section */}
          <section
            aria-label="Ranking de Artilharia"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
            data-testid="top-scorers-section"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-400">
                  Artilheiros do Torneio · Atualizado por Partida
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Ranking de Artilharia
                </h3>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {topScorers.reduce((sum, s) => sum + s.goals, 0)} gols registrados
              </span>
            </div>

            {topScorers.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-center space-y-2">
                <p className="text-xs text-slate-300 font-medium">
                  Nenhum gol com autor registrado ainda neste campeonato.
                </p>
                <p className="text-xs text-slate-400">
                  Clique em <strong>Registrar Autor do Gol</strong> em qualquer partida ao lado para alimentar a artilharia.
                </p>
                {activeChamp.matches[0] && (
                  <button
                    type="button"
                    onClick={() => setOpenScorerMatchId(activeChamp.matches[0].id)}
                    className="mt-1 px-3.5 py-2 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
                  >
                    Registrar Primeiro Artilheiro na 1ª Rodada
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 pr-2 font-medium w-10">Pos</th>
                      <th className="py-2.5 px-2 font-medium">Jogador</th>
                      <th className="py-2.5 px-2 font-medium">Equipe</th>
                      <th className="py-2.5 pl-2 font-semibold text-right text-amber-400">
                        GOLS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {topScorers.map((scorer, idx) => (
                      <tr key={`${scorer.teamId}-${scorer.playerId}`} className="hover:bg-slate-800/40">
                        <td className="py-3 pr-2 font-mono text-slate-400 tabular-nums">
                          {idx + 1}º
                        </td>
                        <td className="py-3 px-2 font-semibold text-slate-100">
                          {scorer.playerName}
                        </td>
                        <td className="py-3 px-2 text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-sm shrink-0"
                              style={{ backgroundColor: scorer.accentHex }}
                            />
                            <span className="truncate max-w-[150px]">{scorer.teamName}</span>
                          </span>
                        </td>
                        <td className="py-3 pl-2 font-mono font-bold text-right text-amber-400 text-sm tabular-nums">
                          {scorer.goals}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols: Matches & Round Fixtures with Goal Scorer Attribution */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">
              Jogos da Tabela ({activeChamp.matches.length})
            </h3>
            <span className="text-xs text-slate-400">
              Placar e Autores dos Gols
            </span>
          </div>

          <div className="space-y-3">
            {activeChamp.matches.map((m) => {
              const draft = editingScores[m.id] || {
                a: m.scoreA !== null ? String(m.scoreA) : '0',
                b: m.scoreB !== null ? String(m.scoreB) : '0',
              };
              const isScorerDrawerOpen = openScorerMatchId === m.id;
              const rosterA = getTeamRoster(m.teamAId);
              const rosterB = getTeamRoster(m.teamBId);

              return (
                <div
                  key={m.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{m.stageLabel}</span>
                    <span>
                      {m.status === 'finished' ? 'Finalizado' : 'Aguardando Resultado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate flex-1">
                      {m.teamAName}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        aria-label={`Gols de ${m.teamAName}`}
                        value={draft.a}
                        onChange={(e) =>
                          setEditingScores({
                            ...editingScores,
                            [m.id]: { ...draft, a: e.target.value },
                          })
                        }
                        className="w-12 py-1 text-center font-mono text-sm font-bold bg-slate-900 border border-slate-700 rounded-md text-slate-100 tabular-nums"
                      />
                      <span className="text-xs text-slate-500 font-mono">x</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        aria-label={`Gols de ${m.teamBName}`}
                        value={draft.b}
                        onChange={(e) =>
                          setEditingScores({
                            ...editingScores,
                            [m.id]: { ...draft, b: e.target.value },
                          })
                        }
                        className="w-12 py-1 text-center font-mono text-sm font-bold bg-slate-900 border border-slate-700 rounded-md text-slate-100 tabular-nums"
                      />
                    </div>

                    <span className="text-xs font-semibold text-slate-200 truncate flex-1 text-right">
                      {m.teamBName}
                    </span>
                  </div>

                  {/* Recorded Scorers Summary for this Match */}
                  {m.scorers && m.scorers.length > 0 && (
                    <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-slate-400">Gols da partida:</span>
                      {m.scorers.map((sc, i) => (
                        <React.Fragment key={`${sc.teamId}-${sc.playerId}`}>
                          {i > 0 && <span aria-hidden="true">·</span>}
                          <span className="font-medium text-amber-300 tabular-nums">
                            {sc.playerName} ({sc.goals})
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenScorerMatchId(isScorerDrawerOpen ? null : m.id)
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isScorerDrawerOpen
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      Registrar Autor do Gol
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSendMatchToReferee(m.teamAId, m.teamBId)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        Apitar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveMatchScore(m)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar Placar
                      </button>
                    </div>
                  </div>

                  {/* Interactive Goal Scorer Drawer per Match */}
                  {isScorerDrawerOpen && (
                    <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                      <div className="text-[11px] text-slate-400">
                        Clique no jogador que marcou gol para somar no placar e no Ranking de Artilharia:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Team A Players */}
                        <div className="space-y-1.5">
                          <div className="font-semibold text-slate-200 truncate">
                            {m.teamAName}
                          </div>
                          <div className="space-y-1">
                            {rosterA.map((player) => {
                              const currentGoals =
                                m.scorers.find(
                                  (s) => s.playerId === player.id && s.teamId === m.teamAId
                                )?.goals || 0;
                              return (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                                >
                                  <span className="text-slate-200 truncate">
                                    {player.name.split(' ')[0]}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {currentGoals > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRecordPlayerGoal(m, player, m.teamAId, -1)
                                        }
                                        aria-label={`Remover gol de ${player.name}`}
                                        className="p-1 text-slate-400 hover:text-red-400"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRecordPlayerGoal(m, player, m.teamAId, 1)
                                      }
                                      aria-label={`Registrar gol de ${player.name}`}
                                      className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded font-mono text-[11px] font-semibold tabular-nums"
                                    >
                                      +1 Gol {currentGoals > 0 ? `(${currentGoals})` : ''}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Team B Players */}
                        <div className="space-y-1.5">
                          <div className="font-semibold text-slate-200 truncate">
                            {m.teamBName}
                          </div>
                          <div className="space-y-1">
                            {rosterB.map((player) => {
                              const currentGoals =
                                m.scorers.find(
                                  (s) => s.playerId === player.id && s.teamId === m.teamBId
                                )?.goals || 0;
                              return (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                                >
                                  <span className="text-slate-200 truncate">
                                    {player.name.split(' ')[0]}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {currentGoals > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRecordPlayerGoal(m, player, m.teamBId, -1)
                                        }
                                        aria-label={`Remover gol de ${player.name}`}
                                        className="p-1 text-slate-400 hover:text-red-400"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRecordPlayerGoal(m, player, m.teamBId, 1)
                                      }
                                      aria-label={`Registrar gol de ${player.name}`}
                                      className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded font-mono text-[11px] font-semibold tabular-nums"
                                    >
                                      +1 Gol {currentGoals > 0 ? `(${currentGoals})` : ''}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
