import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import meRouter from "./me";
import supabaseRouter from "./supabase";
import voiceRouter from "./voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(supabaseRouter);
router.use(voiceRouter);

export default router;
