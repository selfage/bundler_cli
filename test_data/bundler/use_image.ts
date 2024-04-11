import goldenImagePath = require("./golden_image.png");
import imagePath = require("./inside/sample.png");
import { foo } from "./base";
import { E } from "@selfage/element/factory";
import {
  deleteFile,
  readFile,
  screenshot,
} from "@selfage/puppeteer_test_executor_api";
import { TEST_RUNNER } from "@selfage/puppeteer_test_runner";
import { assertThat, eq } from "@selfage/test_matcher";

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
        await screenshot(renderedImagePath, {
          delay: 500,
        });
        let [rendered, golden] = await Promise.all([
          readFile(renderedImagePath, "utf8"),
          readFile(goldenImagePath, "utf8"),
        ]);
        assertThat(rendered, eq(golden), "screenshot");

        // Cleanup
        await deleteFile(renderedImagePath);
      },
    },
  ],
});
