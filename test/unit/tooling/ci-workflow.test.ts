// Guards the CI rules from docs/PLAN.md §8.6 that are easy to lose in an edit.
// The workflow is checked as text; each gate is also proven red once on a
// throwaway branch (see the PR for #7).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { root } from "./support";

const workflowPath = join(root, ".github", "workflows", "ci.yml");
const workflow = () => readFileSync(workflowPath, "utf8").replace(/\r\n/g, "\n");

/** The job blocks under `jobs:`, by name. */
function jobs(): Record<string, string> {
  const body = workflow().split(/^jobs:\n/m)[1] ?? "";
  const result: Record<string, string> = {};
  for (const block of body.split(/^(?=  [a-z][\w-]*:\n)/m)) {
    const name = /^ {2}([a-z][\w-]*):/.exec(block)?.[1];
    if (name) result[name] = block;
  }
  return result;
}

describe("CI workflow", () => {
  it("exists", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("runs on pushes except docs/** branches, and on pull requests", () => {
    expect(workflow()).toMatch(/push:\n\s+branches-ignore:\s*\[\s*"docs\/\*\*"\s*\]/);
    expect(workflow()).toMatch(/^\s+pull_request:/m);
  });

  it("has the check, unit, integration and package jobs", () => {
    expect(Object.keys(jobs()).sort()).toEqual(["check", "integration", "package", "unit"]);
  });

  it("every job skips pull requests from docs/** branches", () => {
    for (const [name, block] of Object.entries(jobs())) {
      expect(block, name).toContain("if: ${{ !startsWith(github.head_ref, 'docs/') }}");
    }
  });

  it("check runs lint, typecheck and the format check", () => {
    const check = jobs().check ?? "";
    for (const script of ["npm run lint", "npm run typecheck", "npm run format:check"]) {
      expect(check).toContain(script);
    }
  });

  it("unit runs the coverage gate on ubuntu and windows", () => {
    const unit = jobs().unit ?? "";
    expect(unit).toMatch(/os:\s*\[\s*ubuntu-latest,\s*windows-latest\s*\]/);
    expect(unit).toContain("npm run coverage");
  });

  it("integration runs under xvfb on ubuntu", () => {
    const integration = jobs().integration ?? "";
    expect(integration).toContain("runs-on: ubuntu-latest");
    expect(integration).toContain("xvfb-run -a npm run test:integration");
  });

  it("package needs every other job and uploads the .vsix", () => {
    const pkg = jobs().package ?? "";
    expect(pkg).toMatch(/needs:\s*\[\s*check,\s*unit,\s*integration\s*\]/);
    expect(pkg).toContain("npm run package");
    expect(pkg).toMatch(/path:\s*r3p0-\*\.vsix/);
  });

  it("every job uses Node 24 with npm ci", () => {
    for (const [name, block] of Object.entries(jobs())) {
      expect(block, name).toMatch(/node-version:\s*24/);
      expect(block, name).toContain("npm ci");
    }
  });
});

describe("repository templates", () => {
  it("the bug template requires a failing test that reproduces the bug", () => {
    const bug = readFileSync(join(root, ".github", "ISSUE_TEMPLATE", "bug.md"), "utf8");
    expect(bug).toMatch(/Failing test that reproduces it/);
  });

  it("the PR template has the red/green/refactor, README and ROADMAP checks", () => {
    const pr = readFileSync(join(root, ".github", "pull_request_template.md"), "utf8");
    for (const item of [/Closes #/, /red/i, /green/i, /refactor/i, /README\.md/, /ROADMAP\.md/]) {
      expect(pr).toMatch(item);
    }
  });

  it("the README shows the CI badge", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(readme).toContain("actions/workflows/ci.yml/badge.svg");
  });
});
