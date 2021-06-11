import fs = require("fs");
import path = require("path");
import stream = require("stream");
import util = require("util");
import zlib = require("zlib");
import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { copyFiles } from "./files_copier";
import { WEB_APP_ENTRIES } from "./web_app_entries_def";
import { stripFileExtension } from "@selfage/cli/io_helper";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.json";
export let DEFAULT_BUNDLED_RESOURCES_FILE = "web_app_resources.json";

export async function bundleWebApps(
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  bundledResourcesFile = DEFAULT_BUNDLED_RESOURCES_FILE,
  baseDir = ".",
  outDir = ".",
  options?: CommonBundleOptions
): Promise<void> {
  let allFiles = await bundleWebAppsAndReturnBundledResources(
    entriesConfigFile,
    baseDir,
    options
  );
  let allRelativeFiles = allFiles.map((file) =>
    path.relative(path.dirname(bundledResourcesFile), file)
  );
  await fs.promises.writeFile(
    bundledResourcesFile,
    JSON.stringify(allRelativeFiles)
  );

  if (path.normalize(outDir) === path.normalize(baseDir)) {
    return;
  }
  await copyFiles(allFiles, baseDir, outDir);
}

export async function bundleWebAppsAndReturnBundledResources(
  entriesConfigFile: string,
  baseDir: string,
  options?: CommonBundleOptions
): Promise<Array<string>> {
  let webAppEntries = parseMessage(
    JSON.parse((await fs.promises.readFile(entriesConfigFile)).toString()),
    WEB_APP_ENTRIES
  );
  let configDir = path.dirname(entriesConfigFile);

  let promises = new Array<Promise<Array<string>>>();
  for (let entry of webAppEntries.entries) {
    promises.push(
      bundleAndGzip(
        path.join(configDir, entry.source),
        path.join(configDir, entry.output),
        baseDir,
        options
      ),
      writeHtmlFileAndGZip(path.join(configDir, entry.output), baseDir)
    );
  }

  let allFiles = await Promise.all(promises);
  let flattenedFiles = new Array<string>();
  for (let files of allFiles) {
    flattenedFiles.push(...files);
  }
  for (let extraAsset of webAppEntries.extraAssets) {
    flattenedFiles.push(path.join(configDir, extraAsset));
  }
  return flattenedFiles;
}

async function bundleAndGzip(
  sourceFile: string,
  outputFile: string,
  baseDir: string,
  options: CommonBundleOptions
): Promise<Array<string>> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    baseDir,
    options
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile);
  return [...assetFiles, jsFile, gzFile];
}

async function writeHtmlFileAndGZip(
  binFile: string,
  baseDir: string
): Promise<Array<string>> {
  let binModulePath = stripFileExtension(binFile);
  let htmlFile = binModulePath + ".html";
  let binJsPath = path.relative(baseDir, binModulePath + ".js");
  await fs.promises.writeFile(
    htmlFile,
    `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8"></head>
  <body>
    <script type="text/javascript" src="/${binJsPath}"></script>
  </body>
</html>`
  );
  let gzFile = await gzipFile(htmlFile);
  return [htmlFile, gzFile];
}

async function gzipFile(file: string): Promise<string> {
  await pipeline(
    fs.createReadStream(file),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(file + ".gz")
  );
  return file + ".gz";
}
