import fs = require("fs");
import path = require("path");
import stream = require("stream");
import util = require("util");
import zlib = require("zlib");
import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { WEB_APP_ENTRIES, WebAppEntry } from "./web_app_entries_def";
import { stripFileExtension } from "@selfage/cli/io_helper";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.json";
export let DEFAULT_BUNDLED_RESOURCES_FILE = "web_app_resources.json";

export async function bundleWebAppsAndCopyFiles(
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  bundledResourcesFile = DEFAULT_BUNDLED_RESOURCES_FILE,
  outDir?: string,
  options?: CommonBundleOptions
): Promise<void> {
  let jsonString = (await fs.promises.readFile(entriesConfigFile)).toString();
  let webAppEntries = parseMessage(JSON.parse(jsonString), WEB_APP_ENTRIES);
  let configDir = path.dirname(entriesConfigFile);
  let rootDir = path.join(configDir, webAppEntries.rootDir);

  let allFiles = await bundleWebApps(
    rootDir,
    configDir,
    webAppEntries.entries,
    webAppEntries.extraAssets,
    options
  );
  let allRelativeFiles = allFiles.map((file) =>
    path.relative(path.dirname(bundledResourcesFile), file)
  );
  await fs.promises.writeFile(
    bundledResourcesFile,
    JSON.stringify(allRelativeFiles)
  );
  if (!outDir || rootDir === path.normalize(outDir)) {
    return;
  }

  await Promise.all(allFiles.map((file) => copyFile(file, rootDir, outDir)));
}

async function copyFile(
  file: string,
  rootDir: string,
  outDir: string
): Promise<void> {
  let outFile = path.join(outDir, path.relative(rootDir, file));
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.copyFile(file, outFile);
}

export async function bundleWebApps(
  rootDir: string,
  configDir: string,
  webAppEntries: Array<WebAppEntry>,
  extraAssets: Array<string>,
  options?: CommonBundleOptions
): Promise<Array<string>> {
  let promises = new Array<Promise<Array<string>>>();
  for (let entry of webAppEntries) {
    promises.push(
      bundleAndGzip(
        path.join(configDir, entry.ts),
        path.join(configDir, entry.bin),
        rootDir,
        options
      ),
      writeHtmlFileAndGZip(path.join(configDir, entry.bin), rootDir)
    );
  }

  let allFiles = await Promise.all(promises);
  let flattenedFiles = new Array<string>();
  for (let files of allFiles) {
    flattenedFiles.push(...files);
  }
  for (let extraAsset of extraAssets) {
    flattenedFiles.push(path.join(configDir, extraAsset));
  }
  return flattenedFiles;
}

async function bundleAndGzip(
  sourceFile: string,
  outputFile: string,
  rootDir: string,
  options: CommonBundleOptions
): Promise<Array<string>> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    rootDir,
    options
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile);
  return [...assetFiles, jsFile, gzFile];
}

async function writeHtmlFileAndGZip(
  binFile: string,
  rootDir: string
): Promise<Array<string>> {
  let binModulePath = stripFileExtension(binFile);
  let htmlFile = binModulePath + ".html";
  let binJsPath = path.relative(rootDir, binModulePath + ".js");
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

async function gzipFile(
  file: string
): Promise<string> {
  await pipeline(
    fs.createReadStream(file),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(file + ".gz")
  );
  return file + ".gz";
}
