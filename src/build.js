const fs = require("fs");
const strip = f => fs.readFileSync(__dirname + "/" + f, "utf8").replace(/^if \(typeof module.*$/m, "").replace(/^[ \t]*\/\/.*$/gm, "");
const tpl = fs.readFileSync(__dirname + "/template.html", "utf8");
fs.writeFileSync(__dirname + "/upper-quadrant-map.html", tpl.replace("/*DATA*/", () => strip("data.js") + "\n" + strip("extras.js") + "\n" + strip("tx1.js") + "\n" + strip("tx2.js") + "\n" + strip("tx3.js") + "\n" + strip("evguide.js") + "\n" + strip("found.js") + "\n" + strip("tissue.js")));
console.log("ok", fs.statSync(__dirname + "/upper-quadrant-map.html").size);
