import path = require("path");

export function stripFileExtension(file: string): string {
  let pathObj = path.posix.parse(file);
  pathObj.base = undefined;
  pathObj.ext = undefined;
  return path.posix.format(pathObj);
}
