// Creates the multi-root workspace the integration tests open:
// .vscode-test/workspace/r3p0.code-workspace with three git repos and a plain folder.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(".vscode-test", "workspace");

/** Folder name → remotes ([] = a git repo without remotes, null = not a repo). */
const folders = {
  "origin-repo": [["origin", "https://github.com/test-owner/origin-repo.git"]],
  "upstream-only": [["upstream", "git@github.com:test-owner/upstream-only.git"]],
  "no-remote": [],
  "plain-folder": null,
};

rmSync(root, { recursive: true, force: true });
for (const [name, remotes] of Object.entries(folders)) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.md"), `# ${name}\n`);
  if (remotes === null) continue;
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  for (const [remote, url] of remotes) git("remote", "add", remote, url);
}

writeFileSync(
  join(root, "r3p0.code-workspace"),
  `${JSON.stringify({ folders: Object.keys(folders).map((path) => ({ path })) }, null, 2)}\n`,
);
console.log(`Created ${join(root, "r3p0.code-workspace")}`);
