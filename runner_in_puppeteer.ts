import { CommonBundleOptions, bundleForBrowser } from "./bundler";
import { stripFileExtension } from "./file_extension_stripper";
import { execute } from "@selfage/puppeteer_test_executor";

export async function runInPuppeteer(
  sourceFile: string,
  baseDir?: string,
  port?: number,
  headless?: boolean,
  options?: CommonBundleOptions,
  args: Array<string> = [],
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  await bundleForBrowser(sourceFile, binFile, baseDir, baseDir, options);
  await execute(binFile, baseDir, true, port, headless, args);
}
