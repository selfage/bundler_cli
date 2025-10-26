#!/usr/bin/env node
import "source-map-support/register";
import fs = require("fs");
import path = require("path");
import { runInNode } from "./runner_in_node";
import { runInPuppeteer } from "./runner_in_puppeteer";
import { toUnixPath, toUnixPathFromBundleOptions } from "./to_unix_path";
import { DEFAULT_ENTRIES_CONFIG_FILE, bundleWebApps } from "./web_app_bundler";
import { Command } from "commander";
import { bundleNodeServer } from "./node_server_bundler";

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
    `be a single page application. Loop for "WebAppEntries" in ` +
    `https://github.com/selfage/bundler_cli/blob/main/web_app_entries_def.ts ` +
    `for its schema. Its directory is the base that all imported assets ` +
    `should be relative to, and a web server can serve files at this ` +
    `directory. If not provided, it will look for ./${DEFAULT_ENTRIES_CONFIG_FILE}.`,
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
let NO_HEADLESS_BROWSER_OPTION = [
  "-nh, --no-headless",
  `Turn off running the browser in headless mode.`,
];

function main(): void {
  let packageConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json")).toString(),
  );
  let program = new Command();
  program.version(packageConfig.version);
  program
    .command("runInNode <sourceFile> [pass-through-args...]")
    .alias("nrun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Node. The file ext can be neglected and is ` +
        `always fixed as .ts. "--" is needed in between <sourceFile> and ` +
        `pass through arguments.`,
    )
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((sourceFile, passThroughArgs, options) =>
      runInNode(
        toUnixPath(sourceFile),
        toUnixPathFromBundleOptions(options),
        passThroughArgs as Array<string>,
      ),
    );
  program
    .command("runInPuppeteer <sourceFile> [pass-through-args...]")
    .alias("prun")
    .description(
      `Compile and bundle from a TypeScript source file, and run the bundled ` +
        `JavaScript file in Puppeteer, i.e., headless Chrome. The file ext ` +
        `can be neglected and is always fixed as .ts. "--" is needed in ` +
        `between <sourceFile> and pass through arguments.`,
    )
    .option(BASE_DIR_OPTION[0], BASE_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .option(PORT_OPTION[0], PORT_OPTION[1], (value) => parseInt(value, 10))
    .option(NO_HEADLESS_BROWSER_OPTION[0], NO_HEADLESS_BROWSER_OPTION[1])
    .action((sourceFile, passThroughArgs, options) =>
      runInPuppeteer(
        toUnixPath(sourceFile),
        toUnixPath(options.baseDir),
        options.port as number,
        options.headless as boolean,
        toUnixPathFromBundleOptions(options),
        passThroughArgs as Array<string>,
      ),
    );
  program
    .command("bundleWebApps")
    .alias("bwa")
    .description(
      `Bundle all TypeScript source files based on <entriesConfig>, generate ` +
        `HTML files pointing to the bundled JS files respectively, compress ` +
        `them with Gzip, and finally move those files into <outDir> where ` +
        `your web server can be started.`,
    )
    .option(ENTRIES_CONFIG_FILE_OPTION[0], ENTRIES_CONFIG_FILE_OPTION[1])
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
        toUnixPath(options.entriesConfigFile),
        toUnixPath(options.baseDir),
        toUnixPath(options.outDir),
        toUnixPathFromBundleOptions(options),
      ),
    );
  program
    .command("bundleNodeServer <serverSourceFile> <serverOutputFile>")
    .alias("bns")
    .description(
      `Bundle a TypeScript source file as the server's main file and output. ` +
        `Both file exts can be neglected and are always fixed as .ts and .js ` +
        `respectively. Npm modules are not actually bundled due to many of ` +
        `them not compatible with bundling. Finally, all bundled files and ` +
        `imported assets will be moved from <fromDir> to <toDir>, without ` +
        `any source file or intermediate file.`,
    )
    .option(FROM_DIR_OPTION[0], FROM_DIR_OPTION[1])
    .option(TO_DIR_OPTION[0], TO_DIR_OPTION[1])
    .option(EXTRA_FILES_OPTION[0], EXTRA_FILES_OPTION[1])
    .option(INLINE_JS_CODE_OPTION[0], INLINE_JS_CODE_OPTION[1])
    .option(ASSET_EXT_OPTION[0], ASSET_EXT_OPTION[1])
    .option(SKIP_MINIFY_OPTION[0], SKIP_MINIFY_OPTION[1])
    .option(DEBUG_OPTION[0], DEBUG_OPTION[1])
    .option(TSCONFIG_FILE_OPTION[0], TSCONFIG_FILE_OPTION[1])
    .action((serverSourceFile, serverOutputFile, options) =>
      bundleNodeServer(
        toUnixPath(serverSourceFile),
        toUnixPath(serverOutputFile),
        toUnixPath(options.fromDir),
        toUnixPath(options.toDir),
        toUnixPathFromBundleOptions(options),
      ),
    );
  program.parse();
}

main();
