import fs = require("fs");
import http = require("http");
import mime = require("mime-types");
import path = require("path");
import puppeteer = require("puppeteer");
import stream = require("stream");
import util = require("util");
import { stripFileExtension } from "@selfage/cli/io_helper";
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
  let argsStr = args.length === 0 ? `` : `"${args.join(`","`)}"`;
  let writeFilePromise = fs.promises.writeFile(
    tempBinFile,
    `<html>
  <body>
    <script type="text/javascript">var argv = [${argsStr}];</script>
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
  page.exposeFunction(
    "screenshot",
    async (
      relativePath: string,
      options: {
        delay?: number; // ms
        fullPage?: boolean;
        quality?: number;
      }
    ): Promise<string> => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, options.delay ?? 0);
      });
      let file = path.join(baseDir, relativePath);
      let fileType: "png" | "jpeg";
      if (path.extname(relativePath) === ".png") {
        fileType = "png";
      } else {
        fileType = "jpeg";
      }
      return ((await page.screenshot({
        path: file,
        type: fileType,
        quality: options.quality,
        fullPage: options.fullPage,
        omitBackground: true,
      })) as Buffer).toString("base64");
    }
  );
  page.exposeFunction(
    "fileExists",
    async (relativePath: string): Promise<boolean> => {
      let file = path.join(baseDir, relativePath);
      try {
        await fs.promises.stat(file);
        return true;
      } catch (e) {
        return false;
      }
    }
  );
  page.exposeFunction(
    "readFile",
    async (relativePath: string): Promise<string> => {
      let file = path.join(baseDir, relativePath);
      return await fs.promises.readFile(file, "base64");
    }
  );
  page.exposeFunction(
    "deleteFile",
    async (relativePath: string): Promise<void> => {
      let file = path.join(baseDir, relativePath);
      await fs.promises.unlink(file);
    }
  );
  page.exposeFunction(
    "setViewport",
    async (width: number, height: number): Promise<void> => {
      await page.setViewport({ width: width, height: height });
    }
  );

  let outputCollection: OutputCollection = {
    log: [],
    warn: [],
    error: [],
    other: [],
  };
  let exited = false;
  let exitCodePromise = new Promise<number>((resolve) => {
    page.exposeFunction("exit", (): void => {
      exited = true;
      resolve(0);
    });
    page.on("pageerror", async (err) => {
      if (outputToConsole) {
        console.error(err.message);
      }
      outputCollection.error.push(err.message);
      exited = true;
      resolve(2);
    });
  });
  let lastConsoleMsgPromise = Promise.resolve();
  page.on("console", async (msg) => {
    if (exited) {
      return;
    }
    await lastConsoleMsgPromise;
    lastConsoleMsgPromise = collectConsoleMsg(
      msg,
      outputToConsole,
      outputCollection
    );
  });
  await page.goto(`http://${HOST_NAME}:${port}/selfage_temp_bin.html`);

  process.exitCode = await exitCodePromise;
  await lastConsoleMsgPromise;
  await Promise.all([
    browser.close(),
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
    fs.promises.unlink(tempBinFile),
  ]);
  return outputCollection;
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

async function collectConsoleMsg(
  msg: puppeteer.ConsoleMessage,
  outputToConsole: boolean,
  outputCollection: OutputCollection
): Promise<void> {
  let text = await interpretMsg(msg);
  if (msg.type() === "log" || msg.type() === "info") {
    if (outputToConsole) {
      console.log(text);
    }
    outputCollection.log.push(text);
  } else if (msg.type() === "warning") {
    if (outputToConsole) {
      console.warn(text);
    }
    outputCollection.warn.push(text);
  } else if (msg.type() === "error") {
    if (outputToConsole) {
      console.error(text);
    }
    outputCollection.error.push(text);
  } else {
    if (outputToConsole) {
      console.log(`${msg.type()}: ${text}`);
    }
    outputCollection.other.push(`${msg.type()}: ${text}`);
  }
}

async function interpretMsg(msg: puppeteer.ConsoleMessage): Promise<string> {
  if (msg.args().length > 0) {
    let args = (await Promise.all(
      msg.args().map((arg) => {
        return arg.executionContext().evaluate((arg: any) => {
          if (arg instanceof Error) {
            return arg.stack;
          }
          return `${arg}`;
        }, arg);
      })
    )) as Array<string>;
    return util.format(...args);
  } else {
    return msg.text();
  }
}
