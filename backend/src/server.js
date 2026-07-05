import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { verifyFirebaseToken } from './middlewares/auth.middleware.js';
import projetoRoutes from "./routes/projetoRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import sprintRoutes from "./routes/sprintRoutes.js";
import notificacaoRoutes from "./routes/notificacaoRoutes.js";
import colunaRoutes from "./routes/colunaRoutes.js";
import etiquetaRoutes from "./routes/etiquetaRoutes.js";
import membroProjetoRoutes from "./routes/membroProjetoRoutes.js";
import anexoCardRoutes from "./routes/anexoCardRoutes.js";
import votoPokerRoutes from "./routes/votoPokerRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import relatorioRoutes from "./routes/relatorioRoutes.js";
import { inicializarTimeoutsPoker } from "./utils/pokerScheduler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(cookieParser());

// Simple Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Demo Protected Endpoint using Firebase Auth
app.get('/api/protected', verifyFirebaseToken, (req, res) => {
  res.json({
    message: 'Acesso autorizado! Este é um endpoint altamente protegido.',
    user: req.user
  });
});

// API Routes
app.use("/api/projetos", projetoRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api", cardRoutes);
app.use("/api", sprintRoutes);
app.use("/api", notificacaoRoutes);
app.use("/api", colunaRoutes);
app.use("/api", etiquetaRoutes);
app.use("/api", membroProjetoRoutes);
app.use("/api", anexoCardRoutes);
app.use("/api", votoPokerRoutes);
app.use("/api", logRoutes);
app.use("/api/projetos/:projectId/relatorios", relatorioRoutes);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);
inicializarTimeoutsPoker(io);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Room subscription
  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined project room: ${projectId}`);
  });

  socket.on('leave_project', (projectId) => {
    socket.leave(projectId);
    console.log(`Socket ${socket.id} left project room: ${projectId}`);
  });

  // Poker room subscription
  socket.on('join_card_poker', (taskId) => {
    socket.join(`poker:${taskId}`);
    console.log(`Socket ${socket.id} joined poker session: ${taskId}`);
  });

  socket.on('leave_card_poker', (taskId) => {
    socket.leave(`poker:${taskId}`);
    console.log(`Socket ${socket.id} left poker session: ${taskId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Zod schema error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Quadrus Backend Server running on port ${PORT}`);
});