import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  listarProjetos,
  listarProjetosDoUsuario,
  obterProjeto,
  criarProjeto,
  atualizarProjeto,
  deletarProjeto,
  adicionarMembro,
  removerMembro,
  atualizarMembro,
} from "../controllers/projetoController.js";

const router = express.Router();

router.get("/", verifyFirebaseToken, listarProjetos);
router.get("/meus", verifyFirebaseToken, listarProjetosDoUsuario);
router.get("/:id", verifyFirebaseToken, obterProjeto);
router.post("/", verifyFirebaseToken, criarProjeto);
router.patch("/:id", verifyFirebaseToken, atualizarProjeto);
router.delete("/:id", verifyFirebaseToken, deletarProjeto);
router.post("/:id/membros", verifyFirebaseToken, adicionarMembro);
router.delete("/:id/membros/:idUsuario", verifyFirebaseToken, removerMembro);
router.patch("/:id/membros/:idUsuario", verifyFirebaseToken, atualizarMembro);

export default router;