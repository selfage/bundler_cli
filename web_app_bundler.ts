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
import { copyFilesToDir } from "./files_copier";
import { WEB_APP_ENTRIES } from "./web_app_entries_def";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.yaml";
export let DEFAULT_BUNDLED_RESOURCES_FILE = "web_app_resources.yaml";

export async function bundleWebApps(
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  bundledResourcesFile = DEFAULT_BUNDLED_RESOURCES_FILE,
  baseDir = ".",
  outDir = baseDir,
  options?: CommonBundleOptions,
): Promise<void> {
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
  await copyFilesToDir(allFiles, baseDir, outDir);
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

  let allFiles = new Array<string>();
  let promises = new Array<Promise<void>>();
  for (let entry of webAppEntries.entries) {
    promises.push(
      bundleAndGzip(
        path.posix.join(baseDir, entry.source),
        path.posix.join(baseDir, entry.output),
        baseDir,
        options,
        allFiles,
      ),
      writeHtmlFileAndGZip(
        path.posix.join(baseDir, entry.output),
        baseDir,
        allFiles,
      ),
    );
  }
  if (webAppEntries.extraAssets) {
    for (let entry of webAppEntries.extraAssets) {
      promises.push(
        copyAsset(
          path.posix.join(baseDir, entry.from),
          path.posix.join(baseDir, entry.to),
          allFiles,
        ),
      );
    }
  }
  await Promise.all(promises);
  return allFiles;
}

async function bundleAndGzip(
  sourceFile: string,
  outputFile: string,
  baseDir: string,
  options: CommonBundleOptions,
  filesCollector: Array<string>,
): Promise<void> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    baseDir,
    options,
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile);
  filesCollector.push(...assetFiles, jsFile, gzFile);
}

async function writeHtmlFileAndGZip(
  binFile: string,
  baseDir: string,
  filesCollector: Array<string>,
): Promise<void> {
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
  filesCollector.push(htmlFile, gzFile);
}

async function gzipFile(file: string): Promise<string> {
  await pipeline(
    fs.createReadStream(file),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(file + ".gz"),
  );
  return file + ".gz";
}

async function copyAsset(
  fromFile: string,
  toFile: string,
  filesCollector: Array<string>,
): Promise<void> {
  if (path.posix.normalize(fromFile) !== path.posix.normalize(toFile)) {
    await fs.promises.mkdir(path.posix.dirname(toFile), { recursive: true });
    await fs.promises.copyFile(fromFile, toFile);
  }
  filesCollector.push(toFile);
}
