import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  criarColuna,
  atualizarColuna,
  reordenarColunas,
  deletarColuna,
} from "../controllers/colunaController.js";

const router = express.Router();

router.post("/projetos/:idProjeto/colunas", verifyFirebaseToken, criarColuna);
router.put("/colunas/:id", verifyFirebaseToken, atualizarColuna);
router.put("/projetos/:idProjeto/colunas/reordenar", verifyFirebaseToken, reordenarColunas);
router.delete("/colunas/:id", verifyFirebaseToken, deletarColuna);

export default router;
