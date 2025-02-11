import fs = require("fs");
import { bundleWebServer } from "./web_server_bundler";
import { assertThat, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import { execSync } from "child_process";

async function unlink(...files: Array<string>) {
  return Promise.all(files.map((file) => fs.promises.unlink(file)));
}

TEST_RUNNER.run({
  name: "WebServerBundlerTest",
  cases: [
    {
      name: "BundleAndCopy",
      execute: async () => {
        // Execute
        await bundleWebServer(
          "./test_data/web_server_bundler/be/main",
          "./test_data/web_server_bundler/be/index",
          "./test_data/web_server_bundler/fe/entries.yaml",
          "./test_data/web_server_bundler",
          "./test_data/web_server_bundler/bin",
        );

        // Verify
        assertThat(
          execSync(
            "node ./test_data/web_server_bundler/be/index.js",
          ).toString(),
          containStr("true"),
          "log",
        );
        assertThat(
          execSync(
            "node ./test_data/web_server_bundler/bin/be/index.js",
          ).toString(),
          containStr("true"),
          "log",
        );

        // Verify & Cleanup
        await unlink(
          "./test_data/web_server_bundler/be/main.d.ts",
          "./test_data/web_server_bundler/be/main.js",
          "./test_data/web_server_bundler/be/main.tsbuildinfo",
          "./test_data/web_server_bundler/be/index.js",
          "./test_data/web_server_bundler/fe/main.d.ts",
          "./test_data/web_server_bundler/fe/main.js",
          "./test_data/web_server_bundler/fe/main.tsbuildinfo",
          "./test_data/web_server_bundler/fe/index.js",
          "./test_data/web_server_bundler/fe/index.js.gz",
          "./test_data/web_server_bundler/fe/index.html",
          "./test_data/web_server_bundler/fe/index.html.gz",
          "./test_data/web_server_bundler/bin/be/index.js",
          "./test_data/web_server_bundler/bin/fe/index.js",
          "./test_data/web_server_bundler/bin/fe/index.js.gz",
          "./test_data/web_server_bundler/bin/fe/index.html",
          "./test_data/web_server_bundler/bin/fe/index.html.gz",
          "./test_data/web_server_bundler/bin/fe/inside/p5s_logo.png",
        );
        await fs.promises.rmdir("./test_data/web_server_bundler/bin/be");
        await fs.promises.rmdir("./test_data/web_server_bundler/bin/fe/inside");
        await fs.promises.rmdir("./test_data/web_server_bundler/bin/fe");
        await fs.promises.rmdir("./test_data/web_server_bundler/bin");
      },
    },
  ],
});
