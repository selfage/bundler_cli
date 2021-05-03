import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { executeInPuppeteer } from "./puppeteer_executor";
import { stripFileExtension } from "@selfage/cli/io_helper";

export async function runInPuppeteer(
  sourceFile: string, // relative to `rootDir`
  rootDir?: string, // relative to '.'
  port?: number,
  options?: CommonBundleOptions,
  args = new Array<string>()
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  await bundleForBrowserReturnAssetFiles(
    sourceFile,
    binFile,
    rootDir,
    options
  );
  await executeInPuppeteer(binFile, rootDir, true, port, args);
}
