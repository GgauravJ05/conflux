import { Router } from "express";
import { aiStatus, summariseMeeting } from "../controllers/ai.controller.js";

const router = Router();

router.route("/status").get(aiStatus);
router.route("/summary").post(summariseMeeting);

export default router;
