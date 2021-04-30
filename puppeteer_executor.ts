import fs = require("fs");
import http = require("http");
import mime = require("mime-types");
import path = require("path");
import puppeteer = require("puppeteer");
import { EXIT_CMD, SCREENSHOT_CMD } from "./puppeteer_executor_commands";

let HOST_NAME = "localhost";
let PATH_EXTRACTION_REGEX = /^\/(.*)$/;

export async function execute(
  binFile: string,
  rootDir?: string,
  port = 8000,
  args = new Array<string>()
): Promise<void> {
  rootDir = rootDir ?? path.dirname(binFile);
  let tempBinFile = path.join(rootDir, "selfage_temp_bin.html");
  let writeFilePromise = fs.promises.writeFile(
    tempBinFile,
    `<html>
  <body>
    <script type="text/javascript">var argv = [${args.join(",")}];</script>
    <script type="text/javascript" src="/${binFile}"></script>
  </body>
</html>`
  );

  let server = http.createServer();
  server.addListener(
    "request",
    (request: http.IncomingMessage, response: http.ServerResponse) =>
      serveFile(request, response)
  );
  let startServerPromise = new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: port }, () => resolve());
  });
  await Promise.all([writeFilePromise, startServerPromise]);

  let browser = await puppeteer.launch();
  let page = await browser.newPage();
  let executePromise = new Promise<void>((resolve, reject) => {
    page.on("console", async (msg) => {
      if (msg.type() === "log") {
        console.log(msg.text());
        if (msg.text() === EXIT_CMD) {
          await shutDown(server, browser, tempBinFile);
          resolve();
        } else {
          let matched = msg.text().match(SCREENSHOT_CMD);
          if (matched) {
            let file = msg.text().replace(SCREENSHOT_CMD, "");
            page.screenshot({ path: file, omitBackground: true });
          }
        }
      } else if (msg.type() === "info") {
        console.info(msg.text());
      } else if (msg.type() === "warning") {
        console.warn(msg.text());
      } else if (msg.type() === "error") {
        reject(msg.text());
      } else {
        console.log(`${msg.type()}: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      reject(err.stack);
    });
  });
  page.goto(`http://${HOST_NAME}:${port}/selfage_temp_bin.html`);
  return executePromise;
}

function serveFile(
  request: http.IncomingMessage,
  response: http.ServerResponse
): void {
  let url = new URL(request.url, `http://${request.headers.host}`);
  let matched = url.pathname.match(PATH_EXTRACTION_REGEX);
  let file = matched[1];
  let contentType = mime.lookup(path.extname(file));
  if (typeof contentType === "boolean") {
    throw new Error(`Unsupported file ext for ${file}.`);
  }

  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(file).pipe(response);
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
