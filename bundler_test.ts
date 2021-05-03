import fs = require("fs");
import {
  bundleForBrowserReturnAssetFiles,
  bundleForNodeReturnAssetFiles,
} from "./bundler";
import { executeInPuppeteer } from "./puppeteer_executor";
import {
  assert,
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

TEST_RUNNER.run({
  name: "BundlerTest",
  cases: [
    {
      name: "BundleTwoFilesForNode",
      execute: async () => {
        // Execute
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          { tsconfigFile: "./test_data/bundler/tsconfig.json" }
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
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/two_file.ts",
          "./test_data/bundler/two_file_bin.ts",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            skipMinify: true,
          }
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
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/stack_trace.ts",
          "./test_data/bundler/stack_trace_bin.js",
          { tsconfigFile: "./test_data/bundler/tsconfig.json", debug: true }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/stack_trace_bin.js").stderr,
          containStr("test_data/bundler/stack_trace.ts"),
          "error output"
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
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/try_environment.ts",
          "./test_data/bundler/try_environment_bin.js",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            environmentFile: "./test_data/bundler/environment_dev.ts",
          }
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
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/try_environment.ts",
          "./test_data/bundler/try_environment_bin.js",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            environmentFile: "./test_data/bundler/environment_prod.ts",
          }
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
        let assetFiles = await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            assetExts: ["txt"],
          }
        );

        // Verify
        assertThat(
          executeSync("./test_data/bundler/use_text_bin.js").stdout,
          containStr("not\n:real\n:11"),
          "output"
        );
        assertThat(
          assetFiles,
          eqArray([eq("test_data/bundler/inside/some.txt")]),
          "asset files"
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
        await bundleForNodeReturnAssetFiles(
          "./test_data/bundler/use_text.ts",
          "./test_data/bundler/use_text_bin.ts",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            packageJsonFile: "./test_data/bundler/package.json",
          }
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
        let assetFiles = await bundleForBrowserReturnAssetFiles(
          "./test_data/bundler/stack_trace.ts",
          "./test_data/bundler/stack_trace_bin.js",
          undefined,
          { tsconfigFile: "./test_data/bundler/tsconfig.json", debug: true }
        );

        // Verify
        assertThat(assetFiles, eqArray([]), "asset files");
        let outputCollection = await executeInPuppeteer(
          "./test_data/bundler/stack_trace_bin.js"
        );
        assertThat(
          outputCollection.error,
          eqArray([containStr("test_data/bundler/stack_trace.ts")]),
          "error output"
        );

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/stack_trace.js"),
          fs.promises.unlink("./test_data/bundler/stack_trace_bin.js"),
        ]);
      },
    },
    {
      name: "BundleAssetsWithRootDirInBrowser",
      execute: async () => {
        // Execute
        let assetFiles = await bundleForBrowserReturnAssetFiles(
          "./bundler/use_image.ts",
          "./bundler/use_image_bin.ts",
          "./test_data",
          {
            tsconfigFile: "./test_data/bundler/tsconfig.json",
            assetExts: ["jpg"],
          }
        );

        // Verify
        assertThat(
          assetFiles,
          eqArray([eq("bundler/inside/sample.jpg")]),
          "asset files"
        );
        await executeInPuppeteer("./bundler/use_image_bin.js", "./test_data");
        let [image1, image2] = await Promise.all([
          fs.promises.readFile("./test_data/bundler/rendered_image.png"),
          fs.promises.readFile("./test_data/bundler/golden_image.png"),
        ]);
        // If failed, compare the two iamges and either make rendered_image.png
        // the new golden_image.png, or delete rendered_image.png.
        assert(image1.equals(image2), "image1 to be the same as image2", "not");

        // Cleanup
        await Promise.all([
          fs.promises.unlink("./test_data/bundler/rendered_image.png"),
          fs.promises.unlink("./test_data/bundler/base.js"),
          fs.promises.unlink("./test_data/bundler/use_image.js"),
          fs.promises.unlink("./test_data/bundler/use_image_bin.js"),
        ]);
      },
    },
  ],
});
