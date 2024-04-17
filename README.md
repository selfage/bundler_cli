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

Compile and bundle from a TypeScript source file that can be run in Node. Both file exts can be neglected and are always fixed as .ts and .js respectively. Npm modules are not actually bundled due to many of them not compatible with bundling.

Options:
  -f, --from-dir <fromDir>           The directoy to copy from. If not provided, it will be the current working directory.
  -t, --to-dir <toDir>               The directoy to copy to. If not provided, or when <toDir> equals <fromDir>, no copies happen.
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath =
                                     require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                     provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                         display help for command
```

```
$ bundage bfb -h
Usage: bundage bundleForBrowser|bfb [options] <sourceFile> <outputFile>

Compile and bundle from a TypeScript source file that can be run in Browser. Both file exts can be neglected and are always fixed as .ts and .js respectively.

Options:
  -b, --base-dir <baseDir>           The base directory that all imported assets should be relative to, such that a web server can serve files at
                                     this directory. If not provided, it will be the current working directory.
  -o, --out-dir <outDir>             The output directory to where files will be copied. If not provided, or when <outDir> equals <baseDir>, no
                                     copies happen.
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath =
                                     require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                     provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                         display help for command
```

## Run in node

You can bundle and then run the bundled JS file in Node in one command.

```
$ bundage nrun -h
Usage: bundage runInNode|nrun [options] <sourceFile>

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Node. The file ext can be neglected and is always fixed as .ts. Pass through arguments to the exectuable file after --.

Options:
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath =
                                     require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not
                                     provided, it will look for `assetExts` field in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                         display help for command
```

## Run in Puppeteer

Based on [@selfage/puppeteer_test_executor](https://www.npmjs.com/package/@selfage/puppeteer_test_executor), it bundles and runs the bundled JS file in browser context with more powerful global functions. The bundled JS file is expected to include everything needed to render a page or bootstrap by loading other files.

```
$ bundage prun -h
Usage: main runInPuppeteer|prun [options] <sourceFile> [pass-through-args...]

Compile and bundle from a TypeScript source file, and run the bundled JavaScript file in Puppeteer, i.e., headless Chrome. The file ext can be neglected and is always fixed as .ts. "--" is needed in between <sourceFile> and pass through arguments.

Options:
  -b, --base-dir <baseDir>           The base directory that all imported assets should be relative to, such that a web server can serve files at this directory. If not provided, it will be the current working directory.
  -e, --extra-files <extraFiles...>  Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>      Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>    A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field  
                                     in ./package.json which should be a list of strings.
  -s, --skip-minify                  Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                        Include inline source map and inline source.
  -c, --tsconfig-file <file>         The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -p, --port <port>                  The port number to start your local server. Default to 8000.
  -nh, --no-headless                 Turn off running the browser in headless mode.
  -h, --help                         display help for command
```

## Bundle web apps

Bundle all web apps (SPAs) for your production web server. The schema of `--entries-config` file is a JSON representation of [WebAppEntries](https://github.com/selfage/bundler_cli/blob/6eb18f1596febd3e74da9ee772ac2953dbab0f6f/web_app_entries_def.ts#L27).

After bundling, e.g. you can start [http-server](https://www.npmjs.com/package/http-server) at `--out-dir`. `--bundled-resources` which is generated after bundling, can also be used as an allowlist of files to be served in your server.

```
$ bundage bwa -h
Usage: bundage bundleWebApps|bwa [options]

Bundle all TypeScript source files based on <entriesConfig>, generate HTML files pointing to the bundled JS files respectively, compress them with Gzip, collect a list of all bundled JS & HTML file paths and asset file paths to <bundledResources>, and finally copy those files into <outDir> where your web server can be started.

Options:
  -ec, --entries-config-file <entriesConfigFile>        A config file to specify a list of entry files, each of which should be a single page application. See
                                                        https://www.npmjs.com/package/@selfage/bundler_cli for its schema. Its directory is the base that all imported assets should be relative to,
                                                        and a web server can serve files at this directory. If not provided, it will look for ./web_app_entries.json.
  -br, --bundled-resources-file <bundledResourcesFile>  An output file generated after bundling, containing a JSON array of files that need to be copied to <outDir> and served in your web server.
                                                        If not provided, it will write to ./web_app_resources.json.
  -o, --out-dir <outDir>                                The output directory to where files will be copied. If not provided, or when <outDir> equals <baseDir>, no copies happen.
  -e, --extra-files <extraFiles...>                     Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>                         Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>                       A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which
                                                        enables `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which
                                                        should be a list of strings.
  -s, --skip-minify                                     Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                                           Include inline source map and inline source.
  -c, --tsconfig-file <file>                            The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                                            display help for command
```

## Bundle web server

If your server needs to serve other traffic than just SPAs, import `@selfage/web_app_base_dir` in your backend server file, which declares a global variable `WEB_APP_BASE_DIR`. Then e.g. if you are using Express.js, you can write `express.static(globalThis.WEB_APP_BASE_DIR)`.

The global variable is only made available after calling `$ bundage bws` with its value populated as the directory of `--entries-config-file`.

```
$ bundage bws -h
Usage: bundage bundleWebServer|bws [options] <serverSourceFile> <serverOutputFile>

Bundle a TypeScript source file as the server's main file and output. Both file exts can be neglected and are always fixed as .ts and .js respectively. Npm modules are not actually bundled due to many of them not compatible with bundling. It will also bundle web apps based on <entriesConfigFile> as well as <baseDir>. Finally, all bundled files and imported or extra assets will be copied from <fromDir> to <toDir>, without any source file or intermediate file.

Options:
  -ec, --entries-config-file <entriesConfigFile>  A config file to specify a list of entry files, each of which should be a single page application. See
                                                  https://www.npmjs.com/package/@selfage/bundler_cli for its schema. Its directory is the base that all imported assets should be relative to, and a
                                                  web server can serve files at this directory. If not provided, it will look for ./web_app_entries.json.
  -f, --from-dir <fromDir>                        The directoy to copy from. If not provided, it will be the current working directory.
  -t, --to-dir <toDir>                            The directoy to copy to. If not provided, or when <toDir> equals <fromDir>, no copies happen.
  -e, --extra-files <extraFiles...>               Extra TypeScript files to be bundled together with and before the source file.
  -i, --inline-js <inlineJs...>                   Inline JavaScript code to be bundled together with and before all files.
  -a, --asset-exts <assetExts...>                 A list of file exts that are treated as assets. E.g., with "-a .png .jpg", you could `import imagePath = require('./image.png')` which enables
                                                  `<img src={imagePath}>` or `fs.readFileSync(imagePath)`. If not provided, it will look for `assetExts` field in ./package.json which should be a
                                                  list of strings.
  -s, --skip-minify                               Skip minification when bundling. Useful for inspecting bundling issues.
  -d, --debug                                     Include inline source map and inline source.
  -c, --tsconfig-file <file>                      The file path to tsconfig.json. If not provided, it will try to look for it at the current working directory.
  -h, --help                                      display help for command
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

`bundleForNode` -> `import { bundleForNode } from '@selfage/bundler_cli/bundler';`

`bundleForBrowser` -> `import { bundleForBrowser } from '@selfage/bundler_cli/bundler';`

`runInNode` -> `import { runInNode } from '@selfage/bundler_cli/runner_in_node';`

`runInPuppeteer` -> `import { runInPuppeteer } from '@selfage/bundler_cli/runner_in_puppeteer';`

`bundleWebApps` -> `import { bundleWebApps } from '@selfage/bundler_cli/web_apps_bundler';`

`bundleWebServer` -> `import { bundleWebServer } from '@selfage/bundler_cli/web_server_bundler';`

