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
  tsconfigFile?: string;
  environmentFile?: string;
  assetExts?: Array<string>;
  packageJsonFile?: string;
  skipMinify?: boolean;
  debug?: boolean;
}

export async function bundleForNodeReturnAssetFiles(
  sourceFile: string,
  outputFile: string,
  options?: CommonBundleOptions
): Promise<Array<string>> {
  let rootDir = path.dirname(outputFile);
  return await bundle(
    sourceFile,
    outputFile,
    rootDir,
    true,
    false,
    (absoluteFile, outputAssetFiles) => {
      return new AssetTransformer(absoluteFile, outputAssetFiles);
    },
    options
  );
}

export async function bundleForBrowserReturnAssetFiles(
  sourceFile: string,
  outputFile: string,
  rootDir = ".",
  options?: CommonBundleOptions
): Promise<Array<string>> {
  return bundle(
    sourceFile,
    outputFile,
    rootDir,
    false,
    true,
    (absoluteFile, outputAssetFiles) => {
      return new AssetTransformer(absoluteFile, outputAssetFiles);
    },
    options
  );
}

class AssetTransformer extends stream.Transform {
  public constructor(
    private absoluteFile: string,
    private outputAssetFilePaths: Array<string>
  ) {
    super({
      transform: (chunk, encoding, callback) => {
        callback();
      },
      flush: (callback) => {
        let relativePath = path.relative(".", this.absoluteFile);
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

export async function bundle(
  sourceFile: string,
  outputFile: string,
  rootDir: string,
  inNode: boolean,
  bundleExternal: boolean,
  transformerFactoryFn: (
    absoluteFile: string,
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
    await compile(sourceFile, options.tsconfigFile);
  } else {
    await compileWithAssets(sourceFile, assetExts, options.tsconfigFile);
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
  filesToBeBrowserified.push(
    path.relative(rootDir, stripFileExtension(sourceFile) + ".js")
  );
  let browserifyHandler = browserifyConstructor(filesToBeBrowserified, {
    node: inNode,
    bundleExternal: bundleExternal,
    basedir: rootDir,
    debug: options.debug,
  });
  let outputAssetFiles = new Array<string>();
  browserifyHandler.transform((file) => {
    if (assetExts && assetExts.includes(path.extname(file).substring(1))) {
      return transformerFactoryFn(file, outputAssetFiles);
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
    stripFileExtension(outputFile) + ".js",
    outputCode
  );
  return outputAssetFiles;
}

async function compileWithAssets(
  sourceFile: string,
  assetExts: Array<string>,
  tsconfigFile?: string
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
