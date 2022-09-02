import goldenImagePath = require("./golden_image.png");
import imagePath = require("./inside/sample.jpg");
import { foo } from "./base";
import { E } from "@selfage/element/factory";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";
import "@selfage/puppeteer_test_executor_api";

TEST_RUNNER.run({
  name: "UseImageTest",
  cases: [
    {
      name: "Screenshot",
      execute: async () => {
        // Execute
        document.body.appendChild(
          E.div(
            { class: "body" },
            E.image({ class: "img", src: imagePath }),
            E.div({ class: "other" }, E.text(`${foo()}`))
          )
        );

        // Verify
        let renderedImagePath = __dirname + "/rendered_image.png";
        await puppeteerScreenshot(renderedImagePath, {
          delay: 500,
        });
        let [rendered, golden] = await Promise.all([
          puppeteerReadFile(renderedImagePath, "utf8"),
          puppeteerReadFile(goldenImagePath, "utf8"),
        ]);
        assertThat(rendered, eq(golden), "screenshot");

        // Cleanup
        await globalThis.puppeteerDeleteFile(renderedImagePath);
      },
    },
  ],
});
