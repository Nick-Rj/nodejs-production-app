import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";

const router = Router();

//Handling Routes
router.route("/register").post(registerUser);

export default router;
