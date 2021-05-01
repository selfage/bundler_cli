import browserifyConstructor = require("browserify");
import fs = require("fs");
import getStream = require("get-stream");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import { compile } from "@selfage/cli/build/compiler";
import { stripFileExtension } from "@selfage/cli/io_helper";

let TEMP_DECLARATION_FILE = "./selfage_asset_ext_temp.d.ts";
let TEMP_DECLARATION_FILE_CONTENT_TEMPLATE = `
declare module "*.{ext}" {
   let value: string;
   export default value;
}
`;

export interface CommonBundleOptions {
  tsconfigFile?: string; // relative to '.'
  environmentFile?: string; // relative to '.'
  assetExts?: Array<string>;
  packageJsonFile?: string; // relative to '.'
  skipMinify?: boolean;
  debug?: boolean;
}

export interface OutputFiles {
  rootDir: string; // relative to '.'
  binFile: string; // relative to `rootDir`
  assetFiles: Array<string>; // relative to `rootDir`
}

export async function bundleForNode(
  sourceFile: string, // relative to '.'
  outputFile: string, // relative to '.'
  options?: CommonBundleOptions
): Promise<OutputFiles> {
  let rootDir = path.dirname(outputFile);
  return bundle(
    sourceFile,
    outputFile,
    rootDir,
    true,
    (file, rootDir, outputAssetFiles) => {
      return new AssetTransformer(file, rootDir, outputAssetFiles);
    },
    options
  );
}

export async function bundleForBrowser(
  sourceFile: string, // relative to '.'
  outputFile: string, // relative to '.'
  rootDir = ".",
  options?: CommonBundleOptions
): Promise<OutputFiles> {
  return bundle(
    sourceFile,
    outputFile,
    rootDir,
    false,
    (file, rootDir, outputAssetFiles) => {
      return new AssetTransformer(file, rootDir, outputAssetFiles);
    },
    options
  );
}

class AssetTransformer extends stream.Transform {
  public constructor(
    private absoluteFilePath: string,
    private rootDir: string,
    private outputAssetFilePaths: Array<string>
  ) {
    super({
      transform: (chunk, encoding, callback) => {
        callback();
      },
      flush: (callback) => {
        let relativePath = path.relative(this.rootDir, this.absoluteFilePath);
        this.outputAssetFilePaths.push(`./${relativePath}`);
        callback(
          undefined,
          // __filename will be transformed later by Browserify.
          `exports.default = __filename;`
        );
      },
    });
  }
}

export async function bundle(
  sourceFile: string, // relative to '.'
  outputFile: string, // relative to '.'
  outputRootDir: string, // relative to '.'
  inNode: boolean,
  transformerFactoryFn: (
    file: string,
    rootDir: string,
    outputAssetFiles: Array<string>
  ) => stream.Transform,
  options: CommonBundleOptions = {}
): Promise<OutputFiles> {
  let assetExts: Array<string>;
  if (options.assetExts) {
    assetExts = options.assetExts;
  } else {
    let packageJsonFile = options.packageJsonFile ?? "./package.json";
    assetExts = JSON.parse(
      (await fs.promises.readFile(packageJsonFile)).toString()
    ).assetExts;
  }

  await compileWithAssets(sourceFile, options.tsconfigFile, assetExts);
  if (options.environmentFile) {
    await compile(options.environmentFile, options.tsconfigFile);
  }

  let filesToBeBrowserified = new Array<string>();
  if (options.environmentFile) {
    // environmentFile, if exists, needs to go first.
    filesToBeBrowserified.push(
      path.relative(
        outputRootDir,
        stripFileExtension(options.environmentFile) + ".js"
      )
    );
  }
  filesToBeBrowserified.push(
    path.relative(outputRootDir, stripFileExtension(sourceFile) + ".js")
  );
  let browserifyHandler = browserifyConstructor(filesToBeBrowserified, {
    node: inNode,
    basedir: outputRootDir,
    debug: options.debug,
  });
  let outputAssetFiles = new Array<string>();
  browserifyHandler.transform((file) => {
    if (assetExts && assetExts.includes(path.extname(file).substring(1))) {
      return transformerFactoryFn(file, outputRootDir, outputAssetFiles);
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

  let outputJsFile = stripFileExtension(outputFile) + ".js";
  await fs.promises.writeFile(outputJsFile, outputCode);
  return {
    rootDir: outputRootDir,
    binFile: path.relative(outputRootDir, outputJsFile),
    assetFiles: outputAssetFiles,
  };
}

async function compileWithAssets(
  sourceFile: string,
  tsconfigFile?: string,
  assetExts?: Array<string>
): Promise<void> {
  let supFiles = new Array<string>();
  if (assetExts) {
    let tempFileContent = new Array<string>();
    for (let ext of assetExts) {
      tempFileContent.push(
        TEMP_DECLARATION_FILE_CONTENT_TEMPLATE.replace("{ext}", ext)
      );
    }
    await fs.promises.writeFile(
      TEMP_DECLARATION_FILE,
      tempFileContent.join("")
    );
    supFiles.push(TEMP_DECLARATION_FILE);
  }
  await compile(sourceFile, tsconfigFile, supFiles);
  if (assetExts) {
    await fs.promises.unlink(TEMP_DECLARATION_FILE);
  }
}
