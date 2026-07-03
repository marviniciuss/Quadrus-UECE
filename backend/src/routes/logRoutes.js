import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  listarLogsProjeto,
  listarLogsCard,
  listarLogsSprint,
} from "../controllers/logController.js";

const router = express.Router();

// Listar todos os logs de um projeto
router.get("/projetos/:projectId/logs", verifyFirebaseToken, listarLogsProjeto);

// Listar logs de um card
router.get("/logs/card/:id", verifyFirebaseToken, listarLogsCard);

// Listar logs de uma sprint
router.get("/logs/sprint/:id", verifyFirebaseToken, listarLogsSprint);

export default router;
