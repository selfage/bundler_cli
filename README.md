# @seflage/bundler_cli

## Install

`npm install @selfage/bundler_cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides an opinionated bundling tools for developing frontend and backend in TypeScript, especially single page applications (SPAs), powered by `browserify` and `uglify-js`, supporting importing asset files. See sections below for each sub-command and see [commander](https://www.npmjs.com/package/commander) if you are not sure about CLI syntax.

Note that despite TypeScript can compile with various options, we expect you to set `"module": "commonjs"` and `"moduleResolution": "node"`, due to the use of `browserify`.

## Bundle

You can bundle for running in either Node or browser environment.

```
$ bundage bfn -h
Usage: bundage bundleForNode|bfn [options] <sourceFile> <outputFile>

Compile and bundle from a TypeScript source file that can be run in Node. Both file exts can be neglected and are always fixed as .ts and .js respectively.

Options:
  -e, --environment-file <environmentFile>  An extra TypeScript file to be bundled together with the source file, always relative to the current
                                            working directory. Typically such file contains global variables for a particular environment such as
                                            PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  -a, --asset-exts <assetExts...>           A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath
                                            = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                            provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                         Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                               Include inline source map and inline source.
  -c, --tsconfig-file <file>                The file path to tsconfig.json, always relative to the current working directory. If not provided, it
                                            will try to look for it at the current working directory.
  -h, --help                                display help for command
```

```
$ bundage bfb -h
Usage: bundage bundleForBrowser|bfb [options] <sourceFile> <outputFile>

Compile and bundle from a TypeScript source file that can be run in Browser. Both file exts can be neglected and are always fixed as .ts and .js respectively.
Both file paths need to be relative to <rootDir>.

Options:
  -r, --root-dir <rootDir>                  The root directory that source file, output file, and asset files should be relative to. If not
                                            provided, it will be the current working directory.
  -e, --environment-file <environmentFile>  An extra TypeScript file to be bundled together with the source file, always relative to the current
                                            working directory. Typically such file contains global variables for a particular environment such as
                                            PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  -a, --asset-exts <assetExts...>           A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath
                                            = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                            provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                         Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                               Include inline source map and inline source.
  -c, --tsconfig-file <file>                The file path to tsconfig.json, always relative to the current working directory. If not provided, it
                                            will try to look for it at the current working directory.
  -h, --help                                display help for command
```




## Run in node

You can bundle and then run the bundled JS file in Node in one command.

```
$ bundage nrun -h
Usage: bundage runInNode|nrun [options] <sourceFile>

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Node. The file ext can be neglected and is always fixed as .ts.
Pass through arguments to the exectuable file after --.

Options:
  -e, --environment-file <environmentFile>  An extra TypeScript file to be bundled together with the source file, always relative to the current
                                            working directory. Typically such file contains global variables for a particular environment such as
                                            PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  -a, --asset-exts <assetExts...>           A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath
                                            = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                            provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                         Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                               Include inline source map and inline source.
  -c, --tsconfig-file <file>                The file path to tsconfig.json, always relative to the current working directory. If not provided, it
                                            will try to look for it at the current working directory.
  -h, --help                                display help for command
``` 

## Run in Puppeteer

This command makes it feels like running an exectuable TS/JS file in Node but actually in Puppeteer/headless Chrome environment. It bundles and runs the bundled JS file by writing a temp HTML file pointing to the JS file, starting a local server and registering file handlers to serve them. We expect your bundled JS file does all the UI work, creating HTML elements, setting CSS and etc.

```
$ bundage prun -h
Usage: bundage runInPuppeteer|prun [options] <sourceFile>

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Puppeteer, i.e., headless Chrome. The file ext can be neglected
and is always fixed as .ts. The file path needs to be relative to <rootDir>. Pass through arguments to the exectuable file after --.

Options:
  -r, --root-dir <rootDir>                  The root directory that source file, output file, and asset files should be relative to. If not
                                            provided, it will be the current working directory.
  -e, --environment-file <environmentFile>  An extra TypeScript file to be bundled together with the source file, always relative to the current
                                            working directory. Typically such file contains global variables for a particular environment such as
                                            PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  -a, --asset-exts <assetExts...>           A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath
                                            = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                            provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                         Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                               Include inline source map and inline source.
  -c, --tsconfig-file <file>                The file path to tsconfig.json, always relative to the current working directory. If not provided, it
                                            will try to look for it at the current working directory.
  -p, --port <port>                         The port number to start your local server. Default to 8000.
  -h, --help                                display help for command
```

## Execute in Puppeteer

Used by `$ bundage prun` behind the scene. `$ bundage pexe` assumes you bundled it already by either `$ bundage bfb` or other bundlers.

```
$ bundage pexe -h
Usage: bundage executeInPuppeteer|pexe [options] <binFile>

Execute the presumably bundled JavaScript file in Puppeteer, i.e., headless Chrome. The file ext can be neglected and is always fixed as .js. The file
path needs to be relative to <rootDir>. Pass through arguments to the exectuable file after --.

Options:
  -r, --root-dir <rootDir>  The root directory that source file, output file, and asset files should be relative to. If not provided, it will be
                            the current working directory.
  -p, --port <port>         The port number to start your local server. Default to 8000.
  -h, --help                display help for command
```

## Bundle web apps

Bundle all web apps (SPAs) for your production web server. The schema of `--entries-config` file is a JSON representation of [WebAppEntries](https://github.com/selfage/bundler_cli/blob/6eb18f1596febd3e74da9ee772ac2953dbab0f6f/web_app_entries_def.ts#L27).

After bundling, e.g. you can start [http-server](https://www.npmjs.com/package/http-server) at `--out-dir`. `--bundled-resources` which is generated after bundling, can also be used as an allowlist of files to be served in your server.

```
$ bundage bwa -h
Usage: bundage bundleWebApps|bwa [options]

Bundle all TypeScript source files based on <entriesConfig>, generate HTML files pointing to the bundled JS files respectively, compress them with Gzip,
collect a list of all bundled JS & HTML file paths and asset file paths to <bundledResources>, and finally copy those files into <outDir> where your web
server can be started.

Options:
  -r, --root-dir <rootDir>                    The root directory that source file, output file, and asset files should be relative to. If not
                                              provided, it will be the current working directory.
  -m, --entries-config <entriesConfig>        A config file to specify a list of entry files, each of which should be a single page application.
                                              The file path needs to be relative to <rootDir>. See
                                              https://www.npmjs.com/package/@selfage/bundler_cli for its schema. If not provided, it will look for
                                              <rootDir>/web_app_entries.json.
  -o, --out-dir <outDir>                      The output directory to where files will be copied. If not provided, it will be the same as
                                              <rootDir>. When <outDir> equals <rootDir>, no copies happen.
  -b, --bundled-resources <bundledResources>  An output file generated after bundling, containing a JSON array of files that need to be copied to
                                              <outDir> and served in your web server. The file path needs to be relative to <rootDir>. If not
                                              provided, it will write to <rootDir>/web_app_resources.json.
  -e, --environment-file <environmentFile>    An extra TypeScript file to be bundled together with the source file, always relative to the current
                                              working directory. Typically such file contains global variables for a particular environment such as
                                              PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  -a, --asset-exts <assetExts...>             A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import
                                              imagePath = require('./image.png')` which enables `<img src={imagePath}>` or
                                              `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json
                                              which should be a list of strings.
  -s, --skip-minify                           Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                                 Include inline source map and inline source.
  -c, --tsconfig-file <file>                  The file path to tsconfig.json, always relative to the current working directory. If not provided, it
                                              will try to look for it at the current working directory.
  -h, --help                                  display help for command
```

## Options explained

### Environment file

See [this answer](https://stackoverflow.com/questions/38906359/create-a-global-variable-in-typescript/67040805#67040805) for how to properly create and use environment file with the help of globalThis.

### Asset files

As explained in all helper manuals, you can also `import imagePath = require('./image.png');` with `-a .png .gif .jpg` flag, which doesn't really import the image but only import its path. When bundle for Node, it's the relative path from the bundled output file. When bundle for browser, it's the url path that is expected to be mapped to a relative path from the root directory. E.g., the url path would work if you start a [http-server](https://www.npmjs.com/package/http-server) at `--root-dir`. Now you can load images, CSS files or assets without worrying about their actual URL paths -- they will be inferred at bundling time.

Equivalently, you can define `"assetExts": [".png", ".gif", ".jpg"]` in your `package.json` file to save you from typing the list everytime.

### Debug

Note that `--debug` doesn't guarantee stack traces will be mapped to TypeScript source code. You could consider using `source-map-support` package. E.g., you can `import 'source-map-support/register';` in your main file.

## Puppeteer executor environment

[Puppetter](https://www.npmjs.com/package/puppeteer) is essentially a headless Chrome. The term "Puppeteer executor environment" refers to the runtime environment provided by `$ bundage prun` or `$ bundage pexe` which is based on Puppeteer but with some additional APIs.

### Pass-through arguments

Pass-through arguments are made available by writing them to the temp HTML file, which can then be accessed by the JS code running in it. See [@selfage/puppeteer_executor_api#access-argv](https://github.com/selfage/puppeteer_executor_api#access-argv) for more details.

### Command APIs

Command APIs are quite primitive by simply logging special "commands" via `console.log()`. Logging events are exposed by Puppeteer and are listened to by `$ bundage prun` or `$ bundage pexe`, which then looks for those special strings and performs actions that are normally prohibited in browser environment, such as writing files.

See [@selfage/puppeteer_executor_api#command-apis](https://github.com/selfage/puppeteer_executor_api#command-apis) for all available APIs.

## General API access

Each sub-command corresponds to an API as the following.

`bundleForNode` -> `import { bundleForNodeReturnAssetFiles } from '@selfage/bundler_cli/bundler';`

`bundleForBrowser` -> `import { bundleForBrowserReturnAssetFiles } from '@selfage/bundler_cli/bundler';`

`runInNode` -> `import { runInNode } from '@selfage/bundler_cli/runner_in_node';`

`runInPuppeteer` -> `import { runInPuppeteer } from '@selfage/bundler_cli/runner_in_puppeteer';`

`executeInPuppeteer` -> `import { executeInPuppeteer } from '@selfage/bundler_cli/puppeteer_executor';`

`bundleWebApps` -> `import { bundleWebAppsAndCopyFiles } from '@selfage/bundler_cli/web_apps_bundler';`

To reference Puppeteer executor APIs, you can `import { EXIT } from '@selfage/bundler_cli/puppeteer_executor_apis';`

