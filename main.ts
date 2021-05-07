#!/usr/bin/env node
import packageConfig from "./package.json";
import {
  CommonBundleOptions,
  bundleForBrowserReturnAssetFiles,
  bundleForNodeReturnAssetFiles,
} from "./bundler";
import { executeInPuppeteer } from "./puppeteer_executor";
import { runInNode } from "./runner_in_node";
import { runInPuppeteer } from "./runner_in_puppeteer";
import {
  DEFAULT_BUNDLED_RESOURCES_FILE,
  DEFAULT_ENTRIES_CONFIG_FILE,
  bundleWebAppsAndCopyFiles,
} from "./web_apps_bundler";
import { Command } from "commander";
import "source-map-support/register";

let ENVIRONMENT_FILE_OPTION = [
  "-e, --environment-file <environmentFile>",
  `An extra TypeScript file to be bundled together with the source file, ` +
    `relative to the current working directory. Typically such file ` +
    `contains global variables for a particular environment such as PROD or ` +
    `DEV, and it's not imported by the source file but assumed to be present ` +
    `at runtime.`,
];
let ASSET_EXT_OPTION = [
  "-a, --asset-exts <assetExts...>",
  `A list of file exts that are treated as assets. E.g., with ` +
    `"-a .png .jpg", you could \`import imagePath from './image.png'\` which ` +
    `enables \`<img src={imagePath}>\` or \`fs.readFileSync(imagePath)\`. If ` +
    `not provided, it will look for \`assetExts\` field in ./package.json ` +
    `which should be a list of strings.`,
];
let SKIP_MINIFY_OPTION = [
  "-s, --skip-minify",
  `Skip minification when bundling. Useful for inspecting bundling issues.`,
];
let DEBUG_OPTION = ["--debug", "Include inline source map and inline source."];
let TSCONFIG_FILE_OPTION = [
  "-c, --tsconfig-file <file>",
  `The file path to tsconfig.json, relative to the current working ` +
    `directory. If not provided, it will try to look for it at the current ` +
    `working directory.`,
];
let ROOT_DIR_OPTION = [
  "-r, --root-dir <rootDir>",
  `The root directory that source file, output file, and asset files should ` +
    `be relative to. If not provided, it will be the current working ` +
    `directory.`,
];
let PORT_OPTION = [
  "-p, --port <port>",
  `The port number to start your local server. Default to 8000.`,
];

function main(): void {
  let program = new Command();
  program.version(packageConfig.version);
  program
    .command("bundleForNode <sourceFile> <outputFile>")
    .alias("bfn")
    .description(
      `Compile and bundle from a TypeScript source file that can be run in ` +
        `Node. Both file exts can be neglected and are always fixed as .ts ` +
        `and .js respectively.`
    )
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action(async (sourceFile, outputFile, options) => {
      await bundleForNodeReturnAssetFiles(
        sourceFile,
        outputFile,
        options as CommonBundleOptions
      );
    });
  program
    .command("runInNode <sourceFile>")
    .alias("nrun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Node. The file ext can be neglected and is ` +
        `always fixed as .ts. Pass through arguments to the exectuable file ` +
        `after --.`
    )
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((sourceFile, options, extraArgs) =>
      runInNode(sourceFile, options as CommonBundleOptions, extraArgs)
    );
  program
    .command("bundleForBrowser <sourceFile> <outputFile>")
    .alias("bfb")
    .description(
      `Compile and bundle from a TypeScript source file that can be run in ` +
        `Browser. Both file exts can be neglected and are always fixed as ` +
        `.ts and .js respectively. Both file paths need to be relative to ` +
        `<rootDir>.`
    )
    .option(ROOT_DIR_OPTION[0], ROOT_DIR_OPTION[1])
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action(async (sourceFile, outputFile, options) => {
      await bundleForBrowserReturnAssetFiles(
        sourceFile,
        outputFile,
        options.rootDir as string,
        options as CommonBundleOptions
      );
    });
  program
    .command("runInPuppeteer <sourceFile>")
    .alias("prun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Puppeteer, i.e., headless Chrome. The file ext ` +
        `can be neglected and is always fixed as .ts. The file path needs to ` +
        `be relative to <rootDir>. Pass through arguments to the exectuable ` +
        `file after --.`
    )
    .option(ROOT_DIR_OPTION[0], ROOT_DIR_OPTION[1])
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .option(PORT_OPTION[0], PORT_OPTION[1], (value) => parseInt(value, 10))
    .action((sourceFile, options, extraArgs) =>
      runInPuppeteer(
        sourceFile,
        options.rootDir as string,
        options.port as number,
        options as CommonBundleOptions,
        extraArgs
      )
    );
  program
    .command("executeInPuppeteer <binFile>")
    .alias("pexe")
    .description(
      `Execute the presumably bundled JavaScript file in Puppeteer, i.e., ` +
        `headless Chrome. The file ext can be neglected and is always fixed ` +
        `as .js. The file path needs to be relative to <rootDir>. Pass ` +
        `through arguments to the exectuable file after --.`
    )
    .option(ROOT_DIR_OPTION[0], ROOT_DIR_OPTION[1])
    .option(PORT_OPTION[0], PORT_OPTION[1], (value) => parseInt(value, 10))
    .action(async (binFile, options, extraArgs) => {
      await executeInPuppeteer(
        binFile,
        options.rootDir as string,
        true,
        options.port,
        extraArgs
      );
    });
  program
    .command("bundleWebApps")
    .alias("bwa")
    .description(
      `Bundle all TypeScript source files based on <entriesConfig>, write a ` +
        `list of bundled JS files and imported asset files as well as extra ` +
        `asset files to <bundledResources>, and finally copy those files ` +
        `into <outDir> where your web server can be started.`
    )
    .option(ROOT_DIR_OPTION[0], ROOT_DIR_OPTION[1])
    .option(
      "-m, --entries-config <entriesConfig>",
      `A config file to specify a list of entry files, each of which should ` +
        `be as a single page applications. The file path needs to be ` +
        `relative to <rootDir>. See <> for its schema. If not provided, it ` +
        `will look for <rootDir>/${DEFAULT_ENTRIES_CONFIG_FILE}.`
    )
    .option(
      "-o, --out-dir <outDir>",
      `The output directory to where files will be copied. If not provided, ` +
        `it will be the current working directory. When <outDir> equals ` +
        `<rootDir>, no copies happen.`
    )
    .option(
      "-b, --bundled-resources <bundledResources>",
      `An output file generated after bundling, containing a JSON array of ` +
        `files that need to be copied to <outDir> and served in your web ` +
        `server. The file path needs to be relative to <rootDir>. If not ` +
        `provided, it will write to ` +
        `<rootDir>/${DEFAULT_BUNDLED_RESOURCES_FILE}.`
    )
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((options) =>
      bundleWebAppsAndCopyFiles(
        options.rootDir as string,
        options.entriesConfig as string,
        options.outDir as string,
        options.bundledResources as string,
        options as CommonBundleOptions
      )
    );
  program.parse();
}

main();
