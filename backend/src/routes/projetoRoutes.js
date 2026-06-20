import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  listarProjetos,
  obterProjeto,
  criarProjeto,
  atualizarProjeto,
  deletarProjeto,
  adicionarMembro,
} from "../controllers/projetoController.js";

const router = express.Router();

router.get("/", verifyFirebaseToken, listarProjetos);
router.get("/:id", verifyFirebaseToken, obterProjeto);
router.post("/", verifyFirebaseToken, criarProjeto);
router.patch("/:id", verifyFirebaseToken, atualizarProjeto);
router.delete("/:id", verifyFirebaseToken, deletarProjeto);
router.post("/:id/membros", verifyFirebaseToken, adicionarMembro);

export default router;