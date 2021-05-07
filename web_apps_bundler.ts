import fs = require("fs");
import path = require("path");
import stream = require("stream");
import util = require("util");
import zlib = require("zlib");
import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
} from "./bundler";
import { WEB_APP_ENTRIES } from "./web_app_entries_def";
import { stripFileExtension } from "@selfage/cli/io_helper";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.json";
export let DEFAULT_BUNDLED_RESOURCES_FILE = "web_app_resources.json";

export async function bundleWebAppsAndCopyFiles(
  rootDir = ".", // relative to '.'
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE, // relative to `rootDir`
  outDir = ".", // relative to '.'
  bundledResourcesFile = DEFAULT_BUNDLED_RESOURCES_FILE, // relative to `rootDir`
  options?: CommonBundleOptions
): Promise<void> {
  let allFiles = await bundleWebApps(rootDir, entriesConfigFile, options);
  await fs.promises.writeFile(
    path.join(rootDir, bundledResourcesFile),
    JSON.stringify(allFiles)
  );
  if (rootDir === outDir) {
    return;
  }

  allFiles.push(bundledResourcesFile);
  await Promise.all(allFiles.map((file) => copyFile(file, rootDir, outDir)));
}

async function copyFile(
  file: string, // Relative to both `fromDir` and `outDir`.
  fromDir: string,
  outDir: string
): Promise<void> {
  let outFile = path.join(outDir, file);
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.copyFile(path.join(fromDir, file), outFile);
}

// Returned files are relative to `rootDir`.
export async function bundleWebApps(
  rootDir: string, // relative to '.'
  entriesConfigFile: string, // relative to `rootDir`
  options?: CommonBundleOptions
): Promise<Array<string>> {
  let jsonString = (
    await fs.promises.readFile(path.join(rootDir, entriesConfigFile))
  ).toString();
  let webAppEntries = parseMessage(JSON.parse(jsonString), WEB_APP_ENTRIES);

  let configDir = path.dirname(entriesConfigFile);
  let promises = new Array<Promise<Array<string>>>();
  for (let entry of webAppEntries.entries) {
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
  for (let extraAsset of webAppEntries.extraAssets) {
    flattenedFiles.push(path.join(configDir, extraAsset));
  }
  return flattenedFiles;
}

// Returned files are relative to `rootDir`.
async function bundleAndGzip(
  sourceFile: string, // relative to `rootDir`
  outputFile: string, // relative to `rootDir`
  rootDir: string, // relative to '.'
  options: CommonBundleOptions
): Promise<Array<string>> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    rootDir,
    options
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile, rootDir);
  return [...assetFiles, jsFile, gzFile];
}

// Returned files are relative to `rootDir`.
async function writeHtmlFileAndGZip(
  binFile: string, // relative to `rootDir`
  rootDir: string // relative to '.'
): Promise<Array<string>> {
  let binModulePath = stripFileExtension(binFile);
  let htmlFile = binModulePath + ".html";
  await fs.promises.writeFile(
    path.join(rootDir, htmlFile),
    `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8"></head>
  <body>
    <script type="text/javascript" src="/${binModulePath}.js"></script>
  </body>
</html>`
  );
  let gzFile = await gzipFile(htmlFile, rootDir);
  return [htmlFile, gzFile];
}

// Returned files are relative to `rootDir`.
async function gzipFile(
  file: string, // relative to `rootDir`
  rootDir: string // relative to '.'
): Promise<string> {
  let fullFile = path.join(rootDir, file);
  await pipeline(
    fs.createReadStream(fullFile),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(fullFile + ".gz")
  );
  return file + ".gz";
}
