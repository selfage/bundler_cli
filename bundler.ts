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
let ASSET_CONTENT_NODE_TEMPLATE = `exports.default = __filename;`;
let ASSET_CONTENT_BROWSER_TEMPLATE = `exports.default = "/{relativePath}";`;

export interface CommonBundleOptions {
  environmentFile?: string;
  assetExts?: Array<string>;
  packageJson?: string;
  skipMinify?: boolean;
  isDebug?: boolean;
}

export interface OutputFiles {
  rootDir: string;
  binFile: string;
  assetFiles: Array<string>;
}

export async function bundleForNode(
  sourceFile: string,
  outputFile: string,
  tsconfigFile: string,
  options?: CommonBundleOptions
): Promise<OutputFiles> {
  let rootDir = path.dirname(outputFile);
  return bundle(
    sourceFile,
    outputFile,
    tsconfigFile,
    rootDir,
    // To correctly browserify __dirname and __filename. Otherwise, they are
    // replaced based on '.' or cwd.
    rootDir,
    true,
    (file, rootDir, outputAssetFiles) => {
      return new AssetTransformer(
        file,
        rootDir,
        ASSET_CONTENT_NODE_TEMPLATE,
        outputAssetFiles
      );
    },
    options
  );
}

export async function bundleForBrowser(
  sourceFile: string,
  outputFile: string,
  tsconfigFile: string,
  rootDir?: string,
  options?: CommonBundleOptions
): Promise<OutputFiles> {
  rootDir = rootDir ?? path.dirname(outputFile);
  return bundle(
    sourceFile,
    outputFile,
    tsconfigFile,
    rootDir,
    // Expect no __dirname or __filename and thus pass in a trivial base dir.
    ".",
    false,
    (file, rootDir, outputAssetFiles) => {
      return new AssetTransformer(
        file,
        rootDir,
        ASSET_CONTENT_BROWSER_TEMPLATE,
        outputAssetFiles
      );
    },
    options
  );
}

class AssetTransformer extends stream.Transform {
  public constructor(
    private absoluteFilePath: string,
    private rootDir: string,
    private assetContentTemplate: string,
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
          this.assetContentTemplate.replace("{relativePath}", relativePath)
        );
      },
    });
  }
}

export async function bundle(
  sourceFile: string,
  outputFile: string,
  tsconfigFile: string,
  outputRootDir: string,
  browserifyBaseDir: string,
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
    let packageJson = options.packageJson ?? "./package.json";
    assetExts = JSON.parse((await fs.promises.readFile(packageJson)).toString())
      .assetExts;
  }

  await compileWithAssets(sourceFile, tsconfigFile, assetExts);
  if (options.environmentFile) {
    await compile(options.environmentFile, tsconfigFile);
  }

  let filesToBeBrowserified = new Array<string>();
  if (options.environmentFile) {
    // environmentFile, if exists, needs to go first.
    filesToBeBrowserified.push(
      path.relative(
        browserifyBaseDir,
        stripFileExtension(options.environmentFile) + ".js"
      )
    );
  }
  filesToBeBrowserified.push(
    path.relative(browserifyBaseDir, stripFileExtension(sourceFile) + ".js")
  );
  let browserifyHandler = browserifyConstructor(filesToBeBrowserified, {
    node: inNode,
    basedir: browserifyBaseDir,
    debug: options.isDebug,
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
    if (options.isDebug) {
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
  tsconfigFile: string,
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
