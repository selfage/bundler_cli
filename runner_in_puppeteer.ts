import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { executeInPuppeteer } from "./puppeteer_executor";
import { stripFileExtension } from "@selfage/cli/io_helper";

export async function runInPuppeteer(
  sourceFile: string,
  baseDir?: string,
  port?: number,
  options?: CommonBundleOptions,
  args: Array<string> = []
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  await bundleForBrowserReturnAssetFiles(sourceFile, binFile, baseDir, options);
  await executeInPuppeteer(binFile, baseDir, true, port, args);
}
