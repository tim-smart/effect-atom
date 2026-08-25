/* eslint-disable */
const Fs = require("node:fs");
const Path = require("node:path");

function packages() {
  return Fs.readdirSync("packages").filter((_) =>
    Fs.existsSync(Path.join("packages", _, "docs/modules"))
  );
}

function pkgName(pkg) {
  return require(Path.join(process.cwd(), "packages", pkg, "package.json")).name;
}

function copyFiles(pkg) {
  const name = pkgName(pkg);
  const docs = Path.join("packages", pkg, "docs/modules");
  const dest = Path.join("docs", pkg);
  const files = Fs.readdirSync(docs, { withFileTypes: true });

  function handleFiles(root, files) {
    for (const file of files) {
      const path = Path.join(docs, root, file.name);
      const destPath = Path.join(dest, root, file.name);

      if (file.isDirectory()) {
        Fs.mkdirSync(destPath, { recursive: true });
        handleFiles(file.name, Fs.readdirSync(path, { withFileTypes: true }));
        continue;
      }

      const content = Fs.readFileSync(path, "utf8").replace(
        /^parent: Modules$/m,
        `parent: "${name}"\ngrand_parent: "Reference"`
      );
      Fs.writeFileSync(destPath, content);
    }
  }

  Fs.rmSync(dest, { recursive: true, force: true });
  Fs.mkdirSync(dest, { recursive: true });
  handleFiles("", files);
}

function generateIndex(pkg, order) {
  const name = pkgName(pkg);
  const content = `---
title: "${name}"
has_children: true
permalink: /docs/${pkg}
nav_order: ${order}
parent: "Reference"
---
`;

  Fs.writeFileSync(Path.join("docs", pkg, "index.md"), content);
}

packages().forEach((pkg, i) => {
  Fs.rmSync(Path.join("docs", pkg), { recursive: true, force: true });
  Fs.mkdirSync(Path.join("docs", pkg), { recursive: true });
  copyFiles(pkg);
  generateIndex(pkg, i + 1);
});
