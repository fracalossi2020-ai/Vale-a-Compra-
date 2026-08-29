import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { database } from "../database.js";

const schema = z.object({ email: z.email(), productUrl: z.url(), targetPrice: z.number().positive().optional() });

export async function alertRoutes(app: FastifyInstance) {
  app.post("/alerts", async (request, reply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Informe e-mail e produto válidos." });
    const pool = database();
    if (!pool) return reply.code(503).send({ message: "Configure o DATABASE_URL para ativar os alertas." });
    const result = await pool.query(
      `insert into price_alerts (email, product_url, target_price)
       values ($1, $2, $3)
       returning id, created_at`,
      [parsed.data.email.toLowerCase(), parsed.data.productUrl, parsed.data.targetPrice ?? null],
    );
    return reply.code(201).send({ ...result.rows[0], message: "Alerta criado. Avisaremos quando encontrarmos uma oferta melhor." });
  });
}
