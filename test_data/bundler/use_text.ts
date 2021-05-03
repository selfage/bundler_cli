import textPath = require("./inside/some.txt");
import fs = require("fs");
import path = require("path");
import { foo } from "./base";

let text = fs.readFileSync(textPath);
let text2 = fs.readFileSync(path.join(__dirname, "inside", "some2.txt"));

console.log(text + ":" + text2 + ":" + foo());
