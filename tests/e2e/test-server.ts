import { spawn } from "node:child_process";
import { createServer } from "node:net";

export async function withAppServer<T>(environment: Record<string, string>, callback: (origin: string) => Promise<T>) {
  const reservation = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", () => {
      const address = reservation.address();
      if (!address || typeof address === "string") return reject(new Error("No test port available."));
      reservation.close(() => resolve(address.port));
    });
  });
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, ADMIN_ORIGIN: `http://127.0.0.1:${port}`, NEWSLETTER_ORIGIN: `http://127.0.0.1:${port}`, ANALYTICS_ORIGIN:`http://127.0.0.1:${port}`, ...environment }, stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null || server.signalCode !== null) throw new Error("Isolated application server exited.");
      try { if ((await fetch(`${origin}/api/health`)).ok) { ready = true; break; } } catch { /* Wait for our own server only. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("Isolated application server did not become ready.");
    return await callback(origin);
  } finally {
    await new Promise<void>((resolve) => {
      if (server.exitCode !== null || server.signalCode !== null) { resolve(); return; }
      const stopped = () => { clearTimeout(timer); server.removeListener("exit", stopped); resolve(); };
      // Next's production server waits for active HTTP requests on SIGTERM.
      // Only this helper's own disposable child may be forced down after grace.
      const timer = setTimeout(() => {
        if (server.exitCode !== null || server.signalCode !== null) stopped();
        else {
          console.warn(JSON.stringify({ stage: "test-server.shutdown", codes: ["ISOLATED_SERVER_FORCE_STOP"] }));
          server.kill("SIGKILL");
        }
      }, 2000);
      timer.unref();
      server.once("exit", stopped);
      server.kill("SIGTERM");
    });
  }
}
