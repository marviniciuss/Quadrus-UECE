import express from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import {
  criarEtiqueta,
  atualizarEtiqueta,
  deletarEtiqueta,
} from "../controllers/etiquetaController.js";

const router = express.Router();

router.post("/projetos/:idProjeto/etiquetas", verifyFirebaseToken, criarEtiqueta);
router.put("/etiquetas/:id", verifyFirebaseToken, atualizarEtiqueta);
router.delete("/etiquetas/:id", verifyFirebaseToken, deletarEtiqueta);

export default router;
