const Service = require("node-windows").Service;
const path = require("path");

const svc = new Service({
  name: "SCMP Node Media Service",
  script: path.join(__dirname, "service.js"),
});

svc.on("uninstall", () => {
  console.log("Service uninstalled");
});

svc.uninstall();
