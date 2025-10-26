# @seflage/bundler_cli

## Install

`npm install @selfage/bundler_cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides an opinionated bundling tools for developing frontend and backend in TypeScript, especially single page applications (SPAs), powered by `browserify` and `uglify-js`, supporting importing asset files. See sections below for each sub-command and see [commander](https://www.npmjs.com/package/commander) if you are not sure about CLI syntax.

Note that despite TypeScript can compile with various options, we expect you to set `"module": "commonjs"` and `"moduleResolution": "node"`, due to the use of `browserify`.

## Run in node

You can bundle and then run the bundled JS file in Node in one command.

```
$ bundage nrun -h
Usage: bundage runInNode|nrun [options] <sourceFile> [pass-through-args...]

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Node. The file ext can be neglected and is always fixed as .ts. "--" is needed in between <sourceFile> and pass through arguments.

Options:
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                         display help for command
```

## Run in Puppeteer

Based on [@selfage/puppeteer_test_executor](https://www.npmjs.com/package/@selfage/puppeteer_test_executor), it bundles and runs the bundled JS file in browser context with more powerful global functions. The bundled JS file is expected to include everything needed to render a page or bootstrap by loading other files.

```
$ bundage prun -h
Usage: bundage runInPuppeteer|prun [options] <sourceFile> [pass-through-args...]

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Puppeteer, i.e., headless Chrome. The file ext can be neglected and is always fixed as .ts. "--" is needed in between <sourceFile> and pass 
through arguments.

Options:
  -b, --base-dir <baseDir>           The base directory that all imported assets should be relative to, such that a web server can serve files at this directory. If not provided, it will be the current working directory.
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -p, --port <port>                  The port number to start your local server. Default to 8000.
  -nh, --no-headless                 Turn off running the browser in headless mode.
  -h, --help                         display help for command
```

## Bundle web apps

Bundle all web apps (SPAs) for your production web server. The schema of `--entries-config` file is a YAML representation of [WebAppEntries](https://github.com/selfage/bundler_cli/blob/e044a035c42f61313f5df24f8bc3bd19b461220e/web_app_entries_def.ts).

After bundling, e.g. you can start [http-server](https://www.npmjs.com/package/http-server) at `--out-dir`.

```
$ bundage bwa -h
Usage: bundage bundleWebApps|bwa [options]

Bundle all TypeScript source files based on <entriesConfig>, generate HTML files pointing to the bundled JS files respectively, compress them with Gzip, and finally move those files into
<outDir> where your web server can be started.

Options:
  -ec, --entries-config-file <entriesConfigFile>  A config file to specify a list of entry files, each of which should be a single page application. Loop for "WebAppEntries" in
                                                  https://github.com/selfage/bundler_cli/blob/main/web_app_entries_def.ts for its schema. Its directory is the base that all imported assets
                                                  should be relative to, and a web server can serve files at this directory. If not provided, it will look for ./web_app_entries.yaml.
  -b, --base-dir <baseDir>                        The base directory that all imported assets should be relative to, such that a web server can serve files at this directory. If not
                                                  provided, it will be the current working directory.
  -o, --out-dir <outDir>                          The output directory to where files will be copied. If not provided, or when <outDir> equals <baseDir>, no copies happen.
  -e, --extra-files <extraFiles...>               Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>                   Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>                 A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which
                                                  enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which
                                                  should be a list of strings.
  -s, --skip-minify                               Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                                     Include inline source map and inline source.
  -c, --tsconfig-file <file>                      The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                                      display help for command
```

## Bundle node server

Bundle the main server file and dumped to `--to-dir`, where all files can be copied inside a Dockerfile.

```
$ bundage bws -h
Usage: bundage bundleNodeServer|bns [options] <serverSourceFile> <serverOutputFile>

Bundle a TypeScript source file as the server's main file and output. Both file exts can be neglected and are always fixed as .ts and .js respectively. Npm modules are not actually bundled
due to many of them not compatible with bundling. Finally, all bundled files and imported assets will be moved from <fromDir> to <toDir>, without any source file or intermediate file.

Options:
  -f, --from-dir <fromDir>           The directoy to copy from. If not provided, it will be the current working directory.
  -t, --to-dir <toDir>               The directoy to copy to. If not provided, or when <toDir> equals <fromDir>, no copies happen.
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which enables `<img
                                     src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which should be a list of
                                     strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                         display help for command
```

## Options explained

### Extra file

See [this answer](https://stackoverflow.com/questions/38906359/create-a-global-variable-in-typescript/67040805#67040805) for how to use extra files to properly define global `environment` variable with the help of globalThis.

### Asset files

As explained in all helper manuals, you can also `import imagePath = require('./image.png');` with `-a .png .gif .jpg` flag, which doesn't really import the image but only import its path. When bundle for Node, it's the relative path from the bundled output file. When bundle for browser, it's the url path that is expected to be mapped to a relative path from the root directory. E.g., the url path would work if you start a [http-server](https://www.npmjs.com/package/http-server) at `--root-dir`. Now you can load images, CSS files or assets without worrying about their actual URL paths -- they will be inferred at bundling time.

Equivalently, you can define `"assetExts": [".png", ".gif", ".jpg"]` in your `package.json` file to save you from typing the list everytime.

### Debug

Note that `--debug` doesn't guarantee stack traces will be mapped to TypeScript source code. You could consider using `source-map-support` package. E.g., you can `import 'source-map-support/register';` in your main file.

## Puppeteer executor environment

[Puppetter](https://www.npmjs.com/package/puppeteer) is essentially a headless Chrome. The term "Puppeteer executor environment" refers to the runtime environment provided by `$ bundage prun` or `$ bundage pexe` which is based on Puppeteer and provides APIs for testing purposes within browser context.

### Pass-through arguments

Pass-through arguments are made available by writing them to the temp HTML file, which can then be accessed by the JS code running in it. See [@selfage/puppeteer_executor_api#access-argv](https://github.com/selfage/puppeteer_executor_api#access-argv) for more details.

### Function APIs

Functions are made avaialble thanks to Puppeteer's `exposeFunction`. See [@selfage/puppeteer_executor_api#all-apis](https://github.com/selfage/puppeteer_executor_api#all-apis) for all available APIs.

## General API access

Each sub-command corresponds to an API as the following.

`runInNode` -> `import { runInNode } from '@selfage/bundler_cli/runner_in_node';`

`runInPuppeteer` -> `import { runInPuppeteer } from '@selfage/bundler_cli/runner_in_puppeteer';`

`bundleWebApps` -> `import { bundleWebApps } from '@selfage/bundler_cli/web_apps_bundler';`

`bundleNodeServer` -> `import { bundleNodeServer } from '@selfage/bundler_cli/node_server_bundler';`
