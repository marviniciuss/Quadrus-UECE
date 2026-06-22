import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  criarCard,
  atualizarStatusCard,
} from "../controllers/cardController.js";

const router = express.Router();

// Criar card dentro de um projeto
router.post("/projetos/:id/cards", verifyFirebaseToken, criarCard);

// Atualizar status de um card (drag & drop)
router.patch("/cards/:id/status", verifyFirebaseToken, atualizarStatusCard);

export default router;
