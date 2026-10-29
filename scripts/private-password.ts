import { emitKeypressEvents } from "node:readline";

export function readPassword(label: string): Promise<string> {
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

