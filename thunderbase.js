const io = require("socket.io-client");
const uniqid = require("uniqid");
module.exports = class Thunderbase {
  constructor() {
    this.socket = null;
    this.database = null;
    this.credentials = {};
    this._generatedUIDs = {};
    this.socketId = null;
    this.waitingFunctions = [];
    this.latestValues = {};
    this.rooms = [];
    this.reconnectNumber = 0;
    this.sentUpdates = {};
    this.onConnectFunctions = [];
  }
  initialize(options){
    if (options.databaseId) {
      this.database = options.databaseId;
      this.socketId = options.email;
      options.rooms = this.rooms;
      this.socket = io("https://olive-pincushion.glitch.me", {
        query: options,
        secure: true
      });
    } else {
      throw new Error("databaseId undefined");
    }

    let that = this;
    
    this.socket.on("connect", function() {
      console.log("connected");
     
    });

    this.socket.on("connect_error", error => {
      console.log("coonect error");
    });

    this.socket.on("connect_timeout", timeout => {
      console.log("connect timeout");
    });

    this.socket.on("reconnect_error", error => {
      console.log("reconec eror");
      this.reconnectNumber++;
      if(this.reconnectNumber === 2)
      {
        process.exit(1);
      }
    });

    this.socket.on("error", error => {
      console.log("ERORAS", error);
    });

    this.socket.on("disconnect", () => {
      console.log("disconect");
      console.log("socket pid", process.pid);
       process.send("restartGlitchProject")
    });
  };

  close(){
    this.socket.disconnect(true);
  };
  

  async once(path, fn) {
    var getterId = this.generateUIDWithCollisionChecking();
    while (!this.socket.connected) {
      await this.sleep(100);
    }
    this.socket
      .emit("getDataOnce", `${this.database}/${path}`)
      .once(`dataReceived-${this.database}/${path}`, data => {
        fn(data);
      });
  };

  
  async on(path, fn) {
    var fireOnTheSameValue = path.charAt(0) === "*"; // jeigu pirmoje pozicijoje yra *, funkcinis argumentas bus vykdomas gavus kad ir tą pačią reikšmę šiuo adresu
    path = fireOnTheSameValue ? path.substring(1) : path;
    this.rooms.push(`${this.database}/${path}`);
    this.latestValues[path] = {};
    while (!this.socket.connected) {
      await this.sleep(100);
    }
    this.socket.emit("getDataOn", `${this.database}/${path}`);
    this.socket.on(`dataReceived-${this.database}/${path}`, (data, source) => {
      if (
        fireOnTheSameValue ||
        JSON.stringify(data) !== JSON.stringify(this.latestValues[path])
      ) {
        this.latestValues[path] = JSON.parse(JSON.stringify(data));
        fn({ value: data, source: source });
      }
    });
  };

  off(path) {
    this.socket.emit("getDataOff", `${this.database}/${path}`);
    this.socket.off(`dataReceived-${this.database}/${path}`);
  };

  erase(paths, source = "unknown") {
    return new Promise(async (resolve, reject) => {
      var obj = {};
      obj[this.database] = paths;
      var deleteId = this.generateUIDWithCollisionChecking();
      while (!this.socket.connected) {
        await this.sleep(100);
      }
      this.socket
        .emit("delete", obj, deleteId) // Reikia zinoti kad butent po sito atnaujinimo gautas callbackas
        .once(`deleteCallback-${deleteId}`, delId => {
          resolve(true);
        });
    });
  };

  update(updates, options = {}) {
    return new Promise(async (resolve, reject) => {
    var optionsToSend = { delay: 0, source: "unset" }; // galima nustatyt laiką, po kurio serveris padarys update.
    //delay in seconds format
    Object.assign(optionsToSend, options);
    var obj = {};
    obj[this.database] = updates;
    var updateId = uniqid("updateId");
    this.sentUpdates[updateId] = { updates, options };
      while (!this.socket.connected) {
        await this.sleep(100);
      }
    this.socket
      .emit("updateDatabase", obj, optionsToSend, updateId, options.source) // Reikia zinoti kad butent po sito atnaujinimo gautas callbackas
      .once(`updateCallback-${updateId}`, upId => {
        delete this.sentUpdates[updateId];
        resolve(true);
      });
  });
  };

  getFromDatabase(path) {
    return new Promise(async (resolve, reject) => {
      while (!this.socket.connected) {
        await this.sleep(100);
      }
      this.socket
        .emit("getDataOnce", `${this.database}/${path}`)
        .once(`dataReceived-${this.database}/${path}`, data => {
          resolve(data);
        });
    });
  };

  getMyListeners() {
    return new Promise((resolve, reject) => {
      var getterId = this.generateUIDWithCollisionChecking();
      this.socket.emit("getMyListeners").once(`sendListeners`, listeners => {
        resolve(listeners);
      });
    });
  };

  isConnected() {
    return this.socket.connected;
  };

  simulateError() {
    this.socket.emit("simulateError");
  };

  generateUIDWithCollisionChecking() {
    while (true) {
      var uid = (
        "0000" + ((Math.random() * Math.pow(36, 4)) | 0).toString(36)
      ).slice(-4);
      if (!this._generatedUIDs.hasOwnProperty(uid)) {
        this._generatedUIDs[uid] = true;
        if (Object.keys(this._generatedUIDs).length > 10) {
          this._generatedUIDs = {};
        }
        return uid;
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

}

