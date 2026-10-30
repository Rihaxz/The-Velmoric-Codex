// Cek sintaks semua file JS di folder js/ (tanpa menjalankannya).
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = readdirSync("js").filter(name => name.endsWith(".js"));
let failed = 0;

for (const name of files) {
  try {
    execFileSync(process.execPath, ["--check", `js/${name}`], { stdio: "pipe" });
    console.log(`ok    js/${name}`);
  } catch (error) {
    failed++;
    console.error(`GAGAL js/${name}\n${error.stderr}`);
  }
}

process.exit(failed ? 1 : 0);
