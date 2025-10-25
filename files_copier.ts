import fs = require("fs");
import path = require("path");

export async function copyFilesToDir(
  files: Array<string>,
  fromDir: string,
  toDir: string
): Promise<void> {
  await Promise.all(files.map((file) => copyFileToDir(file, fromDir, toDir)));
}

async function copyFileToDir(
  file: string,
  fromDir: string,
  toDir: string
): Promise<void> {
  let toFile = path.join(toDir, path.relative(fromDir, file));
  await fs.promises.mkdir(path.posix.dirname(toFile), { recursive: true });
  await fs.promises.copyFile(file, toFile);
}
