import fs = require("fs");
import path = require("path");
import stream = require("stream");
import util = require("util");
import yaml = require("yaml");
import zlib = require("zlib");
import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { stripFileExtension } from "./file_extension_stripper";
import { copyFiles } from "./files_copier";
import { WEB_APP_ENTRIES } from "./web_app_entries_def";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.yaml";
export let DEFAULT_BUNDLED_RESOURCES_FILE = "web_app_resources.yaml";

export async function bundleWebApps(
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  bundledResourcesFile = DEFAULT_BUNDLED_RESOURCES_FILE,
  outDir?: string,
  options?: CommonBundleOptions,
): Promise<void> {
  let baseDir = path.posix.dirname(entriesConfigFile);
  let allFiles = await bundleWebAppsAndReturnBundledResources(
    entriesConfigFile,
    baseDir,
    options,
  );
  let allRelativeFiles = allFiles.map((file) =>
    path.posix.relative(path.posix.dirname(bundledResourcesFile), file),
  );
  await fs.promises.writeFile(
    bundledResourcesFile,
    yaml.stringify(allRelativeFiles),
  );

  if (
    !outDir ||
    path.posix.normalize(outDir) === path.posix.normalize(baseDir)
  ) {
    return;
  }
  await copyFiles(allFiles, baseDir, outDir);
}

export async function bundleWebAppsAndReturnBundledResources(
  entriesConfigFile: string,
  baseDir: string,
  options?: CommonBundleOptions,
): Promise<Array<string>> {
  let webAppEntries = parseMessage(
    yaml.parse((await fs.promises.readFile(entriesConfigFile)).toString()),
    WEB_APP_ENTRIES,
  );
  let configDir = path.posix.dirname(entriesConfigFile);

  let promises = new Array<Promise<Array<string>>>();
  for (let entry of webAppEntries.entries) {
    promises.push(
      bundleAndGzip(
        path.posix.join(configDir, entry.source),
        path.posix.join(configDir, entry.output),
        baseDir,
        options,
      ),
      writeHtmlFileAndGZip(path.posix.join(configDir, entry.output), baseDir),
    );
  }

  let allFiles = await Promise.all(promises);
  let flattenedFiles = new Array<string>();
  for (let files of allFiles) {
    flattenedFiles.push(...files);
  }
  if (webAppEntries.extraAssets) {
    for (let extraAsset of webAppEntries.extraAssets) {
      flattenedFiles.push(path.posix.join(configDir, extraAsset));
    }
  }
  return flattenedFiles;
}

async function bundleAndGzip(
  sourceFile: string,
  outputFile: string,
  baseDir: string,
  options: CommonBundleOptions,
): Promise<Array<string>> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    baseDir,
    options,
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile);
  return [...assetFiles, jsFile, gzFile];
}

async function writeHtmlFileAndGZip(
  binFile: string,
  baseDir: string,
): Promise<Array<string>> {
  let binModulePath = stripFileExtension(binFile);
  let htmlFile = binModulePath + ".html";
  let binJsPath = path.posix.relative(baseDir, binModulePath + ".js");
  await fs.promises.writeFile(
    htmlFile,
    `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8"></head>
  <body>
    <script type="text/javascript" src="/${binJsPath}"></script>
  </body>
</html>`,
  );
  let gzFile = await gzipFile(htmlFile);
  return [htmlFile, gzFile];
}

async function gzipFile(file: string): Promise<string> {
  await pipeline(
    fs.createReadStream(file),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(file + ".gz"),
  );
  return file + ".gz";
}
