#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import {
  CommonBundleOptions,
  bundleForBrowser,
  bundleForNode,
} from "./bundler";
import { executeInPuppeteer } from "./puppeteer_executor";
import { runInNode } from "./runner_in_node";
import { runInPuppeteer } from "./runner_in_puppeteer";
import {
  DEFAULT_BUNDLED_RESOURCES_FILE,
  DEFAULT_ENTRIES_CONFIG_FILE,
  bundleWebApps,
} from "./web_app_bundler";
import { bundleWebServer } from "./web_server_bundler";
import { Command } from "commander";
import "source-map-support/register";

let EXTRA_FILES_OPTION = [
  "-e, --extra-files <extraFiles...>",
  `Extra TypeScript files to be bundled together with and before the source ` +
    `file.`,
];
let INLINE_JS_CODE_OPTION = [
  "-i, --inline-js <inlineJs...>",
  `Inline JavaScript code to be bundled together with and before all files.`,
];
let ASSET_EXT_OPTION = [
  "-a, --asset-exts <assetExts...>",
  `A list of file exts that are treated as assets. E.g., with ` +
    `"-a .png .jpg", you could \`import imagePath = require('./image.png')\` ` +
    `which enables \`<img src={imagePath}>\` or ` +
    `\`fs.readFileSync(imagePath)\`. If not provided, it will look for ` +
    `\`assetExts\` field in ./package.json which should be a list of strings.`,
];
let SKIP_MINIFY_OPTION = [
  "-s, --skip-minify",
  `Skip minification when bundling. Useful for inspecting bundling issues.`,
];
let DEBUG_OPTION = [
  "-d, --debug",
  "Include inline source map and inline source.",
];
let TSCONFIG_FILE_OPTION = [
  "-c, --tsconfig-file <file>",
  `The file path to tsconfig.json. If not provided, it will try to look for ` +
    `it at the current working directory.`,
];
let ENTRIES_CONFIG_FILE_OPTION = [
  "-ec, --entries-config-file <entriesConfigFile>",
  `A config file to specify a list of entry files, each of which should ` +
    `be a single page application. See ` +
    `https://www.npmjs.com/package/@selfage/bundler_cli for its schema. ` +
    `If not provided, it will look for ./${DEFAULT_ENTRIES_CONFIG_FILE}.`,
];
let FROM_DIR_OPTION = [
  "-f, --from-dir <fromDir>",
  `The directoy to copy from. If not provided, it will be the current ` +
    `working directory.`,
];
let TO_DIR_OPTION = [
  "-t, --to-dir <toDir>",
  `The directoy to copy to. If not provided, or when <toDir> equals ` +
    `<fromDir>, no copies happen.`,
];
let BASE_DIR_OPTION = [
  "-b, --base-dir <baseDir>",
  `The base directory that all imported assets should be relative to, such ` +
    `that a web server can serve files at this directory. If not provided, ` +
    `it will be the current working directory.`,
];
let OUT_DIR_OPTION = [
  "-o, --out-dir <outDir>",
  `The output directory to where files will be copied. If not provided, or ` +
    `when <outDir> equals <baseDir>, no copies happen.`,
];
let PORT_OPTION = [
  "-p, --port <port>",
  `The port number to start your local server. Default to 8000.`,
];

function main(): void {
  let packageConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json")).toString()
  );
  let program = new Command();
  program.version(packageConfig.version);
  program
    .command("bundleForNode <sourceFile> <outputFile>")
    .alias("bfn")
    .description(
      `Compile and bundle from a TypeScript source file that can be run in ` +
        `Node. Both file exts can be neglected and are always fixed as .ts ` +
        `and .js respectively. Npm modules are not actually bundled due to ` +
        `many of them not compatible with bundling.`
    )
    .option(FROM_DIR_OPTION[0], FROM_DIR_OPTION[1])
    .option(TO_DIR_OPTION[0], TO_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action(async (sourceFile, outputFile, options) => {
      await bundleForNode(
        sourceFile as string,
        outputFile as string,
        options.fromDir as string,
        options.toDir as string,
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
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((sourceFile, options, extraArgs) =>
      runInNode(
        sourceFile as string,
        options as CommonBundleOptions,
        extraArgs as Array<string>
      )
    );
  program
    .command("bundleForBrowser <sourceFile> <outputFile>")
    .alias("bfb")
    .description(
      `Compile and bundle from a TypeScript source file that can be run in ` +
        `Browser. Both file exts can be neglected and are always fixed as ` +
        `.ts and .js respectively.`
    )
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(OUT_DIR_OPTION[0], OUT_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action(async (sourceFile, outputFile, options) => {
      await bundleForBrowser(
        sourceFile as string,
        outputFile as string,
        options.baseDir as string,
        options.outDir as string,
        options as CommonBundleOptions
      );
    });
  program
    .command("runInPuppeteer <sourceFile>")
    .alias("prun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Puppeteer, i.e., headless Chrome. The file ext ` +
        `can be neglected and is always fixed as .ts. Pass through arguments ` +
        `to the exectuable file after --.`
    )
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .option(PORT_OPTION[0], PORT_OPTION[1], (value) => parseInt(value, 10))
    .action((sourceFile, options, extraArgs) =>
      runInPuppeteer(
        sourceFile as string,
        options.baseDir as string,
        options.port as number,
        options as CommonBundleOptions,
        extraArgs as Array<string>
      )
    );
  program
    .command("executeInPuppeteer <binFile>")
    .alias("pexe")
    .description(
      `Execute the presumably bundled JavaScript file in Puppeteer, i.e., ` +
        `headless Chrome. The file ext can be neglected and is always fixed ` +
        `as .js. Pass through arguments to the exectuable file after --.`
    )
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(PORT_OPTION[0], PORT_OPTION[1], (value) => parseInt(value, 10))
    .action(async (binFile, options, extraArgs) => {
      await executeInPuppeteer(
        binFile as string,
        options.baseDir as string,
        true,
        options.port as number,
        extraArgs as Array<string>
      );
    });
  program
    .command("bundleWebApps")
    .alias("bwa")
    .description(
      `Bundle all TypeScript source files based on <entriesConfig>, generate ` +
        `HTML files pointing to the bundled JS files respectively, compress ` +
        `them with Gzip, collect a list of all bundled JS & HTML file paths ` +
        `and asset file paths to <bundledResources>, and finally copy those ` +
        `files into <outDir> where your web server can be started.`
    )
    .option(ENTRIES_CONFIG_FILE_OPTION[0], ENTRIES_CONFIG_FILE_OPTION[1])
    .option(
      "-br, --bundled-resources-file <bundledResourcesFile>",
      `An output file generated after bundling, containing a JSON array of ` +
        `files that need to be copied to <outDir> and served in your web ` +
        `server. If not provided, it will write to ` +
        `./${DEFAULT_BUNDLED_RESOURCES_FILE}.`
    )
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(OUT_DIR_OPTION[0], OUT_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((options) =>
      bundleWebApps(
        options.entriesConfigFile as string,
        options.bundledResourcesFile as string,
        options.baseDir as string,
        options.outDir as string,
        options as CommonBundleOptions
      )
    );
  program
    .command("bundleWebServer <serverSourceFile> <serverOutputFile>")
    .alias("bws")
    .description(
      `Bundle a TypeScript source file as the server's main file and output. ` +
        `Both file exts can be neglected and are always fixed as .ts and .js ` +
        `respectively. Npm modules are not actually bundled due to many of ` +
        `them not compatible with bundling. It will also bundle web apps ` +
        `based on <entriesConfigFile> as well as <baseDir>. Finally, all ` +
        `bundled files and imported or extra assets will be copied from ` +
        `<fromDir> to <toDir>, without any source file or intermediate file.`
    )
    .option(ENTRIES_CONFIG_FILE_OPTION[0], ENTRIES_CONFIG_FILE_OPTION[1])
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(FROM_DIR_OPTION[0], FROM_DIR_OPTION[1])
    .option(TO_DIR_OPTION[0], TO_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((serverSourceFile, serverOutputFile, options) =>
      bundleWebServer(
        serverSourceFile as string,
        serverOutputFile as string,
        options.entriesConfigFile as string,
        options.baseDir as string,
        options.fromDir as string,
        options.toDir as string,
        options as CommonBundleOptions
      )
    );
  program.parse();
}

main();
