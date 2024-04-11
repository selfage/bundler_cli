import fs = require("fs");
import { bundleForBrowser, bundleForNode } from "./bundler";
import { execute as executeInPuppeteer } from "@selfage/puppeteer_test_executor";
import { assert, assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { execSync } from "child_process";

TEST_RUNNER.run({
  name: "BundlerTest",
  cases: [
    {
      name: "BundleTwoFilesWithInlineJsForNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          undefined,
          undefined,
          {
            inlineJs: [`globalThis.extra = "yes";`],
            tsconfigFile: "./test_data/bundler/tsconfig.json",
          },
        );

        // Verify
        assertThat(
          execSync("node ./test_data/bundler/two_file_bin.js").toString(),
          containStr("31yes"),
          "output",
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
      name: "BundleTwoFilesWithInlineJsForNodeSkipMinify",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          undefined,
          undefined,
          {
            inlineJs: [`globalThis.extra = "yes";`],
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            skipMinify: true,
          },
        );

        // Verify
        assertThat(
          execSync("node ./test_data/bundler/two_file_bin.js").toString(),
          containStr("31yes"),
          "output",
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
          undefined,
          undefined,
          { tsconfigFile: "./test_data/bundler/tsconfig.json", debug: true },
        );

        // Verify
        try {
          execSync("node ./test_data/bundler/stack_trace_bin.js");
        } catch (e) {
          assert(
            /test_data.bundler.stack_trace\.ts/.test((e as Error).message),
            "the error message to contain test_data/bundler/stack_trace.ts",
            (e as Error).message,
          );
        }

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
          undefined,
          undefined,
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            extraFiles: ["./test_data/bundler/environment_dev.ts"],
          },
        );

        // Verify
        assertThat(
          execSync(
            "node ./test_data/bundler/try_environment_bin.js",
          ).toString(),
          containStr("Something else"),
          "output",
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
          undefined,
          undefined,
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            extraFiles: ["./test_data/bundler/environment_prod.ts"],
          },
        );

        // Verify
        assertThat(
          execSync(
            "node ./test_data/bundler/try_environment_bin.js",
          ).toString(),
          containStr("Prod!"),
          "output",
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
      name: "BundleAssetsAndCopyInNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          "./test_data/bundler",
          "./test_data/bundler/out_copy",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            assetExts: [".txt"],
          },
        );

        // Verify
        assertThat(
          execSync("node ./test_data/bundler/use_text_bin.js").toString(),
          containStr("not\n:11"),
          "original output",
        );
        assertThat(
          execSync(
            "node ./test_data/bundler/out_copy/use_text_bin.js",
          ).toString(),
          containStr("not\n:11"),
          "copied output",
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_text.js"),
          fs.promises.unlink("./test_data/bundler/use_text_bin.js"),
          fs.promises.unlink("./test_data/bundler/out_copy/use_text_bin.js"),
          fs.promises.unlink("./test_data/bundler/out_copy/inside/some.txt"),
        ]);
        await fs.promises.rmdir("./test_data/bundler/out_copy/inside");
        await fs.promises.rmdir("./test_data/bundler/out_copy");
      },
    },
    {
      name: "BundleAssetsAndCopyWithPackageJsonInNode",
      execute: async () => {
        // Execute
        await bundleForNode(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          "./test_data/bundler",
          "./test_data/bundler/out_pack",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            packageJsonFile: "./test_data/bundler/package.json",
          },
        );

        // Verify
        assertThat(
          execSync("node ./test_data/bundler/use_text_bin.js").toString(),
          containStr("not\n:11"),
          "original output",
        );
        assertThat(
          execSync(
            "node ./test_data/bundler/out_pack/use_text_bin.js",
          ).toString(),
          containStr("not\n:11"),
          "copied output",
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_text.js"),
          fs.promises.unlink("./test_data/bundler/use_text_bin.js"),
          fs.promises.unlink("./test_data/bundler/out_pack/use_text_bin.js"),
          fs.promises.unlink("./test_data/bundler/out_pack/inside/some.txt"),
        ]);
        await fs.promises.rmdir("./test_data/bundler/out_pack/inside");
        await fs.promises.rmdir("./test_data/bundler/out_pack");
      },
    },
    {
      name: "StackTraceIncludeTsFileInBrowser",
      execute: async () => {
        // Execute
        await bundleForBrowser(
          "./test_data/bundler/stack_trace.ts",
          "./test_data/bundler/stack_trace_bin.js",
          undefined,
          undefined,
          { tsconfigFile: "./test_data/bundler/tsconfig.json", debug: true },
        );

        // Verify
        let outputCollection = await executeInPuppeteer(
          "./test_data/bundler/stack_trace_bin.js",
        );
        assert(
          /test_data.bundler.stack_trace\.ts/.test(outputCollection.error[0]),
          "the error message to contain test_data/bundler/stack_trace.ts",
          outputCollection.error[0],
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/stack_trace.js"),
          fs.promises.unlink("./test_data/bundler/stack_trace_bin.js"),
        ]);
      },
    },
    {
      name: "BundleAssetsAndCopyInBrowser",
      execute: async () => {
        // Execute
        await bundleForBrowser(
          "./test_data/bundler/use_image.ts",
          "./test_data/bundler/use_image_bin.ts",
          "./test_data/bundler",
          "./test_data/bundler/out_browser",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            assetExts: [".jpg", ".png"],
          },
        );

        // Verify
        await executeInPuppeteer(
          "./test_data/bundler/use_image_bin.js",
          "./test_data/bundler",
        );
        await executeInPuppeteer(
          "./test_data/bundler/out_browser/use_image_bin.js",
          "./test_data/bundler/out_browser",
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_image.js"),
          fs.promises.unlink("./test_data/bundler/use_image_bin.js"),
          fs.promises.unlink(
            "./test_data/bundler/out_browser/use_image_bin.js",
          ),
          fs.promises.unlink(
            "./test_data/bundler/out_browser/golden_image.png",
          ),
          fs.promises.unlink(
            "./test_data/bundler/out_browser/inside/sample.png",
          ),
        ]);
        await fs.promises.rmdir("./test_data/bundler/out_browser/inside");
        await fs.promises.rmdir("./test_data/bundler/out_browser");
      },
    },
  ],
});
