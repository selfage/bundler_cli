import path = require("path");
import { CommonBundleOptions, bundleForNodeReturnAssetFiles } from "./bundler";
import { copyFiles } from "./files_copier";
import {
  DEFAULT_ENTRIES_CONFIG_FILE,
  bundleWebAppsAndReturnBundledResources,
} from "./web_app_bundler";
import { stripFileExtension } from "@selfage/cli/io_helper";

export async function bundleWebServer(
  serverSourceFile: string,
  serverOutputFile: string,
  webAppEntriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  webAppBaseDir = ".",
  fromDir = ".",
  toDir = fromDir,
  options: CommonBundleOptions = {}
): Promise<void> {
  let baseDirFromServer = path.relative(
    path.dirname(serverOutputFile),
    webAppBaseDir
  );
  options.inlineJs = options.inlineJs ?? new Array<string>();
  options.inlineJs.push(`let path = require("path");
globalThis.WEB_APP_BASE_DIR = path.join(__dirname, "${baseDirFromServer}");`);

  let [serverAssetFiles, webAppFiles] = await Promise.all([
    bundleForNodeReturnAssetFiles(serverSourceFile, serverOutputFile, options),
    bundleWebAppsAndReturnBundledResources(
      webAppEntriesConfigFile,
      webAppBaseDir,
      options
    ),
  ]);

  if (path.normalize(fromDir) === path.normalize(toDir)) {
    return;
  }
  await copyFiles(
    [
      stripFileExtension(serverOutputFile) + ".js",
      ...serverAssetFiles,
      ...webAppFiles,
    ],
    fromDir,
    toDir
  );
}
