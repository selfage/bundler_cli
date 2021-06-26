import goldenImagePath = require("./golden_image.png");
import imagePath = require("./inside/sample.jpg");
import { foo } from "./base";
import { E } from "@selfage/element/factory";
import { assertThat, eq } from "@selfage/test_matcher";
import { PUPPETEER_TEST_RUNNER } from "@selfage/test_runner";
import "@selfage/puppeteer_executor_api";

PUPPETEER_TEST_RUNNER.run({
  name: "UseImageTest",
  cases: [
    {
      name: "Screenshot",
      execute: async () => {
        // Execute
        document.body.appendChild(
          E.div(
            'class="body"',
            E.image(`class="img" src="${imagePath}"`),
            E.div('class="other"', E.text(`${foo()}`))
          )
        );

        // Verify
        let [rendered, golden] = await Promise.all([
          globalThis.screenshot(__dirname + "/rendered_image.png", {
            delay: 500,
          }),
          globalThis.readFile(goldenImagePath),
        ]);
        assertThat(rendered, eq(golden), "screenshot");

        // Cleanup
        await globalThis.deleteFile(__dirname + "/rendered_image.png");
      },
    },
  ],
});
