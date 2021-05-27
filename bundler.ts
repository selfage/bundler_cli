import browserifyConstructor = require("browserify");
import fs = require("fs");
import getStream = require("get-stream");
import path = require("path");
import stream = require("stream");
import UglifyJS = require("uglify-js");
import { compile } from "@selfage/cli/build/compiler";
import { stripFileExtension } from "@selfage/cli/io_helper";

// Export as a commonjs module.
let TEMP_DECLARATION_FILE_CONTENT_TEMPLATE = `
declare module "*.{ext}" {
   let path: string;
   export = path;
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

// Returned asset files are relative to '.'.
export async function bundleForNodeReturnAssetFiles(
  sourceFile: string, // relative to '.'
  outputFile: string, // relative to '.'
  options?: CommonBundleOptions
): Promise<Array<string>> {
  let rootDir = path.dirname(outputFile);
  let assetFiles = await bundle(
    path.relative(rootDir, sourceFile),
    path.relative(rootDir, outputFile),
    rootDir,
    true,
    false,
    (absoluteFile, rootDir, outputAssetFiles) => {
      return new AssetTransformer(absoluteFile, rootDir, outputAssetFiles);
    },
    options
  );
  return assetFiles.map((assetFile) => path.join(rootDir, assetFile));
}

// Returned asset files are relative to `rootDir`.
export async function bundleForBrowserReturnAssetFiles(
  sourceFile: string, // relative to `rootDir`
  outputFile: string, // relative to `rootDir`
  rootDir = ".", // relative to '.'
  options?: CommonBundleOptions
): Promise<Array<string>> {
  return bundle(
    sourceFile,
    outputFile,
    rootDir,
    false,
    true,
    (absoluteFile, rootDir, outputAssetFiles) => {
      return new AssetTransformer(absoluteFile, rootDir, outputAssetFiles);
    },
    options
  );
}

class AssetTransformer extends stream.Transform {
  public constructor(
    private absoluteFile: string,
    private rootDir: string,
    private outputAssetFilePaths: Array<string>
  ) {
    super({
      transform: (chunk, encoding, callback) => {
        callback();
      },
      flush: (callback) => {
        let relativePath = path.relative(this.rootDir, this.absoluteFile);
        this.outputAssetFilePaths.push(relativePath);
        callback(
          undefined,
          // __filename will be transformed later by Browserify.
          `module.exports = __filename;`
        );
      },
    });
  }
}

// Returned asset files are relative to `rootDir`.
export async function bundle(
  sourceFile: string, // relative to `rootDir`
  outputFile: string, // relative to `rootDir`
  rootDir: string, // relative to '.'
  inNode: boolean,
  bundleExternal: boolean,
  transformerFactoryFn: (
    absoluteFile: string,
    rootDir: string,
    outputAssetFiles: Array<string>
  ) => stream.Transform,
  options: CommonBundleOptions = {}
): Promise<Array<string>> {
  let assetExts: Array<string>;
  if (options.assetExts) {
    assetExts = options.assetExts;
  } else {
    let packageJsonFile = options.packageJsonFile ?? "./package.json";
    assetExts = JSON.parse(
      (await fs.promises.readFile(packageJsonFile)).toString()
    ).assetExts;
  }

  if (!assetExts) {
    await compile(path.join(rootDir, sourceFile), options.tsconfigFile);
  } else {
    await compileWithAssets(
      path.join(rootDir, sourceFile),
      assetExts,
      options.tsconfigFile
    );
  }
  if (options.environmentFile) {
    await compile(options.environmentFile, options.tsconfigFile);
  }

  let filesToBeBrowserified = new Array<string>();
  if (options.environmentFile) {
    // environmentFile, if exists, needs to go first.
    filesToBeBrowserified.push(
      path.relative(
        rootDir,
        stripFileExtension(options.environmentFile) + ".js"
      )
    );
  }
  filesToBeBrowserified.push(stripFileExtension(sourceFile) + ".js");
  let browserifyHandler = browserifyConstructor(filesToBeBrowserified, {
    node: inNode,
    bundleExternal: bundleExternal,
    basedir: rootDir,
    debug: options.debug,
  });
  let outputAssetFiles = new Array<string>();
  browserifyHandler.transform((file) => {
    if (assetExts && assetExts.includes(path.extname(file).substring(1))) {
      return transformerFactoryFn(file, rootDir, outputAssetFiles);
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

  await fs.promises.writeFile(
    path.join(rootDir, stripFileExtension(outputFile) + ".js"),
    outputCode
  );
  return outputAssetFiles;
}

async function compileWithAssets(
  sourceFile: string, // relative to '.'
  assetExts: Array<string>,
  tsconfigFile?: string // relative to '.'
): Promise<void> {
  let tempFileContent = new Array<string>();
  for (let ext of assetExts) {
    tempFileContent.push(
      TEMP_DECLARATION_FILE_CONTENT_TEMPLATE.replace("{ext}", ext)
    );
  }
  let tempFile = `selfage_assets_tmp_${Date.now().toString(16)}_${Math.floor(
    Math.random() * 4096
  ).toString(16)}.d.ts`;
  await fs.promises.writeFile(tempFile, tempFileContent.join(""));
  await compile(sourceFile, tsconfigFile, [tempFile]);
  await fs.promises.unlink(tempFile);
}
