import { execSync } from "child_process";

const out = execSync("npx --yes patchright@1.64.1 --version", { encoding: "utf8" });
console.log("ver", out.trim());
try {
  const pr = await import("patchright");
  console.log(typeof pr.chromium);
} catch (e) {
  console.error("err");
}
