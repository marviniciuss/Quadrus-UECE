import express from "express";
import { obterRDA, obterVelocity } from "../controllers/relatorioController.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = express.Router({ mergeParams: true });

// Rotas de relatórios - Apenas gerentes podem acessar as lógicas no controller
router.get("/rda", verifyFirebaseToken, obterRDA);
router.get("/velocity", verifyFirebaseToken, obterVelocity);

export default router;
