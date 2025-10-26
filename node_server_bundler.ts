import path = require("path");
import { CommonBundleOptions, bundleForNodeReturnAssetFiles } from "./bundler";
import { stripFileExtension } from "./file_extension_stripper";
import { copyFilesToDir, moveFilesToDir } from "./files_copier";

export async function bundleNodeServer(
  serverSourceFile: string,
  serverOutputFile: string,
  fromDir = ".",
  toDir = fromDir,
  options: CommonBundleOptions = {},
): Promise<void> {
  let assetFiles = await bundleForNodeReturnAssetFiles(
    serverSourceFile,
    serverOutputFile,
    options,
  );

  if (path.posix.normalize(fromDir) === path.posix.normalize(toDir)) {
    return;
  }
  await Promise.all([
    moveFilesToDir(
      [stripFileExtension(serverOutputFile) + ".js"],
      fromDir,
      toDir,
    ),
    copyFilesToDir(assetFiles, fromDir, toDir),
  ]);
}
