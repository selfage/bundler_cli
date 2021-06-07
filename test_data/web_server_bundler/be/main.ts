import fs = require("fs");
import path = require("path");
import "../../../web_app_base_dir";

console.log(
  fs.existsSync(path.join(globalThis.WEB_APP_BASE_DIR, "index.html"))
);
