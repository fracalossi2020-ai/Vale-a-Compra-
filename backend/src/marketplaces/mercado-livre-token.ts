interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}

import { readMercadoLivreCredentials, saveMercadoLivreCredentials } from "./mercado-livre-credentials.js";

let cachedToken: { value: string; expiresAt: number } | undefined;
let pendingToken: Promise<string | undefined> | undefined;

async function requestApplicationToken() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return undefined;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao autenticar a aplicação no Mercado Livre (${response.status}): ${details.slice(0, 180)}`);
  }

  const token = await response.json() as TokenResponse;
  if (!token.access_token) throw new Error("O Mercado Livre não devolveu um access token.");
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + Math.max(60, (token.expires_in ?? 21_600) - 300) * 1_000,
  };
  return cachedToken.value;
}

async function refreshUserToken(refreshToken: string) {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Credenciais do aplicativo não configuradas.");
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Não foi possível renovar a autorização do Mercado Livre (${response.status}).`);
  const token = await response.json() as TokenResponse;
  await saveMercadoLivreCredentials({
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (token.expires_in ?? 21_600) * 1_000),
  });
  return token.access_token;
}

export async function getMercadoLivreToken() {
  const staticToken = process.env.MERCADO_LIVRE_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;
  const stored = await readMercadoLivreCredentials();
  if (stored) {
    if (stored.expiresAt.getTime() > Date.now() + 300_000) return stored.accessToken;
    if (stored.refreshToken) return refreshUserToken(stored.refreshToken);
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  pendingToken ??= requestApplicationToken().finally(() => { pendingToken = undefined; });
  return pendingToken;
}

export function mercadoLivreCredentialsConfigured() {
  return Boolean(
    process.env.MERCADO_LIVRE_ACCESS_TOKEN?.trim()
    || (process.env.MERCADO_LIVRE_CLIENT_ID?.trim() && process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim()),
  );
}
