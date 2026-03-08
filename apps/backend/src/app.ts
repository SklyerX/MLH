import { Hono } from "hono";
import closedTrackRoutes from "./routes/closed-track/routes.js";

export const app = new Hono();

app.route("/closed-track", closedTrackRoutes);
