import { Router, type IRouter } from "express";
import { getSupabaseStatus } from "../lib/supabase";

const router: IRouter = Router();

router.get("/supabase/status", async (_req, res) => {
  const status = await getSupabaseStatus();
  res.status(status.connected ? 200 : 503).json({
    provider: "supabase",
    ...status,
  });
});

export default router;