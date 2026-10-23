import fs from "node:fs";
import { execFileSync } from "node:child_process";
// Only reviewed source paths. No database, uploads, session secrets, .env, or Git credentials.
const paths = [
  "package.json",
  "package-lock.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "Dockerfile",
  ".dockerignore",
  ".gitignore",
  ".env.example",
  ".github",
  "src",
  "public",
  "server",
  "scripts",
  "infra",
  "compose.yaml",
  "README.md",
  "DEVELOPMENT.md",
  "VALIDATION.md",
  "AGENTS.md",
  "MOBILE_RESPONSIVE_SPEC.md",
  "CODEX_MASTER_SPEC.md",
  "DATA_MODEL_AND_API.md",
  "AWS_SECURITY_DEPLOYMENT.md",
  "docs",
  "reference",
  "tests",
];
for (const file of paths)
  if (!fs.existsSync(file)) throw Error(`Missing source path: ${file}`);
execFileSync(
  "python3",
  [
    "-c",
    `import zipfile,pathlib,sys
with zipfile.ZipFile('Meda-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for entry in sys.argv[1:]:
  p=pathlib.Path(entry)
  if p.is_file(): z.write(p,p.as_posix())
  else:
   for f in sorted(p.rglob('*')):
    if f.is_file() and '__pycache__' not in f.parts:z.write(f,f.as_posix())
`,
    ...paths,
  ],
  { stdio: "inherit" },
);
console.log(
  "Created Meda-source.zip (no accounts, private data, or credentials).",
);
