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
import { copyFilesToDir, moveFilesToDir } from "./files_copier";
import { WEB_APP_ENTRIES } from "./web_app_entries_def";
import { parseMessage } from "@selfage/message/parser";
let pipeline = util.promisify(stream.pipeline);

export let DEFAULT_ENTRIES_CONFIG_FILE = "web_app_entries.yaml";

export async function bundleWebApps(
  entriesConfigFile = DEFAULT_ENTRIES_CONFIG_FILE,
  baseDir = ".",
  outDir = baseDir,
  options?: CommonBundleOptions,
): Promise<void> {
  let webAppEntries = parseMessage(
    yaml.parse((await fs.promises.readFile(entriesConfigFile)).toString()),
    WEB_APP_ENTRIES,
  );

  let generatedFiles = new Array<string>();
  let assetFiles = new Array<string>();
  let promises = new Array<Promise<void>>();
  for (let entry of webAppEntries.entries) {
    promises.push(
      bundleAndGzip(
        path.posix.join(baseDir, entry.source),
        path.posix.join(baseDir, entry.output),
        baseDir,
        options,
        generatedFiles,
        assetFiles,
      ),
      writeHtmlFileAndGZip(
        path.posix.join(baseDir, entry.output),
        baseDir,
        generatedFiles,
      ),
    );
  }
  if (webAppEntries.extraAssets) {
    for (let entry of webAppEntries.extraAssets) {
      promises.push(
        copyExtraAsset(
          path.posix.join(baseDir, entry.from),
          path.posix.join(baseDir, entry.to),
          generatedFiles,
          assetFiles,
        ),
      );
    }
  }
  await Promise.all(promises);

  if (path.posix.normalize(outDir) === path.posix.normalize(baseDir)) {
    return;
  }
  await Promise.all([
    moveFilesToDir(generatedFiles, baseDir, outDir),
    copyFilesToDir(assetFiles, baseDir, outDir),
  ]);
}

async function bundleAndGzip(
  sourceFile: string,
  outputFile: string,
  baseDir: string,
  options: CommonBundleOptions,
  generatedFilesCollector: Array<string>,
  assetFilesCollector: Array<string>,
): Promise<void> {
  let assetFiles = await bundleForBrowserReturnAssetFiles(
    sourceFile,
    outputFile,
    baseDir,
    options,
  );
  let jsFile = stripFileExtension(outputFile) + ".js";
  let gzFile = await gzipFile(jsFile);
  generatedFilesCollector.push(jsFile, gzFile);
  assetFilesCollector.push(...assetFiles);
}

async function writeHtmlFileAndGZip(
  binFile: string,
  baseDir: string,
  generatedFilesCollector: Array<string>,
): Promise<void> {
  let binModulePath = stripFileExtension(binFile);
  let htmlFile = binModulePath + ".html";
  let binJsPath = path.posix.relative(baseDir, binModulePath + ".js");
  await fs.promises.mkdir(path.posix.dirname(binFile), { recursive: true });
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
  generatedFilesCollector.push(htmlFile, gzFile);
}

async function gzipFile(file: string): Promise<string> {
  await pipeline(
    fs.createReadStream(file),
    zlib.createGzip({ level: 9 }),
    fs.createWriteStream(file + ".gz"),
  );
  return file + ".gz";
}

async function copyExtraAsset(
  fromFile: string,
  toFile: string,
  generatedFilesCollector: Array<string>,
  assetFilesCollector: Array<string>,
): Promise<void> {
  if (fromFile !== toFile) {
    await fs.promises.mkdir(path.posix.dirname(toFile), { recursive: true });
    await fs.promises.copyFile(fromFile, toFile);
    generatedFilesCollector.push(toFile);
  } else {
    assetFilesCollector.push(fromFile);
  }
}
