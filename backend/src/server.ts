import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { analysisRoutes } from "./analysis/routes.js";
import { alertRoutes } from "./alerts/routes.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.FRONTEND_URL ?? "http://localhost:3000" });
app.get("/health", async () => ({ status: "ok", service: "vale-ou-e-golpe-api" }));
await app.register(analysisRoutes, { prefix: "/api" });
await app.register(alertRoutes, { prefix: "/api" });

const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
