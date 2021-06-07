import { foo } from "./base";
import { StdError } from "@selfage/nested_error";

declare var extra: string;
let c = 20;
console.log(c + foo() + extra);
