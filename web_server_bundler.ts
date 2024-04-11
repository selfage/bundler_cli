import path = require("path");
import { CommonBundleOptions, bundleForNodeReturnAssetFiles } from "./bundler";
import { stripFileExtension } from "./file_extension_stripper";
import { copyFiles } from "./files_copier";
import {
  DEFAULT_ENTRIES_CONFIG_FILE,
  bundleWebAppsAndReturnBundledResources,
} from "./web_app_bundler";

export async function bundleWebServer(
  serverSourceFile: string,
  serverOutputFile: string,
  webAppEntriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  fromDir = ".",
  toDir = fromDir,
  options: CommonBundleOptions = {},
): Promise<void> {
  let webAppBaseDir = path.posix.dirname(webAppEntriesConfigFile);
  let baseDirFromServer = path.posix.relative(
    path.posix.dirname(serverOutputFile),
    webAppBaseDir,
  );
  options.inlineJs = options.inlineJs ?? new Array<string>();
  options.inlineJs.push(`let path = require("path");
globalThis.WEB_APP_BASE_DIR = path.join(__dirname, "${baseDirFromServer}");`);

  let [serverAssetFiles, webAppFiles] = await Promise.all([
    bundleForNodeReturnAssetFiles(serverSourceFile, serverOutputFile, options),
    bundleWebAppsAndReturnBundledResources(
      webAppEntriesConfigFile,
      webAppBaseDir,
      options,
    ),
  ]);

  if (path.posix.normalize(fromDir) === path.posix.normalize(toDir)) {
    return;
  }
  await copyFiles(
    [
      stripFileExtension(serverOutputFile) + ".js",
      ...serverAssetFiles,
      ...webAppFiles,
    ],
    fromDir,
    toDir,
  );
}
