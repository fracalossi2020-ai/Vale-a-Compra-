import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { database, ensureCoreSchema } from "../database.js";

export interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

function key() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim()
    || process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("Chave de criptografia não configurada.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export async function readMercadoLivreCredentials(): Promise<StoredCredentials | undefined> {
  const pool = database();
  if (!pool) return undefined;
  await ensureCoreSchema();
  const result = await pool.query("select access_token, refresh_token, expires_at from marketplace_credentials where marketplace = 'mercado_livre'");
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    accessToken: decrypt(row.access_token),
    refreshToken: row.refresh_token ? decrypt(row.refresh_token) : undefined,
    expiresAt: new Date(row.expires_at),
  };
}

export async function saveMercadoLivreCredentials(credentials: StoredCredentials) {
  const pool = database();
  if (!pool) throw new Error("DATABASE_URL não configurado.");
  await ensureCoreSchema();
  await pool.query(`
    insert into marketplace_credentials (marketplace, access_token, refresh_token, expires_at, updated_at)
    values ('mercado_livre', $1, $2, $3, now())
    on conflict (marketplace) do update set
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      updated_at = now()
  `, [encrypt(credentials.accessToken), credentials.refreshToken ? encrypt(credentials.refreshToken) : null, credentials.expiresAt]);
}
