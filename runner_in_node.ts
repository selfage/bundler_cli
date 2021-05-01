import { bundleForNode, CommonBundleOptions } from "./bundler";
import { stripFileExtension } from "@selfage/cli/io_helper";
import { spawn } from "child_process";

export async function runInNode(
  sourceFile: string, // relative to '.'
  options?: CommonBundleOptions,
  args = new Array<string>()
): Promise<void> {
  let binFile = stripFileExtension(sourceFile) + "_bin.js";
  await bundleForNode(sourceFile, binFile, options);
  let childProcess = spawn("node", [binFile, ...args], { stdio: "inherit" });
  return new Promise<void>((resolve) => {
    childProcess.on("exit", (code) => {
      process.exitCode = code;
      resolve();
    });
  });
}
