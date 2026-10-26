import { config } from "dotenv";
import { emitKeypressEvents } from "node:readline";
import { z } from "zod";
import { createDatabaseClient } from "../src/server/db/client";
import { requireDatabaseUrl } from "../src/server/db/url";
import { initializeOwner, replacePassword } from "../src/server/auth/service";
import { passwordSchema } from "../src/server/auth/password";
import pg from "pg";
import { stagingConfiguration, stagingIdentity } from "./staging-connection";

config({ path: [".env.local", ".env"], quiet: true });

function readPassword(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run this command in an interactive terminal. Passwords are never accepted as command arguments or written to files.");
  process.stdout.write(label); emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => { process.stdin.off("keypress", handle); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    const handle = (text: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") { finish(); reject(new Error("Initialization cancelled.")); }
      else if (key.name === "return") { finish(); resolve(value); }
      else if (key.name === "backspace") value = value.slice(0, -1);
      else if (text && !key.ctrl && value.length < 129 && !/[\r\n\x00-\x1f]/.test(text)) value += text;
    };
    process.stdin.on("keypress", handle);
  });
}

async function main() {
  const rotate = process.argv.includes("--rotate");
  const emailIndex = process.argv.indexOf("--email");
  const email = z.email().max(320).parse(emailIndex >= 0 ? process.argv[emailIndex + 1] : process.env.ADMIN_BOOTSTRAP_EMAIL).toLowerCase();
  if (process.argv.some((arg) => /password|contrase/i.test(arg))) throw new Error("Do not pass credentials as arguments.");
  let databaseUrl = requireDatabaseUrl(process.env.DATABASE_URL);
  if (process.argv.includes('--staging')) {
    // The owner enters the password locally; no bootstrap web route or CI
    // password secret is introduced. The staging guard never uses a DB owner.
    const cfg = stagingConfiguration(process.env.DATABASE_URL, ['atlas_staging_app'], process.env.NEON_STAGING_EXPECTED_HOST);
    const probe = new pg.Client(cfg.client);
    probe.on('error', () => { /* Private provider details are never logged. */ });
    try { await probe.connect(); await stagingIdentity(probe, cfg.role); }
    finally { await probe.end(); }
    databaseUrl = cfg.canonical;
  }
  process.stdout.write(rotate ? "Cambiar contraseña e invalidar sesiones del administrador.\n" : "Inicializar el primer propietario. No se guardarán contraseñas en archivos.\n");
  const password = passwordSchema.parse(await readPassword("Contraseña nueva (mínimo 14 caracteres, sin eco): "));
  if (password !== await readPassword("Repite la contraseña (sin eco): ")) throw new Error("Passwords do not match.");
  const db = createDatabaseClient(databaseUrl);
  try {
    if (rotate) await replacePassword(email, password, db); else await initializeOwner(email, password, db);
    console.log(rotate ? "Contraseña actualizada; sesiones anteriores revocadas." : "Propietario inicializado. Ya puedes iniciar sesión.");
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("No se completó la operación. Comprueba el correo privado, PostgreSQL, los requisitos de contraseña y si el propietario ya existe. No se imprimen credenciales."); process.exitCode = 1; });
