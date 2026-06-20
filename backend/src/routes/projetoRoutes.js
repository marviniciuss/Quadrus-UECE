import express from "express";
import {
  listarProjetos,
  obterProjeto,
  criarProjeto,
  atualizarProjeto,
  deletarProjeto,
  adicionarMembro,
} from "../controllers/projetoController.js";

const router = express.Router();

router.get("/", listarProjetos);
router.get("/:id", obterProjeto);
router.post("/", criarProjeto);
router.patch("/:id", atualizarProjeto);
router.delete("/:id", deletarProjeto);
router.post("/:id/membros", adicionarMembro);

export default router;