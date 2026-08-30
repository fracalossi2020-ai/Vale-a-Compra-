import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MercadoLivreProvider } from "../marketplaces/mercado-livre.js";
import { StructuredProductProvider } from "../marketplaces/structured-product.js";
import { scoreProduct } from "./scoring.js";
import { database } from "../database.js";
import { mercadoLivreCredentialsConfigured } from "../marketplaces/mercado-livre-token.js";

const providers = [new MercadoLivreProvider(), new StructuredProductProvider()];
const bodySchema = z.object({ url: z.url() });

export async function analysisRoutes(app: FastifyInstance) {
  app.get("/integrations/mercado-livre/status", async () => ({
    marketplace: "Mercado Livre",
    configured: mercadoLivreCredentialsConfigured(),
    authentication: process.env.MERCADO_LIVRE_ACCESS_TOKEN ? "access_token" : "client_credentials",
  }));

  app.post("/analysis", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Cole uma URL de produto válida." });

    const url = new URL(parsed.data.url);
    const compatibleProviders = providers.filter((candidate) => candidate.supports(url));
    if (!compatibleProviders.length) return reply.code(422).send({ message: "Ainda não reconhecemos esse marketplace. Use Mercado Livre, Amazon, Shopee, Magalu, Netshoes ou Centauro." });

    const failures: string[] = [];
    for (const provider of compatibleProviders) try {
      const product = await provider.analyze(url);
      const analysis = scoreProduct(product);
      const pool = database();
      if (pool) {
        pool.query(
          "insert into analyses (product_url, marketplace, product_external_id, score, verdict, snapshot) values ($1, $2, $3, $4, $5, $6)",
          [analysis.productUrl, analysis.marketplace, product.id, analysis.score, analysis.verdict, JSON.stringify(analysis)],
        ).catch((databaseError) => request.log.warn(databaseError, "Não foi possível registrar a análise"));
      }
      return analysis;
    } catch (error) {
      request.log.warn(error);
      failures.push(error instanceof Error ? error.message : "Falha desconhecida");
    }
    const isMercadoLivre = url.hostname.includes("mercadolivre") || url.hostname === "meli.la";
    return reply.code(502).send({
      code: isMercadoLivre ? "MERCADO_LIVRE_AUTH_REQUIRED" : "PRODUCT_DATA_UNAVAILABLE",
      message: isMercadoLivre
        ? "O Mercado Livre bloqueou a consulta pública. Conecte a API do Mercado Livre para analisar esta oferta."
        : failures.at(-1) ?? "Não foi possível analisar o produto.",
    });
  });
}
