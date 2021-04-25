import './environment';

if (globalThis.ENVIRONMENT === "PROD") {
  console.log("Prod!!!");
} else {
  console.log("Something else");
}
