import fs = require("fs");
import http = require("http");
import mime = require("mime-types");
import path = require("path");
import puppeteer = require("puppeteer");
import stream = require("stream");
import util = require("util");
import { stripFileExtension } from "@selfage/cli/io_helper";
import { DELETE, EXIT, SCREENSHOT } from "@selfage/puppeteer_executor_api/cmds";
let pipeline = util.promisify(stream.pipeline);

let HOST_NAME = "localhost";

export interface OutputCollection {
  log: Array<string>;
  warn: Array<string>;
  error: Array<string>;
  other: Array<string>;
}

export async function executeInPuppeteer(
  binFile: string,
  baseDir = ".",
  outputToConsole = true,
  port = 8000,
  args: Array<string> = []
): Promise<OutputCollection> {
  let binJsFile = path.relative(baseDir, stripFileExtension(binFile) + ".js");
  let tempBinFile = path.join(baseDir, "selfage_temp_bin.html");
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
      serveFile(baseDir, request, response)
  );
  let startServerPromise = new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: port }, () => resolve());
  });
  await Promise.all([writeFilePromise, startServerPromise]);

  let browser = await puppeteer.launch();
  let page = await browser.newPage();
  let outputCollection: OutputCollection = {
    log: [],
    warn: [],
    error: [],
    other: [],
  };
  let executePromise = new Promise<void>((resolve) => {
    page.on("console", async (msg) => {
      let output = await consoleMsgToString(msg);
      if (msg.type() === "log") {
        if (msg.text() === EXIT) {
          await shutDown(browser, server, tempBinFile);
          resolve();
        } else if (msg.text().startsWith(SCREENSHOT)) {
          let relativePath = msg.text().replace(SCREENSHOT, "");
          let file = path.join(baseDir, relativePath);
          await page.screenshot({ path: file, omitBackground: true });
        } else if (msg.text().startsWith(DELETE)) {
          let relativePath = msg.text().replace(DELETE, "");
          let file = path.join(baseDir, relativePath);
          await fs.promises.unlink(file);
        } else {
          if (outputToConsole) {
            console.log(output);
          }
          outputCollection.log.push(output);
        }
      } else if (msg.type() === "info") {
        if (outputToConsole) {
          console.info(output);
        }
        outputCollection.log.push(output);
      } else if (msg.type() === "warning") {
        if (outputToConsole) {
          console.warn(output);
        }
        outputCollection.warn.push(output);
      } else if (msg.type() === "error") {
        if (outputToConsole) {
          console.error(output);
        }
        outputCollection.error.push(output);
      } else {
        if (outputToConsole) {
          console.log(`${msg.type()}: ${output}`);
        }
        outputCollection.other.push(`${msg.type()}: ${output}`);
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
  await page.goto(`http://${HOST_NAME}:${port}/selfage_temp_bin.html`);
  await executePromise;
  return outputCollection;
}

async function consoleMsgToString(
  msg: puppeteer.ConsoleMessage
): Promise<string> {
  if (msg.args().length > 0) {
    let args = await Promise.all(
      msg.args().map((arg) => {
        return arg.executionContext().evaluate((arg: any) => {
          if (arg instanceof Error) {
            return arg.stack;
          }
          return `${arg}`;
        }, arg);
      })
    );
    return util.format(...args);
  } else {
    return msg.text();
  }
}

async function serveFile(
  baseDir: string,
  request: http.IncomingMessage,
  response: http.ServerResponse
): Promise<void> {
  let url = new URL(request.url, `http://${request.headers.host}`);
  let file = path.join(baseDir, url.pathname.substring(1));
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
