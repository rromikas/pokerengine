var cluster = require("cluster");
let thunderbase = require("./thunderbaseAPI");
launch();

async function launch() {
  if (cluster.isMaster) {
    console.log("master pid", process.pid);
    const express = require("express");
    const app = express();
    var bodyParser = require("body-parser");
    app.use(express.static("public"));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.get("/", function(req, res) {
      res.send("hello world");
    });
    const listener = app.listen(process.env.PORT, function() {
      console.log("Your app is listening on port " + listener.address().port);
    });
    let tablesObj = await thunderbase.getFromDatabase("tables");
    console.log("awaited tables", Object.keys(tablesObj));
    var numWorkers = require("os").cpus().length;

    console.log("Master cluster setting up " + numWorkers + " workers...");

    let bundles = createTablesBundles(tablesObj, numWorkers);

    for (var i = 0; i < numWorkers; i++) {
      cluster.fork().on("message", data => {
        console.log("message1", data);
      })
    }

    let associativeBundles ={};
    
    Object.keys(cluster.workers).forEach((x, i) => {
      cluster.workers[x].send({ type: "init", data: bundles[i] });
      associativeBundles[cluster.workers[x].process.pid] = bundles[i];
      
    });

    cluster.on("exit", function(worker, code, signal) {
      console.log(
        "Worker " +
          worker.process.pid +
          " died with code: " +
          code +
          ", and signal: " +
          signal
      );
      console.log("Starting a new worker");
      let newWorker = cluster.fork();
      newWorker.on("message", data => {
        console.log("message2", data);
        if(data === "restartGlitchProject")
          {
            let someError = 10;
            console.log(someError.map(x => x));
          }
      })
      console.log("bundles", Object.keys(associativeBundles));
      associativeBundles[newWorker.process.pid] = JSON.parse(JSON.stringify(associativeBundles[worker.process.pid]));
      delete associativeBundles[worker.process.pid];
      console.log("pid", worker.process.pid);
      newWorker.send({type: "init", data: associativeBundles[newWorker.process.pid]})
    });
  } else {
    console.log("worker pid", process.pid);
    let tables = [];
    const Table = require("./table");
    process.on("message", function(message) {
      if (message.type === "init") {
        message.data.forEach(x => {
          let table = new Table(x);
          tables.push(table);
        });
      }
    });
  }
}

function createTablesBundles(tablesObj, numWorkers) {
  let bundles = [];
  var counter = 0;
  while (Object.keys(tablesObj).length > 0) {
    if (!bundles[counter]) {
      bundles[counter] = [];
    }

    bundles[counter].push(
      JSON.parse(JSON.stringify(tablesObj[Object.keys(tablesObj)[0]]))
    );
    delete tablesObj[Object.keys(tablesObj)[0]];

    if ((counter + 1) % numWorkers === 0) {
      counter = 0;
    } else {
      counter++;
    }
  }
  return bundles;
}
