import textPath = require("./inside/some.txt");
import fs = require("fs");
import { foo } from "./base";

let text = fs.readFileSync(textPath);
console.log(text + ":" + foo());
