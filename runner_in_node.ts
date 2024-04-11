import { CommonBundleOptions, bundleForNode } from "./bundler";
import { stripFileExtension } from "./file_extension_stripper";
import { spawn } from "child_process";

export async function runInNode(
  sourceFile: string,
  options?: CommonBundleOptions,
  args = new Array<string>(),
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  await bundleForNode(sourceFile, binFile, undefined, undefined, options);
  let childProcess = spawn("node", [binFile, ...args], { stdio: "inherit" });
  return new Promise<void>((resolve) => {
    childProcess.on("exit", (code) => {
      process.exitCode = code;
      resolve();
    });
  });
}
