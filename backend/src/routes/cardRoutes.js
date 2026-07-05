import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  criarCard,
  listarCards,
  buscarCard,
  atualizarCard,
  excluirCard,
  atualizarStatusCard,
  reordenarCards,
  sinalizarRiscoCard,
} from "../controllers/cardController.js";

const router = express.Router();

// Criar card dentro de um projeto
router.post("/projetos/:id/cards", verifyFirebaseToken, criarCard);

// Listar cards de um projeto
router.get("/projetos/:id/cards", verifyFirebaseToken, listarCards);

// Buscar card pelo ID
router.get("/cards/:id", verifyFirebaseToken, buscarCard);

// Atualizar card
router.put("/cards/:id", verifyFirebaseToken, atualizarCard);
router.patch("/cards/:id", verifyFirebaseToken, atualizarCard);

// Excluir card
router.delete("/cards/:id", verifyFirebaseToken, excluirCard);

// Atualizar status do card (drag & drop)
router.patch("/cards/:id/status", verifyFirebaseToken, atualizarStatusCard);

router.patch("/cards/:id/reordenar", verifyFirebaseToken, reordenarCards);

// Sinalizar risco de atraso no card
router.patch("/cards/:id/risco", verifyFirebaseToken, sinalizarRiscoCard);

export default router;