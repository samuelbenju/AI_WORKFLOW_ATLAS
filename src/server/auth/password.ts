import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const passwordSchema = z.string().min(14, "Usa al menos 14 caracteres.").max(128, "Máximo 128 caracteres.");
const dummyHash = `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`;
const format = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(value: string): Promise<string> {
  const password = passwordSchema.parse(value);
  const salt = randomBytes(16);
  return `scrypt-v1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(value: string, encoded: string | null | undefined): Promise<boolean> {
  if (typeof value !== "string" || value.length > 128) return false;
  const valid = encoded ? format.exec(encoded) : null;
  const match = valid ?? format.exec(dummyHash)!;
  const key = await derive(value, Buffer.from(match[1]!, "hex"));
  const equal = timingSafeEqual(key, Buffer.from(match[2]!, "hex"));
  return Boolean(valid && equal);
}
