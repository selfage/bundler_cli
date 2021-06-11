import express = require("express");
import expressStaticGzip = require("express-static-gzip");
import fs = require("fs");
import http = require("http");
import puppeteer = require("puppeteer");
import { bundleWebApps } from "./web_app_bundler";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

let HOST_NAME = "localhost";
let PORT = 8000;
let BASE_URL = `http://${HOST_NAME}:${PORT}`;

function getFirstLog(page: puppeteer.Page): Promise<string> {
  return new Promise<string>((resolve) => {
    page.once("console", (msg) => {
      resolve(msg.text());
    });
  });
}

async function verifyAllResourcesLoaded(
  dir: string,
  staticServeFn: Function,
  page: puppeteer.Page
): Promise<void> {
  let app = express();
  app.use("/", staticServeFn(dir, {}));
  let server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: PORT }, () => resolve());
  });

  let indexPageLogPromise = getFirstLog(page);
  await page.goto(`${BASE_URL}/index.html`);
  assertThat(
    await indexPageLogPromise,
    eq("/inside/test_image.png:ahha:foo"),
    "index.html log"
  );
  let notFoundPageLogPromise = getFirstLog(page);
  await page.goto(`${BASE_URL}/404.html`);
  assertThat(await notFoundPageLogPromise, eq("foo not found"), "404.html log");
  let someBinPageLogPromise = getFirstLog(page);
  await page.goto(`${BASE_URL}/inside/some_bin.html`);
  assertThat(await someBinPageLogPromise, eq("some:foo"), "some_bin.html log");

  await page.goto(`${BASE_URL}/inside/test_image.png`);
  await page.goto(`${BASE_URL}/inside/p5s_logo.png`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function unlink(...files: Array<string>) {
  await Promise.all(files.map((file) => fs.promises.unlink(file)));
}

TEST_RUNNER.run({
  name: "WebAppBundlerTest",
  cases: [
    {
      name: "BundleAndCopy",
      execute: async () => {
        // Execute
        await bundleWebApps(
          "./test_data/web_app_bundler/other/entries.json",
          "./test_data/web_app_bundler/other/bundled_resources.json",
          "./test_data/web_app_bundler",
          "./test_data/web_app_bundler/out_dir"
        );

        // Verify
        let browser = await puppeteer.launch();
        let page = await browser.newPage();
        await verifyAllResourcesLoaded(
          "./test_data/web_app_bundler/out_dir",
          express.static,
          page
        );
        await verifyAllResourcesLoaded(
          "./test_data/web_app_bundler/out_dir",
          expressStaticGzip,
          page
        );
        await verifyAllResourcesLoaded(
          "./test_data/web_app_bundler",
          express.static,
          page
        );
        await verifyAllResourcesLoaded(
          "./test_data/web_app_bundler",
          expressStaticGzip,
          page
        );

        // Verify & Cleanup
        await Promise.all([
          browser.close(),
          unlink(
            "./test_data/web_app_bundler/index.html",
            "./test_data/web_app_bundler/index.html.gz",
            "./test_data/web_app_bundler/index.js",
            "./test_data/web_app_bundler/index.js.gz",
            "./test_data/web_app_bundler/main.js",
            "./test_data/web_app_bundler/main.d.ts",
            "./test_data/web_app_bundler/main.tsbuildinfo",
            "./test_data/web_app_bundler/404.html",
            "./test_data/web_app_bundler/404.html.gz",
            "./test_data/web_app_bundler/404.js",
            "./test_data/web_app_bundler/404.js.gz",
            "./test_data/web_app_bundler/not_found.js",
            "./test_data/web_app_bundler/not_found.d.ts",
            "./test_data/web_app_bundler/not_found.tsbuildinfo",
            "./test_data/web_app_bundler/base.js",
            "./test_data/web_app_bundler/base.d.ts",
            "./test_data/web_app_bundler/inside/some_bin.html",
            "./test_data/web_app_bundler/inside/some_bin.html.gz",
            "./test_data/web_app_bundler/inside/some_bin.js",
            "./test_data/web_app_bundler/inside/some_bin.js.gz",
            "./test_data/web_app_bundler/inside/some.js",
            "./test_data/web_app_bundler/inside/some.d.ts",
            "./test_data/web_app_bundler/inside/some.tsbuildinfo",
            "./test_data/web_app_bundler/other/bundled_resources.json",
            "./test_data/web_app_bundler/out_dir/index.html",
            "./test_data/web_app_bundler/out_dir/index.html.gz",
            "./test_data/web_app_bundler/out_dir/index.js",
            "./test_data/web_app_bundler/out_dir/index.js.gz",
            "./test_data/web_app_bundler/out_dir/404.html",
            "./test_data/web_app_bundler/out_dir/404.html.gz",
            "./test_data/web_app_bundler/out_dir/404.js",
            "./test_data/web_app_bundler/out_dir/404.js.gz",
            "./test_data/web_app_bundler/out_dir/inside/some_bin.html",
            "./test_data/web_app_bundler/out_dir/inside/some_bin.html.gz",
            "./test_data/web_app_bundler/out_dir/inside/some_bin.js",
            "./test_data/web_app_bundler/out_dir/inside/some_bin.js.gz",
            "./test_data/web_app_bundler/out_dir/inside/p5s_logo.png",
            "./test_data/web_app_bundler/out_dir/inside/test_image.png"
          ),
        ]);
        await fs.promises.rmdir("./test_data/web_app_bundler/out_dir/inside");
        await fs.promises.rmdir("./test_data/web_app_bundler/out_dir");
      },
    },
  ],
});
