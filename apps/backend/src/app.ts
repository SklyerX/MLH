import { Hono } from "hono";
import closedTrackRoutes from "./routes/closed-track/routes.js";
import { cors } from "hono/cors";

export const app = new Hono();

app.use(cors());

app.route("/closed-track", closedTrackRoutes);
