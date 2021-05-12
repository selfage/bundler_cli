import fs = require("fs");
import http = require("http");
import mime = require("mime-types");
import path = require("path");
import puppeteer = require("puppeteer");
import stream = require("stream");
import util = require("util");
import { stripFileExtension } from "@selfage/cli/io_helper";
import { DELETE, EXIT, SCREENSHOT } from "@selfage/puppeteer_executor_api";
let pipeline = util.promisify(stream.pipeline);

let HOST_NAME = "localhost";
let PATH_EXTRACTION_REGEX = /^\/(.*)$/;

export interface OutputCollection {
  log: Array<string>;
  warn: Array<string>;
  error: Array<string>;
}

export async function executeInPuppeteer(
  binFile: string, // relative to `rootDir`
  rootDir = ".", // relative to '.'
  outputToConsole = true,
  port = 8000,
  args = new Array<string>()
): Promise<OutputCollection> {
  let binJsFile = stripFileExtension(binFile) + ".js";
  let tempBinFile = path.join(rootDir, "selfage_temp_bin.html");
  let writeFilePromise = fs.promises.writeFile(
    tempBinFile,
    `<html>
  <body>
    <script type="text/javascript">var argv = [${args.join(",")}];</script>
    <script type="text/javascript" src="/${binJsFile}"></script>
  </body>
</html>`
  );

  let server = http.createServer();
  server.addListener(
    "request",
    (request: http.IncomingMessage, response: http.ServerResponse) =>
      serveFile(rootDir, request, response)
  );
  let startServerPromise = new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: port }, () => resolve());
  });
  await Promise.all([writeFilePromise, startServerPromise]);

  let browser = await puppeteer.launch();
  let page = await browser.newPage();
  let outputCollection: OutputCollection = { log: [], warn: [], error: [] };
  let executePromise = new Promise<void>((resolve) => {
    page.on("console", async (msg) => {
      if (msg.type() === "log") {
        if (msg.text() === EXIT) {
          await shutDown(browser, server, tempBinFile);
          resolve();
        } else if (msg.text().startsWith(SCREENSHOT)) {
          let relativePath = msg.text().replace(SCREENSHOT, "");
          let file = path.join(rootDir, relativePath);
          await page.screenshot({ path: file, omitBackground: true });
        } else if (msg.text().startsWith(DELETE)) {
          let relativePath = msg.text().replace(DELETE, "");
          let file = path.join(rootDir, relativePath);
          try {
            await fs.promises.unlink(file);
          } catch (e) {
            // Failure is acceptable.
            console.log(e);
          }
        } else {
          if (outputToConsole) {
            console.log(msg.text());
          }
          outputCollection.log.push(msg.text());
        }
      } else if (msg.type() === "info") {
        if (outputToConsole) {
          console.info(msg.text());
        }
        outputCollection.log.push(msg.text());
      } else if (msg.type() === "warning") {
        if (outputToConsole) {
          console.warn(msg.text());
        }
        outputCollection.warn.push(msg.text());
      } else if (msg.type() === "error") {
        if (outputToConsole) {
          console.error(msg.text());
        }
        outputCollection.error.push(msg.text());
      } else {
        if (outputToConsole) {
          console.log(`${msg.type()}: ${msg.text()}`);
        }
        outputCollection.log.push(msg.text());
      }
    });
    page.on("pageerror", async (err) => {
      await shutDown(browser, server, tempBinFile);
      if (outputToConsole) {
        console.error(err.message);
      }
      outputCollection.error.push(err.message);
      resolve();
    });
  });
  try {
    await page.goto(`http://${HOST_NAME}:${port}/selfage_temp_bin.html`);
  } catch (e) {
    // Sometimes the connection is broken too soon.
    console.error(e.stack);
  }
  await executePromise;
  return outputCollection;
}

async function serveFile(
  rootDir: string,
  request: http.IncomingMessage,
  response: http.ServerResponse
): Promise<void> {
  let url = new URL(request.url, `http://${request.headers.host}`);
  let matched = url.pathname.match(PATH_EXTRACTION_REGEX);
  let file = path.join(rootDir, matched[1]);
  let contentType = mime.lookup(path.extname(file));
  if (typeof contentType === "boolean") {
    throw new Error(`Unsupported file ext for ${file}.`);
  }

  try {
    await fs.promises.stat(file);
  } catch (e) {
    response.writeHead(404, { "Content-Type": contentType });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": contentType });
  return pipeline(fs.createReadStream(file), response);
}

async function shutDown(
  browser: puppeteer.Browser,
  server: http.Server,
  tempBinFile: string
): Promise<void> {
  await Promise.all([
    browser.close(),
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
    fs.promises.unlink(tempBinFile),
  ]);
}
