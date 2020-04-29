var thunderbase = require("./thunderbaseAPI");

// D FOR DATABASE

module.exports.PutBetsToPotD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates["tables/" + table.tableId + "/called"] = 0;
    updates["tables/" + table.tableId + "/pot"] = table.pot;
    table.seats.forEach(x => {
      updates["tables/" + table.tableId + "/seats/" + x.seat + "/called"] = 0;

      updates["tables/" + table.tableId + "/seats/" + x.seat + "/potNr"] =
        x.potNr;
    });

    thunderbase.update(updates, "websocketServer putBetsToPot").then(ans => {
      resolve(ans);
    });
  });
};

module.exports.endRoundD = table => {
  var updates = {};
  table.seats.forEach(x => {
    updates["tables/" + table.tableId + "/seats/" + x.seat + "/needAction"] =
      x.needAction;
    updates["tables/" + table.tableId + "/seats/" + x.seat + "/action"] =
      x.action;
  });
  thunderbase.update(updates, { source: "EndRound" });
};

module.exports.JoinTableD = request => {
  var updates = {};
  updates["tables/" + request.tableId + "/allMigrationRequests/" + request.userId + "/satisfied"] = true;
    request.money;
  updates["publicUsers/" + request.userId + "/currentSeat"] = {
    tableId: request.tableId,
    seat: request.seat
  };
  updates["tables/" + request.tableId + "/seats/" + request.seat + "/money"] =
    request.money;
  updates[
    "tables/" + request.tableId + "/seats/" + request.seat + "/photoUrl"
  ] = request.photoUrl;
  updates["tables/" + request.tableId + "/seats/" + request.seat + "/userId"] =
    request.userId;
  updates[
    "tables/" + request.tableId + "/seats/" + request.seat + "/username"
  ] = request.username;
  updates["tables/" + request.tableId + "/seats/" + request.seat + "/trophy"] =
    request.trophy;
  thunderbase.update(updates, "pokerServer JoinTableD");
};

module.exports.RejectRequestD = request => {
  var updates = {};
  updates["publicUsers/" + request.userId + "/currentSeat/seat"] =
    Date.now() * -1;
  updates["tables/" + request.tableId + "/allMigrationRequests/" + request.userId + "/satisfied"] = true;
  thunderbase.update(updates);
};

module.exports.LeaveTableD = request => {
  if (request.userId !== "none") {
    var updates = {};
    updates["tables/" + request.tableId + "/allMigrationRequests/" + request.userId + "/satisfied"] = true;
    updates["publicUsers/" + request.userId + "/currentSeat"] = {
      tableId: "",
      seat: -555
    };
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/actionTime"
    ] = false; // botams reikalingas, kad galėtų atskirai funkcionuoti
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/cards"
    ] = [];
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/hand"
    ] = {
      name: "none",
      cards: ["empty"],
      rank: -1
    };
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/prize"
    ] = 0;
    updates["tables/" + request.tableId + "/seats/" + request.seat + "/emoji"] =
      "";
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/money"
    ] = 0;
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/username"
    ] = "Take a seat";
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/photoUrl"
    ] = "transparent";
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/userId"
    ] = "none";
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/playingNow"
    ] = false;

    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/needAction"
    ] = true;
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/action"
    ] = "none";
    updates["tables/" + request.tableId + "/seats/" + request.seat + "/seat"] =
      request.seat;
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/music"
    ] = false;
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/minBet"
    ] = 0;
    updates[
      "tables/" + request.tableId + "/seats/" + request.seat + "/maxBet"
    ] = 0;
    thunderbase.update(updates, "pokerServer LeaveTableD");
  }
};

module.exports.askForActionD = (tableId, action) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates["tables/" + tableId + "/currentAction"] = action;
    updates[
      "tables/" + tableId + "/seats/" + action.seat + "/actionTime"
    ] = true;
    thunderbase.update(updates).then(ans => {
      resolve(ans);
    });
  });
};

module.exports.foldD = (table, seat) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates[
      "tables/" + table.tableId + "/seats/" + seat + "/actionTime"
    ] = false; // botams reikalingas, kad galėtų atskirai funkcionuoti
    updates["tables/" + table.tableId + "/currentAction/status"] = "completed";

    updates["tables/" + table.tableId + "/seats/" + seat + "/playingNow"] =
      table.seats[seat].playingNow;
    updates["tables/" + table.tableId + "/seats/" + seat + "/action"] =
      table.seats[seat].action;
    updates["tables/" + table.tableId + "/seats/" + seat + "/emoji"] =
      table.seats[seat].emoji;
    updates[
      "tables/" + table.tableId + "/seats/" + seat + "/needAction"
    ] = false;
    updates["tables/" + table.tableId + "/actionForSound"] = {
      action: "fold",
      time: Date.now()
    };
    thunderbase.update(updates).then(() => resolve(true));
  });
};

module.exports.callD = (table, seat) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates[
      "tables/" + table.tableId + "/seats/" + seat + "/actionTime"
    ] = false; // botams reikalingas, kad galėtų atskirai funkcionuoti
    updates["tables/" + table.tableId + "/called"] = table.seats[seat].called;

    updates["tables/" + table.tableId + "/seats/" + seat + "/emoji"] =
      table.seats[seat].emoji;
    updates["tables/" + table.tableId + "/seats/" + seat + "/called"] =
      table.seats[seat].called;
    updates["tables/" + table.tableId + "/seats/" + seat + "/totallyBet"] =
      table.seats[seat].totallyBet;
    updates["tables/" + table.tableId + "/seats/" + seat + "/action"] =
      table.seats[seat].action;

    updates["tables/" + table.tableId + "/seats/" + seat + "/needAction"] =
      table.seats[seat].needAction;
    if (!table.seats[seat].needAction) {
      updates["tables/" + table.tableId + "/currentAction/status"] =
        "completed";
    }
    updates["tables/" + table.tableId + "/seats/" + seat + "/money"] =
      table.seats[seat].money;
    updates["tables/" + table.tableId + "/actionForSound"] = {
      action: "call",
      time: Date.now()
    };

    thunderbase.update(updates).then(() => {
      resolve(true);
    });
  });
};

module.exports.checkD = (table, seat) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates[
      "tables/" + table.tableId + "/seats/" + seat + "/actionTime"
    ] = false; // botams reikalingas, kad galėtų atskirai funkcionuoti
    updates["tables/" + table.tableId + "/seats/" + seat + "/emoji"] =
      table.seats[seat].emoji;
    updates["tables/" + table.tableId + "/currentAction/status"] = "completed";

    updates["tables/" + table.tableId + "/seats/" + seat + "/action"] =
      table.seats[seat].action;
    updates[
      "tables/" + table.tableId + "/seats/" + seat + "/needAction"
    ] = false;
    //sound efektui
    updates["tables/" + table.tableId + "/actionForSound"] = {
      action: "check",
      time: Date.now()
    };

    thunderbase.update(updates).then(() => resolve(true));
  });
};

module.exports.setMinBetD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    table.seats.forEach(x => {
      if (x.playingNow) {
        updates["tables/" + table.tableId + "/seats/" + x.seat + "/minBet"] =
          x.minBet;
        updates[
          "tables/" + table.tableId + "/seats/" + x.seat + "/needAction"
        ] = x.needAction;
      }
    });

    thunderbase.update(updates).then(() => resolve(true));
  });
};

module.exports.setMaxBetD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    table.seats.forEach(x => {
      if (x.playingNow) {
        updates["tables/" + table.tableId + "/seats/" + x.seat + "/maxBet"] =
          x.maxBet;
      }
    });

    thunderbase.update(updates).then(ans => {
      resolve(ans);
    });
  });
};

module.exports.cleanTheTableD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates["tables/" + table.tableId + "/dealCards"] = {
      date: 0,
      seats: "empty"
    };
    updates["secretPlayersCards/" + table.tableId] = [];
    updates["tables/" + table.tableId + "/flop"] = [];
    updates["tables/" + table.tableId + "/called"] = 0;
    updates["tables/" + table.tableId + "/pot"] = [0];
    updates["tables/" + table.tableId + "/gameStatus"] = "waiting";
    updates["tables/" + table.tableId + "/currentAction"] = {
      status: "bbzn",
      seat: -1
    };
    updates["tables/" + table.tableId + "/cards"] = table.cards;
    for (var i = 0; i < table.seats.length; i++) {
      updates[
        "tables/" + table.tableId + "/seats/" + i + "/playingNow"
      ] = false;

      updates["tables/" + table.tableId + "/seats/" + i + "/hand"] = {
        name: "none",
        cards: [],
        rank: -1
      };
      updates["tables/" + table.tableId + "/seats/" + i + "/totallyBet"] = 0;
      updates["tables/" + table.tableId + "/seats/" + i + "/cards"] = [];
      updates["tables/" + table.tableId + "/seats/" + i + "/prize"] = 0;
      updates["tables/" + table.tableId + "/seats/" + i + "/action"] = "none";
      updates[
        "tables/" + table.tableId + "/seats/" + i + "/actionTime"
      ] = false;
    }
    thunderbase.update(updates).then(() => {
      resolve(true);
    });
  });
};

module.exports.RestoreThePlayerD = (tableId, player) => {
  var updates = {};
  updates["tables/" + tableId + "/seats/" + player.seat] = player;
  thunderbase.update(updates);
};

module.exports.dealCardsD = (table, seats) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    table.seats.forEach(x => {
      updates["secretPlayersCards/" + table.tableId + "/" + x.seat] =
        table.seats[x.seat].cards;
    });

    updates["tables/" + table.tableId + "/dealCards"] = {
      date: Date.now(),
      seats: seats
    };

    updates["tables/" + table.tableId + "/cards"] = table.cards;
    thunderbase.update(updates).then(ans => {
      resolve(ans);
    });
  });
};

module.exports.OpenCardsD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    updates["tables/" + table.tableId + "/flop"] = table.flop;
    updates["tables/" + table.tableId + "/cards"] = table.cards;

    thunderbase.update(updates).then(ans => {
      resolve(ans);
    });
  });
};

module.exports.initiateGameD = table => {
  var updates = {};
  updates["tables/" + table.tableId + "/gameStatus"] = "playing";
  table.seats.forEach(seat => {
    if (seat.playingNow === true) {
      updates[
        "tables/" + table.tableId + "/seats/" + seat.seat + "/playingNow"
      ] = true;
    }
  });
  updates["tables/" + table.tableId + "/dealer"] = table.dealer;

  thunderbase.update(updates);
  this.dealCardsD(table);
  //betstartbids() made with synchronous function. It's okay I think.
  this.setMinBetD(table);
  this.setMaxBetD(table);
};

module.exports.deliverThePrizeD = (bestHand, table) => {
  return new Promise((resolve, reject) => {
    var updates = {};
    for (var i = 0; i < bestHand.length; i++) {
      updates[
        "tables/" + table.tableId + "/seats/" + bestHand[i].seat + "/prize"
      ] = table.seats[bestHand[i].seat].prize;
      updates[
        "tables/" + table.tableId + "/seats/" + bestHand[i].seat + "/money"
      ] = table.seats[bestHand[i].seat].money;
    }

    thunderbase.update(updates, "websoketServer delieverThePrize").then(ans => {
      resolve(ans);
    });
  });
};

module.exports.MakePlayerCardsPublicD = table => {
  return new Promise((resolve, reject) => {
    var updates = {};
    table.seats.forEach(x => {
      if (x.playingNow) {
        updates["tables/" + table.tableId + "/seats/" + x.seat + "/hand"] =
          x.hand;
        updates["tables/" + table.tableId + "/seats/" + x.seat + "/cards"] =
          x.cards;
      }
    });

    thunderbase.update(updates).then(() => resolve(true));
  });
};
