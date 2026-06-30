import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
} from "../controllers/notificacaoController.js";

const router = express.Router();

// Listar notificações do usuário autenticado
router.get("/notificacoes", verifyFirebaseToken, listarNotificacoes);

// Marcar uma notificação como lida
router.patch("/notificacoes/:id/ler", verifyFirebaseToken, marcarComoLida);

// Marcar todas as notificações como lidas
router.post("/notificacoes/ler-todas", verifyFirebaseToken, marcarTodasComoLidas);

export default router;
