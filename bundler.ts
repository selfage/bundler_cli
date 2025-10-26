import browserifyConstructor = require("browserify");
import fs = require("fs");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import { stripFileExtension } from "./file_extension_stripper";
import { getStream } from "./get_stream";
import { compile } from "@selfage/cli/build/compiler";

// Export as a commonjs module.
let TEMP_DECLARATION_FILE_CONTENT_TEMPLATE = `
declare module "*{ext}" {
   let path: string;
   export = path;
}
`;

let ASSET_EXT_DECLARATION_FILE = `selfage_asset_exts_declaration.d.ts`;

export interface CommonBundleOptions {
  tsconfigFile?: string;
  extraFiles?: Array<string>;
  inlineJs?: Array<string>;
  assetExts?: Array<string>;
  packageJsonFile?: string;
  skipMinify?: boolean;
  debug?: boolean;
}

export async function bundleForNodeReturnAssetFiles(
  sourceFile: string,
  outputFile: string,
  options?: CommonBundleOptions,
): Promise<Array<string>> {
  let baseDir = path.posix.dirname(outputFile);
  return await bundle(sourceFile, outputFile, baseDir, true, false, options);
}

export async function bundleForBrowserReturnAssetFiles(
  sourceFile: string,
  outputFile: string,
  baseDir = ".",
  options?: CommonBundleOptions,
): Promise<Array<string>> {
  return bundle(sourceFile, outputFile, baseDir, false, true, options);
}

export async function bundle(
  sourceFile: string,
  outputFile: string,
  baseDir: string,
  inNode: boolean,
  bundleExternal: boolean,
  options: CommonBundleOptions = {},
): Promise<Array<string>> {
  let assetExts: Array<string>;
  if (options.assetExts) {
    assetExts = options.assetExts;
  } else {
    let packageJsonFile = options.packageJsonFile ?? "./package.json";
    assetExts = JSON.parse(
      (await fs.promises.readFile(packageJsonFile)).toString(),
    ).assetExts;
  }

  if (!assetExts) {
    await compile(sourceFile, options.tsconfigFile, options.extraFiles);
  } else {
    await compileWithAssets(
      sourceFile,
      assetExts,
      options.extraFiles,
      options.tsconfigFile,
    );
  }

  try {
    await fs.promises.stat(baseDir);
  } catch (e) {
    e.message = "Base directory needs to be a valid directory. " + e.message;
    throw e;
  }
  let entriesToBeBrowserified = new Array<string | stream.Readable>();
  if (options.inlineJs) {
    entriesToBeBrowserified.push(
      ...options.inlineJs.map((jsCode) => {
        return stream.Readable.from([jsCode]);
      }),
    );
  }
  if (options.extraFiles) {
    // If exists, put them before the main file such that variables will be
    // defined and functions will be called before executing the main file.
    for (let extraFile of options.extraFiles) {
      entriesToBeBrowserified.push(
        path.posix.relative(baseDir, stripFileExtension(extraFile) + ".js"),
      );
    }
  }
  entriesToBeBrowserified.push(
    path.posix.relative(baseDir, stripFileExtension(sourceFile) + ".js"),
  );
  let browserifyHandler = browserifyConstructor(entriesToBeBrowserified, {
    node: inNode,
    bundleExternal: bundleExternal,
    basedir: baseDir,
    debug: options.debug,
  });
  let outputAssetFiles = new Array<string>();
  browserifyHandler.transform((file) => {
    if (assetExts && assetExts.includes(path.posix.extname(file))) {
      return new AssetTransformer(file, outputAssetFiles);
    } else {
      return new stream.PassThrough();
    }
  });
  let bundledCode = await getStream(browserifyHandler.bundle());

  let outputCode: string;
  if (options.skipMinify) {
    outputCode = bundledCode;
  } else {
    let minifyOptions: UglifyJS.MinifyOptions = {};
    if (options.debug) {
      minifyOptions.sourceMap = {
        content: "inline",
        includeSources: true,
        url: "inline",
      };
    }
    let minifiedRes = UglifyJS.minify(bundledCode, minifyOptions);
    if (minifiedRes.error) {
      throw minifiedRes.error;
    }
    outputCode = minifiedRes.code;
  }

  await fs.promises.mkdir(path.posix.dirname(outputFile), {
    recursive: true,
  });
  await fs.promises.writeFile(
    stripFileExtension(outputFile) + ".js",
    outputCode,
  );
  return outputAssetFiles;
}

async function compileWithAssets(
  sourceFile: string,
  assetExts: Array<string>,
  extraFiles: Array<string> = [],
  tsconfigFile?: string,
): Promise<void> {
  let tempFileContent = new Array<string>();
  for (let ext of assetExts) {
    tempFileContent.push(
      TEMP_DECLARATION_FILE_CONTENT_TEMPLATE.replace("{ext}", ext),
    );
  }
  await fs.promises.writeFile(
    ASSET_EXT_DECLARATION_FILE,
    tempFileContent.join(""),
  );
  await compile(sourceFile, tsconfigFile, [
    ASSET_EXT_DECLARATION_FILE,
    ...extraFiles,
  ]);
}

class AssetTransformer extends stream.Transform {
  public constructor(
    private absoluteFile: string,
    private outputAssetFilePaths: Array<string>,
  ) {
    super({
      transform: (chunk, encoding, callback) => {
        callback();
      },
      flush: (callback) => {
        let relativePath = path.posix.relative(".", this.absoluteFile);
        this.outputAssetFilePaths.push(relativePath);
        callback(
          undefined,
          // __filename will be transformed later by Browserify.
          `module.exports = __filename;`,
        );
      },
    });
  }
}
