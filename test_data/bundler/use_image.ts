import imagePath = require("./inside/sample.jpg");
import { EXIT_CMD, SCREENSHOT_CMD } from "../../puppeteer_executor_commands";
import { foo } from "./base";
import { E } from "@selfage/element/factory";

async function main() {
  document.body.appendChild(
    E.div(
      'class="body"',
      E.image(`class="img" src="${imagePath}"`),
      E.div('class="other"', E.text(`${foo()}`))
    )
  );

  // Hack to wait for full image rendering.
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  let screenshotImage = __dirname + "/rendered_image.png";
  console.log(SCREENSHOT_CMD + screenshotImage);
  while (true) {
    let response = await fetch(screenshotImage);
    if (response.ok) {
      break;
    }
  }

  console.log(EXIT_CMD);
}

main();
