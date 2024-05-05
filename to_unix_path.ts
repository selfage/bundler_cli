import path = require("path");
import { CommonBundleOptions } from "./bundler";

export function toUnixPath(originalPath?: string): string {
  if (!originalPath) {
    return undefined;
  } 
  return originalPath.split(path.sep).join(path.posix.sep);
}

export function toUnixPathFromBundleOptions(
  options?: CommonBundleOptions,
): CommonBundleOptions {
  if (!options) {
    return undefined;
  }
  if (options.extraFiles) {
    options.extraFiles = options.extraFiles.map((file) => toUnixPath(file));
  }
  if (options.packageJsonFile) {
    options.packageJsonFile = toUnixPath(options.packageJsonFile);
  }
  if (options.tsconfigFile) {
    options.tsconfigFile = toUnixPath(options.tsconfigFile);
  }
  return options;
}
