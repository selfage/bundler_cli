import fs = require("fs");
import path = require("path");

export async function copyFiles(
  files: Array<string>,
  fromDir: string,
  toDir: string
): Promise<void> {
  await Promise.all(files.map((file) => copyFile(file, fromDir, toDir)));
}

async function copyFile(
  file: string,
  fromDir: string,
  toDir: string
): Promise<void> {
  let toFile = path.join(toDir, path.relative(fromDir, file));
  await fs.promises.mkdir(path.dirname(toFile), { recursive: true });
  await fs.promises.copyFile(file, toFile);
}
