import fs = require("fs");
import { bundleNodeServer } from "./node_server_bundler";
import { assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { execSync } from "child_process";

async function unlink(...files: Array<string>) {
  return Promise.all(files.map((file) => fs.promises.unlink(file)));
}

TEST_RUNNER.run({
  name: "NodeServerBundlerTest",
  cases: [
    {
      name: "Bundle",
      execute: async () => {
        // Execute
        await bundleNodeServer(
          "./test_data/node_server_bundler/main",
          "./test_data/node_server_bundler/index",
          "./test_data/node_server_bundler",
        );

        // Verify
        assertThat(
          execSync("node ./test_data/node_server_bundler/index.js").toString(),
          containStr("true"),
          "log",
        );

        // Verify & Cleanup
        await unlink(
          "./test_data/node_server_bundler/main.d.ts",
          "./test_data/node_server_bundler/main.js",
          "./test_data/node_server_bundler/main.tsbuildinfo",
          "./test_data/node_server_bundler/index.js",
        );
      },
    },
    {
      name: "BundleToOutDir",
      execute: async () => {
        // Execute
        await bundleNodeServer(
          "./test_data/node_server_bundler/main",
          "./test_data/node_server_bundler/index",
          "./test_data/node_server_bundler",
          "./test_data/node_server_bundler/bin",
        );

        // Verify
        assertThat(
          execSync(
            "node ./test_data/node_server_bundler/bin/index.js",
          ).toString(),
          containStr("true"),
          "log",
        );

        // Verify & Cleanup
        await fs.promises.rmdir("./test_data/node_server_bundler/bin", {
          recursive: true,
        });
      },
    },
  ],
});
