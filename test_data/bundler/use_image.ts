import imagePath = require("./inside/sample.jpg");
import { foo } from "./base";
import { E } from "@selfage/element/factory";
import { PUPPETEER_TEST_RUNNER } from "@selfage/test_runner";
import { screenshot } from "@selfage/test_runner/screenshot";

PUPPETEER_TEST_RUNNER.run({
  name: "UseImageTest",
  cases: [
    {
      name: "Screenshot",
      execute: async () => {
        document.body.appendChild(
          E.div(
            'class="body"',
            E.image(`class="img" src="${imagePath}"`),
            E.div('class="other"', E.text(`${foo()}`))
          )
        );

        let renderedImagePath =
          __dirname +
          (__dirname.endsWith("/") ? "" : "/") +
          "rendered_image.png";
        await screenshot(renderedImagePath, 500);
      },
    },
  ],
});
