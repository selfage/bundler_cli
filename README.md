# @seflage/cli

## Install

`npm install @selfage/cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides an opinionated CLI toolkit for developing frontend and backend in TypeScript. See sections below for each sub-command.

## Compile

Please make sure it's run from the directory where your tsconfig.json is defined.

If you specified `incremental: true` in your tsconfig.json, `tsBuildInfoFile` will not be respected and will be overriden by `${filename}.tsbuildinfo`.

Respect merging base tsconfig via `extends`.

```
$ selfage compile -h
Usage: selfage compile|cpl [options] <file>

Compile a single TypeScript source file while respecting compilerOptions in tsconfig.json. The file type can be neglected and is always fixed as '.ts'.

Options:
  -h, --help  display help for command
```

## Clean

Currently, only files under directory `node_modules/` and `test_data/` will be ignored.

```
$ selfage clean -h
Usage: selfage clean [options]

Delete all files generated from building and bundling.

Options:
  -h, --help  display help for command
```

## Run

```
$ selfage run -h
Usage: selfage run [options] <file>

Compile and run the specified file. The file type can be neglected and is always fixed as '.ts'. Pass through arguments to the executable file after --.

Options:
  -h, --help  display help for command
```

## Browserify

There are two variants to browserify, to be run in Node or browser environment, by wiring `browserify` and `uglify-js`.

```
$ selfage brn -h
Usage: selfage browserifyForNode|brn [options] <sourceFile> <outputFile>

Compile a single TypeScript source file and browserify & uglify all its imported files into a bundle that can be run in Node environment. Output file type is fixed as .js.

Options:
  -e, --environment-file <environmentFile>  An extra TypeScript file to be browserified & uglified together with the soure file. Typically such file contains global variables for a particular
                                            environment such as PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  --debug                                   Include inline source map and inline source.
  -h, --help                                display help for command
```

```
$ selfage brb -h
Usage: selfage browserifyForBrowser|brb [options] <sourceFile> <outputFile>

Compile a single TypeScript source file and browserify & uglify all its imported files into a bundle that can be run in browsers. Output file type is fixed as .js.

Options:
  -e, --environment-file <environmentFile>  An extra TypeScript file to be browserified & uglified together with the source file. Typically such file contains global variables for a particular
                                            environment such as PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  --debug                                   Include inline source map and inline source.
  -h, --help                                display help for command
```

See [this answer](https://stackoverflow.com/questions/38906359/create-a-global-variable-in-typescript/67040805#67040805) for how to properly create and use environment file with the help of `globalThis`.

Note that `--debug` doesn't guarantee stack traces will be mapped to TypeScript source code. You could consider using `source-map-support` package. For Node environment, you can `import 'source-map-support/register';` in your main file. For browser environment, referring to its [browser support](https://github.com/evanw/node-source-map-support#browser-support). Importing `source-map-support/register` for browser environment will bloat your final JS file size by 20+ KiB, because browserifying and uglifying will produce a ton of source map codes just for `source-map-support/register`.

## Build web pages

See `@selfage/web_page_handler` for detailed explanation of the generated files based on the config file, and how to serve those files on a web server.

```
$ selfage bwp -h
Usage: selfage buildWebPages|bwp [options] <rootDir>

Compile, browserify, and uglify TypeScript files into JavaScript and HTML files, based on <rootDir>/web_page_mapping_config.json.

Options:
  -e, --environment-file <environmentFile>  An extra TypeScript file to be browserified & uglified together with the source file. Typically such file contains global variables for a particular
                                            environment such as PROD or DEV, and it's not imported by the source file but assumed to be present at runtime.
  --debug                                   Include inline source map and inline source.
  -h, --help                                display help for command
```

See [this answer](https://stackoverflow.com/questions/38906359/create-a-global-variable-in-typescript/67040805#67040805) for how to properly create and use environment file with the help of `globalThis`.

`--debug` still only includes inline source map and inline source, but `web_page_mapping_config.json` asks for `browser-source-map-support.js` file, which then lets stack traces be mapped to TypeScript source code.

## Format

On top of `prettier`, add support to sort imports in a deterministic way but will not keep comments between import statements in place. Please leave comments on top of all import statements.

```
$ selfage format -h
Usage: selfage format|fmt [options] <file>

Format the specified file. The file type is always fixed as '.ts'.

Options:
  --dry-run   Print the formatted content instead of overwriting the file.
  -h, --help  display help for command
```

## Generate descriptors

See `@selfage/message`, `@selfage/datastore_client` and `@selfage/service_descriptor` packages for detailed explanation of various generated descritpors.

```
$ selfage generate -h
Usage: selfage generate|gen [options] <file>

Generate various descriptors from the specified source file. The source file type is fixed as '.json' and the destination file type is fixed as '.ts'.

Options:
  -i, --index-file <indexFile>  The index yaml file for Google Cloud Datastore composite index. The file type is fixed as
                                '.yaml'. Requried only if your source file includes a datastore definition.
  --dry-run                     Print the generated content instead of writing it to the destination file.
  -h, --help                    display help for command
```

## API access

This package is not designed to expose APIs but you are welcome to refer to the .d.ts files to see what you want to use. E.g., you could `import { compile } from '@selfage/cli/build/compiler';` and call `compile('some_source', 'tsconfig.json')` to compile a single file. The entry file for this package is main.js/main.d.ts.

