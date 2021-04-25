import express = require("express");
import fs = require("fs");
import http = require("http");
import path = require("path");
import puppeteer = require("puppeteer");
import { OutputFiles, bundleForBrowser, bundleForNode } from "./bundler";
import {
  MatchFn,
  assertThat,
  containStr,
  eq,
  eqArray,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { SpawnSyncReturns, spawnSync } from "child_process";

function executeSync(jsFile: string): SpawnSyncReturns<string> {
  return spawnSync("node", [jsFile]);
}

class PuppeteerExecutor {
  private static HOST_NAME = "localhost";
  private static PORT = 8000;
  private static HOST_URL =
    `http://${PuppeteerExecutor.HOST_NAME}:` + `${PuppeteerExecutor.PORT}`;

  private server: http.Server;
  private browser: puppeteer.Browser;
  private tempBinFile: string;

  public async execute(
    rootDir: string,
    binFile: string,
    preExecute: (page: puppeteer.Page) => void
  ): Promise<puppeteer.Page> {
    this.tempBinFile = path.join(rootDir, "selfage_temp_bin.html");
    await fs.promises.writeFile(
      this.tempBinFile,
      `<html>
  <body>
    <script type="text/javascript" src="/${binFile}"></script>
  </body>
</html>`
    );
    let app = express();
    app.use("/", express.static(rootDir));
    this.server = http.createServer(app);
    await new Promise<void>((resolve) => {
      this.server.listen(
        { host: PuppeteerExecutor.HOST_NAME, port: PuppeteerExecutor.PORT },
        () => resolve()
      );
    });
    this.browser = await puppeteer.launch();
    let page = await this.browser.newPage();
    preExecute(page);
    await page.goto(`${PuppeteerExecutor.HOST_URL}/selfage_temp_bin.html`);
    return page;
  }

  public async clean(): Promise<void> {
    let closeServerPromise = new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
    await Promise.all([
      this.browser.close(),
      closeServerPromise,
      fs.promises.unlink(this.tempBinFile),
    ]);
  }
}

function eqOutputFiles(expected: OutputFiles): MatchFn<OutputFiles> {
  return (actual) => {
    assertThat(actual.rootDir, eq(expected.rootDir), "roorDir");
    assertThat(actual.binFile, eq(expected.binFile), "binFile");
    assertThat(
      actual.assetFiles,
      eqArray(expected.assetFiles.map((file) => eq(file))),
      "assetFiles"
    );
  };
}

TEST_RUNNER.run({
  name: "BundlerTest",
  cases: [
    {
      name: "BundleTwoFilesForNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          "./test_data/bundler/tsconfig.json"
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/two_file_bin.js").stdout,
          containStr("31"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/two_file.js"),
          fs.promises.unlink("./test_data/bundler/two_file_bin.js"),
        ]);
      },
    },
    {
      name: "BundleTwoFilesForNodeSkipMinify",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          "./test_data/bundler/tsconfig.json",
          { skipMinify: true }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/two_file_bin.js").stdout,
          containStr("31"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/two_file.js"),
          fs.promises.unlink("./test_data/bundler/two_file_bin.js"),
        ]);
      },
    },
    {
      name: "StackTraceIncludeTsFileInNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/stack_trace.ts",
          "./test_data/bundler/stack_trace_bin.js",
          "./test_data/bundler/tsconfig.json",
          { isDebug: true }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/stack_trace_bin.js").stderr,
          containStr("test_data/bundler/stack_trace.ts"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/stack_trace.js"),
          fs.promises.unlink("./test_data/bundler/stack_trace_bin.js"),
        ]);
      },
    },
    {
      name: "OnlyExecuteCodeUnderDevEnvironment",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/try_environment.ts",
          "./test_data/bundler/try_environment_bin.js",
          "./test_data/bundler/tsconfig.json",
          { environmentFile: "./test_data/bundler/environment_dev.ts" }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/try_environment_bin.js").stdout,
          containStr("Something else"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/try_environment.js"),
          fs.promises.unlink("./test_data/bundler/environment_dev.js"),
          fs.promises.unlink("./test_data/bundler/environment.js"),
          fs.promises.unlink("./test_data/bundler/try_environment_bin.js"),
        ]);
      },
    },
    {
      name: "OnlyExecuteCodeUnderProdEnvironment",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/try_environment.ts",
          "./test_data/bundler/try_environment_bin.js",
          "./test_data/bundler/tsconfig.json",
          { environmentFile: "./test_data/bundler/environment_prod.ts" }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/try_environment_bin.js").stdout,
          containStr("Prod!"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/try_environment.js"),
          fs.promises.unlink("./test_data/bundler/environment_prod.js"),
          fs.promises.unlink("./test_data/bundler/environment.js"),
          fs.promises.unlink("./test_data/bundler/try_environment_bin.js"),
        ]);
      },
    },
    {
      name: "BundleAssetsInNode",
      execute: async () => {
        // Execute
        let outputFiles = await bundleForNode(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          "./test_data/bundler/tsconfig.json",
          { assetExts: ["txt"] }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/use_text_bin.js").stdout,
          containStr("not\n:real\n:11"),
          "output"
        );
        assertThat(
          outputFiles,
          eqOutputFiles({
            rootDir: "./test_data/bundler",
            binFile: "use_text_bin.js",
            assetFiles: ["./inside/some.txt"],
          }),
          "outputFiles"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_text.js"),
          fs.promises.unlink("./test_data/bundler/use_text_bin.js"),
        ]);
      },
    },
    {
      name: "BundleAssetsWithPackageJsonInNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          "./test_data/bundler/tsconfig.json",
          { packageJson: "./test_data/bundler/package.json" }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/use_text_bin.js").stdout,
          containStr("not\n:real\n:11"),
          "output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_text.js"),
          fs.promises.unlink("./test_data/bundler/use_text_bin.js"),
        ]);
      },
    },
    {
      name: "StackTraceIncludeTsFileInBrowser",
      execute: async () => {
        // Execute
        let outputFiles = await bundleForBrowser(
          "./test_data/bundler/stack_trace.ts",
          "./test_data/bundler/stack_trace_bin.js",
          "./test_data/bundler/tsconfig.json",
          undefined,
          { isDebug: true }
        );

        // Verify
        assertThat(
          outputFiles,
          eqOutputFiles({
            rootDir: "./test_data/bundler",
            binFile: "stack_trace_bin.js",
            assetFiles: [],
          }),
          "outputFiles"
        );
        let executor = new PuppeteerExecutor();
        let errorPromise: Promise<string>;
        await executor.execute(
          outputFiles.rootDir,
          outputFiles.binFile,
          (page) => {
            errorPromise = new Promise<string>((resolve) => {
              page.on("pageerror", (err) => {
                resolve(err.message);
              });
            });
          }
        );
        assertThat(
          await errorPromise,
          containStr("test_data/bundler/stack_trace.ts"),
          "output"
        );

        // Cleanup
        await Promise.all([
          executor.clean(),
          fs.promises.unlink("./test_data/bundler/stack_trace.js"),
          fs.promises.unlink("./test_data/bundler/stack_trace_bin.js"),
        ]);
      },
    },
    {
      name: "BundleAssetsWithRootDirInBrowser",
      execute: async () => {
        // Execute
        let outputFiles = await bundleForBrowser(
          "./test_data/bundler/use_image.ts",
          "./test_data/bundler/use_image_bin.ts",
          "./test_data/bundler/tsconfig.json",
          "./test_data",
          { assetExts: ["jpg"] }
        );

        // Verify
        assertThat(
          outputFiles,
          eqOutputFiles({
            rootDir: "./test_data",
            binFile: "bundler/use_image_bin.js",
            assetFiles: ["./bundler/inside/sample.jpg"],
          }),
          "outputFiles"
        );
        let executor = new PuppeteerExecutor();
        let errors = new Array<string>();
        let page = await executor.execute(
          outputFiles.rootDir,
          outputFiles.binFile,
          (page) => {
            page.on("console", (msg) => {
              if (msg.type() === "error") {
                errors.push(msg.text());
              }
            });
            page.on("pageerror", (err) => {
              errors.push(err.message);
            });
          }
        );
        let pageContent = await page.content();
        assertThat(
          pageContent,
          containStr('src="/bundler/inside/sample.jpg"'),
          "img src"
        );
        assertThat(
          pageContent,
          containStr('class="other">11</div>'),
          "foo div"
        );
        assertThat(errors, eqArray([]), "no page errors");

        // Cleanup
        await Promise.all([
          executor.clean(),
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_image.js"),
          fs.promises.unlink("./test_data/bundler/use_image_bin.js"),
        ]);
      },
    },
  ],
});
