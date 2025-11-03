import fs = require("fs");
import path = require("path");

export async function copyFilesToDir(
  files: Array<string>,
  fromDir: string,
  toDir: string,
): Promise<void> {
  await Promise.all(files.map((file) => copyFileToDir(file, fromDir, toDir)));
}

async function copyFileToDir(
  file: string,
  fromDir: string,
  toDir: string,
): Promise<void> {
  let toFile = path.posix.join(toDir, path.posix.relative(fromDir, file));
  await fs.promises.mkdir(path.posix.dirname(toFile), { recursive: true });
  await fs.promises.copyFile(file, toFile);
}

export async function moveFilesToDir(
  files: Array<string>,
  fromDir: string,
  toDir: string,
): Promise<void> {
  await Promise.all(files.map((file) => moveFileToDir(file, fromDir, toDir)));
}

async function moveFileToDir(
  file: string,
  fromDir: string,
  toDir: string,
): Promise<void> {
  let toFile = path.posix.join(toDir, path.posix.relative(fromDir, file));
  await fs.promises.mkdir(path.posix.dirname(toFile), { recursive: true });
  await fs.promises.rename(file, toFile);
}
