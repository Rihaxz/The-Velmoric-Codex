// Cek sintaks semua file JS situs (tanpa menjalankannya).
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function listJs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return listJs(path);
    return item.name.endsWith(".js") ? [path] : [];
  });
}

const files = [...listJs("js"), "sw.js"];
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    console.log(`ok    ${file}`);
  } catch (error) {
    failed++;
    console.error(`GAGAL ${file}\n${error.stderr}`);
  }
}

process.exit(failed ? 1 : 0);
