import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  listarUsuarios,
  buscarUsuarioPorId,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  buscarUsuarios,
} from "../controllers/usuarioController.js";

const router = express.Router();

router.get("/", verifyFirebaseToken, listarUsuarios);
router.get("/buscar", verifyFirebaseToken, buscarUsuarios);
router.get("/:id", verifyFirebaseToken, buscarUsuarioPorId);
router.post("/", verifyFirebaseToken, criarUsuario);
router.patch("/:id", verifyFirebaseToken, atualizarUsuario);
router.delete("/:id", verifyFirebaseToken, deletarUsuario);

export default router;