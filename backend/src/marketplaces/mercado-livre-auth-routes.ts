import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { readMercadoLivreCredentials, saveMercadoLivreCredentials } from "./mercado-livre-credentials.js";

const states = new Map<string, number>();

function configuration() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim();
  const publicUrl = process.env.PUBLIC_URL?.trim()?.replace(/\/$/, "");
  if (!clientId || !clientSecret || !publicUrl) throw new Error("Client ID, Client Secret ou PUBLIC_URL não configurado.");
  return { clientId, clientSecret, redirectUri: `${publicUrl}/api/auth/mercado-livre/callback` };
}

export async function mercadoLivreAuthRoutes(app: FastifyInstance) {
  app.get("/auth/mercado-livre", async (request, reply) => {
    const query = request.query as { reauthorize?: string };
    const existing = await readMercadoLivreCredentials();
    if (existing && query.reauthorize !== "1") return reply.type("text/html; charset=utf-8").send("<h1>Mercado Livre j&aacute; conectado.</h1><p>Voc&ecirc; pode fechar esta janela ou <a href='/api/auth/mercado-livre?reauthorize=1'>renovar as permiss&otilde;es</a>.</p>");
    const { clientId, redirectUri } = configuration();
    const state = randomBytes(24).toString("base64url");
    states.set(state, Date.now() + 10 * 60_000);
    const authorization = new URL("https://auth.mercadolivre.com.br/authorization");
    authorization.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, state }).toString();
    return reply.redirect(authorization.href);
  });

  app.get("/auth/mercado-livre/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    const expiresAt = query.state ? states.get(query.state) : undefined;
    if (query.error) return reply.code(400).type("text/html").send(`<h1>Autorização cancelada</h1><p>${query.error}</p>`);
    if (!query.code || !query.state || !expiresAt || expiresAt < Date.now()) return reply.code(400).type("text/html").send("<h1>Autorização inválida ou expirada.</h1>");
    states.delete(query.state);
    const { clientId, clientSecret, redirectUri } = configuration();
    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code: query.code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(10_000),
    });
    const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; message?: string };
    if (!response.ok || !token.access_token) return reply.code(502).type("text/html").send(`<h1>Falha ao conectar</h1><p>${token.message ?? `Erro ${response.status}`}</p>`);
    await saveMercadoLivreCredentials({ accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: new Date(Date.now() + (token.expires_in ?? 21_600) * 1_000) });
    return reply.type("text/html; charset=utf-8").send("<main style='font-family:sans-serif;max-width:600px;margin:80px auto;text-align:center'><h1>Mercado Livre conectado!</h1><p>Os tokens foram armazenados de forma criptografada. Voc&ecirc; j&aacute; pode fechar esta janela e analisar ofertas.</p><a href='/'>Voltar ao Vale a compra?</a></main>");
  });
}
