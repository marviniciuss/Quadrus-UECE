import express from "express";

import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

import {
    listarMembrosProjeto,
    buscarMembroPorId
} from "../controllers/membroProjetoController.js";

const router = express.Router();

router.get(
    "/projetos/:idProjeto/membros",
    verifyFirebaseToken,
    listarMembrosProjeto
);

router.get(
    "/projetos/:idProjeto/membros/:idUsuario",
    verifyFirebaseToken,
    buscarMembroPorId
);

export default router;
