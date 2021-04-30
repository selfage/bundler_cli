import { CommonBundleOptions, bundleForBrowser } from "./bundler";
import { execute } from "./puppeteer_executor";
import { stripFileExtension } from "@selfage/cli/io_helper";

export async function runInPuppeteer(
  sourceFile: string,
  rootDir?: string,
  port?: number,
  options?: CommonBundleOptions,
  args = new Array<string>()
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  let outputFiles = await bundleForBrowser(
    sourceFile,
    binFile,
    rootDir,
    options
  );
  await execute(binFile, outputFiles.rootDir, port, args);
}
