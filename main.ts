#!/usr/bin/env node
import packageConfig from "./package.json";
import { bundleForBrowser, bundleForNode } from "./bundler";
import { runInNode } from "./runner_in_node";
import { Command } from "commander";
import "source-map-support/register";

let ENVIRONMENT_FILE_OPTION = [
  "-e, --environment-file <environmentFile>",
  `An extra TypeScript file to be bundled together with the source file. ` +
    `Typically such file contains global variables for a particular ` +
    `environment such as PROD or DEV, and it's not imported by the source ` +
    `file but assumed to be present at runtime.`,
];
let ASSET_EXT_OPTION = [
  "-a, --asset-exts <assetExts...>",
  `A list of file exts that are treated as assets. E.g., with ` +
    `\`import imagePath from './image.png'\`, you could have ` +
    `\`<img src={imagePath}>\` or \`fs.readFileSync(imagePath)\``,
];
let SKIP_MINIFY_OPTION = [
  "-s, --skip-minify",
  `Skip minification when bundling. Useful for inspecting bundling issues.`,
];
let DEBUG_OPTION = ["--debug", "Include inline source map and inline source."];
let TSCONFIG_FILE_OPTION = [
  "-c, --tsconfig-file <file>",
  `The file path to tsconfig.json. If not provided, it will try to look for ` +
    `it at the current working directory.`,
];
let OUTPUT_FILE_OPTION = [
  "-o, --output-file <file>",
  `The output file path for bundled JavaScript file. The file ext can be ` +
    `negelected and it's fixed as .js. If not provided, it will be ` +
    `<sourceFile>_bin.js.`,
];

async function main(): Promise<void> {
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
      await bundleForNode(sourceFile, outputFile, options);
    });
  program
    .command("runInNode <sourceFile>")
    .alias("nrun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Node. The file ext can be neglected and is ` +
        `always fixed as .ts.`
    )
    .option(OUTPUT_FILE_OPTION[0], OUTPUT_FILE_OPTION[1])
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((sourceFile, options, extraArgs) =>
      runInNode(sourceFile, options, extraArgs)
    );
  program
    .command("bundleForBrowser <sourceFile> <outputFile>")
    .alias("bfb")
    .description(
      `Compile and bundle from a TypeScript source file that can be run in ` +
        `Browser. Both file exts can be neglected and are always fixed as ` +
        `.ts and .js respectively.`
    )
    .option(
      "-r, --root-dir <rootDir>",
      `The root directory that you want to your web server from. Asset paths ` +
        `are relative to it. If not provided, it will be the directory of ` +
        `the output file.`
    )
    .option(ENVIRONMENT_FILE_OPTION[0], ENVIRONMENT_FILE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action(async (sourceFile, outputFile, options) => {
      await bundleForBrowser(sourceFile, outputFile, options.rootDir, options);
    });
  await program.parseAsync();
}

main();
