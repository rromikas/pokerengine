const Thunderbase = require("./thunderbase");

let thunderbase = new Thunderbase();

thunderbase.initialize({
  databaseId: "root",
  email: "websocketserver@gmail.com"
});

module.exports = thunderbase;
