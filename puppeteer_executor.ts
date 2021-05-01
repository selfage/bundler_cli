import fs = require("fs");
import http = require("http");
import mime = require("mime-types");
import path = require("path");
import puppeteer = require("puppeteer");
import stream = require("stream");
import util = require("util");
import { EXIT_CMD, SCREENSHOT_CMD } from "./puppeteer_executor_commands";
import { stripFileExtension } from "@selfage/cli/io_helper";
let pipeline = util.promisify(stream.pipeline);

let HOST_NAME = "localhost";
let PATH_EXTRACTION_REGEX = /^\/(.*)$/;

export interface OutputCollection {
  log: Array<string>;
  warn: Array<string>;
  error: Array<string>;
}

export async function execute(
  binFile: string,
  rootDir = ".",
  port = 8000,
  outputToConsole = false,
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
        if (outputToConsole) {
          console.log(msg.text());
        }
        outputCollection.log.push(msg.text());

        if (msg.text() === EXIT_CMD) {
          await shutDown(server, browser, tempBinFile);
          resolve();
        } else {
          let matched = msg.text().match(SCREENSHOT_CMD);
          if (matched) {
            let file = msg.text().replace(SCREENSHOT_CMD, "");
            let pngFile = path.join(rootDir, stripFileExtension(file) + ".png");
            page.screenshot({ path: pngFile, omitBackground: true });
          }
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
      await shutDown(server, browser, tempBinFile);
      if (outputToConsole) {
        console.error(err.message);
      }
      outputCollection.error.push(err.message);
      resolve();
    });
  });
  page.goto(`http://${HOST_NAME}:${port}/selfage_temp_bin.html`);
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
  server: http.Server,
  browser: puppeteer.Browser,
  tempBinFile: string
): Promise<void> {
  await Promise.all([
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
    browser.close(),
    fs.promises.unlink(tempBinFile),
  ]);
}
