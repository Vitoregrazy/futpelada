import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  createChampionshipFromTeams,
  DEFAULT_RULES,
  drawTeams,
  INITIAL_PLAYERS,
} from './src/utils/peladaLogic';
import { RoomState } from './src/types/pelada';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rooms = new Map<string, RoomState>();

function buildInitialRoom(code: string, name: string, hostName: string): RoomState {
  const initialTeams = drawTeams(
    INITIAL_PLAYERS,
    DEFAULT_RULES,
    { enabled: false, mode: 'balanced', pinnedTeammateIds: [], excludedRivalIds: [] },
    () => 0.42
  );
  const initialChamp = createChampionshipFromTeams(
    'Copa Society dos Amigos',
    'pontos_corridos',
    initialTeams
  );

  return {
    code: code.toUpperCase(),
    name,
    hostName,
    players: INITIAL_PLAYERS.map((p) => ({ ...p })),
    rules: { ...DEFAULT_RULES },
    drawnTeams: initialTeams,
    coinToss: {
      result: null,
      callerTeamId: initialTeams[0]?.id || 'team-1',
      callerChoice: 'cara',
      winnerTeamId: null,
      ballTeamId: null,
      fieldSideTeamA: 'Lado Norte (Esquerdo)',
      fieldSideTeamB: 'Lado Sul (Direito)',
      flippedAt: null,
    },
    liveMatch: {
      isRunning: false,
      remainingSeconds: DEFAULT_RULES.durationMinutes * 60,
      configuredMinutes: DEFAULT_RULES.durationMinutes,
      addedStoppageMinutes: 0,
      scoreA: 0,
      scoreB: 0,
      teamAId: initialTeams[0]?.id || 'team-1',
      teamBId: initialTeams[1]?.id || 'team-2',
      events: [],
      winnerTeamId: null,
      endedReason: null,
    },
    championship: initialChamp,
    participants: [
      {
        clientId: 'seed-host',
        name: hostName,
        role: 'host',
        joinedAt: Date.now(),
      },
    ],
    activityFeed: [
      {
        id: 'act-init',
        text: `Sala privada ${code.toUpperCase()} criada por ${hostName}`,
        timestamp: Date.now(),
      },
    ],
    updatedAt: Date.now(),
  };
}

// Seed default live room SOC-10
rooms.set('SOC-10', buildInitialRoom('SOC-10', 'Pelada Society de Terça 21h', 'Vitor (Organizador)'));

interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  roomCode: string | null;
  userName: string;
}

const clients = new Map<WebSocket, ClientConnection>();

function broadcastRoomState(roomCode: string) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return;
  const payload = JSON.stringify({
    type: 'room:state',
    room,
  });
  for (const [, client] of clients) {
    if (client.roomCode === room.code && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // REST API for Rooms
  app.get('/api/rooms/:code', (req, res) => {
    const code = (req.params.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Sala não encontrada.' });
      return;
    }
    res.json({ room });
  });

  app.post('/api/rooms', (req, res) => {
    const { name, hostName, customState } = req.body || {};
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const code = `FUT-${randomSuffix}`;
    const baseRoom = buildInitialRoom(
      code,
      name || 'Pelada Privada Ao Vivo',
      hostName || 'Organizador'
    );

    if (customState) {
      if (Array.isArray(customState.players)) baseRoom.players = customState.players;
      if (customState.rules) baseRoom.rules = customState.rules;
      if (Array.isArray(customState.drawnTeams)) baseRoom.drawnTeams = customState.drawnTeams;
      if (customState.championship) baseRoom.championship = customState.championship;
    }

    rooms.set(code, baseRoom);
    res.json({ room: baseRoom });
  });

  // WebSocket handling
  wss.on('connection', (ws) => {
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    clients.set(ws, {
      ws,
      clientId,
      roomCode: null,
      userName: 'Convidado',
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const conn = clients.get(ws);
        if (!conn) return;

        if (msg.type === 'room:join') {
          const code = String(msg.roomCode || 'SOC-10').toUpperCase().trim();
          const userName = String(msg.userName || 'Atleta Convidado').trim();
          const role = msg.role === 'host' ? 'host' : 'guest';

          let room = rooms.get(code);
          if (!room) {
            room = buildInitialRoom(code, `Arena ${code}`, userName);
            rooms.set(code, room);
          }

          conn.roomCode = code;
          conn.userName = userName;

          // Idempotent participant add (deduplicate by clientId or seed name)
          room.participants = room.participants.filter(
            (p) => p.clientId !== conn.clientId && !(p.clientId === 'seed-host' && p.name === userName)
          );
          room.participants.push({
            clientId: conn.clientId,
            name: userName,
            role,
            joinedAt: Date.now(),
          });

          room.activityFeed = [
            {
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              text: `${userName} entrou na sala em tempo real`,
              timestamp: Date.now(),
            },
            ...room.activityFeed.slice(0, 19),
          ];
          room.updatedAt = Date.now();
          broadcastRoomState(code);
          return;
        }

        if (!conn.roomCode) return;
        const room = rooms.get(conn.roomCode);
        if (!room) return;

        if (msg.type === 'room:sync_full') {
          if (msg.payload) {
            if (msg.payload.players) room.players = msg.payload.players;
            if (msg.payload.rules) room.rules = msg.payload.rules;
            if (msg.payload.drawnTeams) room.drawnTeams = msg.payload.drawnTeams;
            if (msg.payload.coinToss) room.coinToss = msg.payload.coinToss;
            if (msg.payload.liveMatch) room.liveMatch = msg.payload.liveMatch;
            if (msg.payload.championship !== undefined) {
              room.championship = msg.payload.championship;
            }
          }
          if (msg.activityText) {
            room.activityFeed = [
              {
                id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                text: String(msg.activityText),
                timestamp: Date.now(),
              },
              ...room.activityFeed.slice(0, 19),
            ];
          }
          room.updatedAt = Date.now();
          broadcastRoomState(room.code);
        } else if (msg.type === 'room:add_player') {
          const newPlayer = msg.player;
          if (newPlayer && newPlayer.id && !room.players.some((p) => p.id === newPlayer.id)) {
            room.players.push(newPlayer);
            room.activityFeed = [
              {
                id: `act-${Date.now()}`,
                text: `${newPlayer.name} confirmou presença na lista (${
                  newPlayer.isGoalkeeper ? 'Goleiro' : 'Linha'
                })`,
                timestamp: Date.now(),
              },
              ...room.activityFeed.slice(0, 19),
            ];
            room.updatedAt = Date.now();
            broadcastRoomState(room.code);
          }
        } else if (msg.type === 'room:toggle_presence') {
          const target = room.players.find((p) => p.id === msg.playerId);
          if (target) {
            target.confirmed = !target.confirmed;
            room.activityFeed = [
              {
                id: `act-${Date.now()}`,
                text: `${target.name} ${
                  target.confirmed ? 'confirmou presença' : 'saiu da lista'
                }`,
                timestamp: Date.now(),
              },
              ...room.activityFeed.slice(0, 19),
            ];
            room.updatedAt = Date.now();
            broadcastRoomState(room.code);
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      const conn = clients.get(ws);
      if (conn && conn.roomCode) {
        const room = rooms.get(conn.roomCode);
        if (room) {
          room.participants = room.participants.filter((p) => p.clientId !== conn.clientId);
          room.updatedAt = Date.now();
          broadcastRoomState(room.code);
        }
      }
      clients.delete(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PeladaPro Server + WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
