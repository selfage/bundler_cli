import imagePath from "./inside/sample.jpg";
import { foo } from "./base";
import { E } from "@selfage/element/factory";

document.body.appendChild(
  E.div(
    'class="body"',
    E.image(`class="img" src="${imagePath}"`),
    E.div('class="other"', E.text(`${foo()}`))
  )
);
