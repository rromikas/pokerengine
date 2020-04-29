var thunderbase = require("./thunderbaseAPI");
var forEach = require("async-foreach").forEach;
const fetch = require("node-fetch");
var cardsProvider = require("./cards");
var { FindBestHand, CalculatePlayerHand } = require("./hand-calculation");
const {
  askForActionD,
  OpenCardsD,
  callD,
  checkD,
  foldD,
  dealCardsD,
  PutBetsToPotD,
  setMaxBetD,
  setMinBetD,
  cleanTheTableD,
  initiateGameD,
  deliverThePrizeD,
  MakePlayerCardsPublicD,
  LeaveTableD,
  JoinTableD,
  endRoundD,
  RejectRequestD
} = require("./table-database-functions");
module.exports = class Table {
  constructor(table) {
    this.table = table;
    this.playersCards = {}; // for faster cards retrieving when caluclating hand.
    this.cardsKeys = cardsProvider.cardsKeys;
    this.cardsInNumbers = cardsProvider.cardsInNumbers;
    this.cardsInMarks = cardsProvider.cardsInMarks;
    this.unsatisfiedRequestsChecked = false;
    this.GetCards(); // atgaminti kokios buvo kortos pries issijungiant.
    this.ListenForMigration();
    this.ListenForAction();
    this.actionTimeout = null;
  }

  GetCards() {
    thunderbase
      .getFromDatabase("secretPlayersCards/" + this.table.tableId)
      .then(cards => {
        if (cards) {
          Object.keys(cards).forEach((x, i) => {
            this.table.seats[x].cards = cards[x];
          });
        }
      });
  }

  UnlistenForMigration() {
    thunderbase.off("tables/" + this.table.tableId + "/migrationRequest");
  }

  ExecuteMigration(request) {
    if (request.purpose === "join") {
      if (this.table.seats[request.seat].userId === "none") {
        this.JoinTable(request);
      } else {
        if (this.table.seats[request.seat].userId !== request.userId) {
          RejectRequestD(request);
        }
      }
    } else if (request.purpose === "leave") {
      if (request.userId === this.table.seats[request.seat].userId) {
        this.LeaveTable(request);
      }
    }
  }

  async CheckUnsatisfiedRequests(){
    let requests = await thunderbase.getFromDatabase("tables/" + this.table.tableId + "/allMigrationRequests");
    if(requests)
      {
      Object.values(requests).forEach(x => {
        if(!x.satisfied)
        {
            this.ExecuteMigration(x);
        }
      })
      }
    
  }
  
  ListenForMigration() {
    thunderbase.on(
      "*tables/" + this.table.tableId + "/migrationRequest",
      async snapshot => {
        if (snapshot.value) {
          
          if(!this.unsatisfiedRequestsChecked) 
          {
            this.unsatisfiedRequestsChecked = true;
            this.CheckUnsatisfiedRequests();
          }
          
          else
          {
            let request = snapshot.value;

            this.ExecuteMigration(request);
            let sittingPlayers = this.getSittingPlayers();
            let playingPlayers = this.getPlayingPlayers();
            let actionerLeaved =
              request.purpose === "leave" &&
              request.seat === this.table.currentAction.seat
                ? request.seat
                : -200;
            // console.log(
            //   "Playingplayers SittingPlayers gameStatus",
            //   playingPlayers.length,
            //   sittingPlayers.length,
            //   this.table.gameStatus
            // );

            if (actionerLeaved >= 0 && playingPlayers.length > 1) {
              this.dispetcher(actionerLeaved);
            }

            if (
              this.table.gameStatus === "playing" &&
              playingPlayers.length === 1
            ) {
              this.endGameFast(playingPlayers);
            }
            if (
              this.table.gameStatus === "waiting" &&
              sittingPlayers.length > 1
            ) {
              this.initiateGame(sittingPlayers, "ListenForMigration");
            }
          }
          
        }
      }
    );
  }

  UnlistenForAction() {
    thunderbase.off("tables/" + this.table.tableId + "/currentAction");
  }

  ListenForAction() {
    thunderbase.on(
      "*tables/" + this.table.tableId + "/currentAction",
      snapshot => {
        if (
          snapshot.value !== null &&
          snapshot.value.status !== null &&
          snapshot.value.seat !== null
        ) {
          var action = snapshot.value; // taip trumpiau

          this.table.currentAction = snapshot.value;
          if (action.status === "asked") {
            this.table.currentAction.status = "asked";
          }
          if (this.table.gameStatus === "playing") {
            if (action.status === "answered") {
             clearTimeout(this.actionTimeout);
              this.actionTimeout = null;
              //NESIDUBLIUOJA SU CONTNIUEWHEREFINISHED TODEL DEL SITO IF.
              if (action.decision === "fold") {
                this.fold(action.seat, action.emoji);
              } else if (action.decision === "call") {
                this.call(action.seat, action.amount, action.emoji);
              } else if (action.decision === "check") {
                this.check(action.seat, action.emoji);
              }
            } else if (
              action.status === "completed" &&
              this.table.gameStatus === "playing"
            ) {
              var leftInGame = this.getPlayingPlayers();
              if (leftInGame.length > 1) {
                this.dispetcher(action.seat);
              } else {
                this.endGameFast(leftInGame);
              }
            }
          }
        }
      }
    );
  }

  cleanTheTable() {
    this.table.currentAction = { status: "bbzn", seat: -1 };
    this.table.gameStatus = "waiting";
    this.table.flop = [];
    this.table.called = 0;
    this.table.pot = [0];
    this.table.cards = JSON.parse(JSON.stringify(this.cardsKeys));
    for (let i = 0; i < this.table.seats.length; i++) {
      if (
        this.table.seats[i].money === 0 &&
        this.table.seats[i].userId !== "none"
      ) {
        let request = JSON.parse(JSON.stringify(this.table.seats[i]));
        this.LeaveTable(request);
      }
      this.table.seats[i].hand = {
        name: "none",
        cards: [],
        rank: -1
      };
      this.table.seats[i].cards = [];
      this.table.seats[i].prize = 0;
      this.table.seats[i].action = "none";
      this.table.seats[i].playingNow = false;
      this.table.seats[i].needAction = true;
      this.table.seats[i].totallyBet = 0;
    }
    cleanTheTableD(this.table);
  }

  initiateGame(players, source) {
    // console.log("Initiate game source: ", source);
    this.table.gameStatus = "playing";
    players.forEach(x => {
      this.table.seats[x.seat].playingNow = true;
    });
    this.table.dealer = this.next(this.table.dealer);

    this.dealCards();
    var bigBlindSeat = this.betStartBids();
    initiateGameD(this.table);

    this.dispetcher(bigBlindSeat);
  }

  betStartBids() {
    var smallBlindSeat = this.next(this.table.dealer);
    var bigBlindSeat = this.next(smallBlindSeat);
    this.call(smallBlindSeat, this.table.smallBlind);
    this.call(bigBlindSeat, this.table.bigBlind);
    return bigBlindSeat;
  }

  async PutBetsToPot() {
    var potNr = this.table.pot.length - 1;
    this.table.called = 0;

    var players = this.table.seats.filter(x => x.called > 0); // skaiciuosim tik tuos kurie yra dabar pastate
    //, bet gali buti pastates ir palikes stala
    
    players.forEach((x, i, arr) => {
      var nonZeroCalled = arr.filter(x => x.called > 0);
      if (nonZeroCalled.length > 0) {
        var min = Math.min.apply(
          //suranda maziausia statyma tarp zaideju, kuriu statymai dar didesni uz 0;
          Math,
          nonZeroCalled.map(o => {
            return o.called;
          })
        );
        var dedicatePot = false; // ar dedikuoti potą, priklausys nuo to ar jo statymas daabar maziausias.
        var isLeft = false; //  ar yra likusiu kurie po maziausio statymo dar turi pastate
        arr.forEach(a => {
          if (a.called > 0) {
            //jei zaidejo statymas dar nesumazintas iki 0
            a.called -= min; // is žaideju statymu atima maziausia statyma
            if (a.playingNow) {
              if (a.called === 0) {
                // jei true, kadangi pries tai buvo called daugiau uz 0(if preis tai), tai jo potNr bus einamas
                a.potNr = potNr;
                if (a.money === 0 && !dedicatePot) {
                  // jeigu potas buvo nededikuotas ir ji dedikuoja. Jei jau dedikuotas, jo nenustato i false. Taip pat zaidejas gali buti pastates bet nusifoldines todel reikia patikrinti ar dar zaidzia
                  dedicatePot = true;
                }
              } else {
                isLeft = true;
              }
            }

            this.table.pot[potNr] += min; // prideda maziausia statyma nuo kiekvieno zaidejo i pota.
          }
        });
        if (dedicatePot && isLeft) {
          // jeigu einama pota reikia dedikuoti teise i ji turinciam zaidejui ir yra likusiu nepastaciusiu IR zaidzianciu
          // , reikia sukurti nauja pota daugiau pinigu pastaciusiems zaidejams
          // jei yra dar pastaciusiu bet isejusiu, ju potus pliusuosime i paskutinį potą.
          potNr++;
          this.table.pot[potNr] = 0;
        }
      }
    });

    //kadangi dirbo su atskiro masyvu, reikia jo rezultatus priskirti table.seats objektams

    players.forEach(x => {
      this.table.seats[x.seat].potNr = x.potNr;
      this.table.seats[x.seat].called = 0;
    });

   await PutBetsToPotD(this.table);
  }
  next(seat) {
    var next = -1;
    if (seat >= 0) {
      var found = false,
        counter = seat + 1;
      while (counter <= seat + 10 && !found) {
        var current = counter % 10;
        if (
          this.table.seats[current].playingNow &&
          this.table.seats[current].needAction &&
          this.table.seats[current].money > 0
        ) {
          next = current;
          found = true;
        }

        counter++;
      }
    }
    return next;
  }
  async dispetcher(previousActionSeat) {
    var nextActioner = this.next(previousActionSeat);
    if (nextActioner >= 0 && this.table.seats[nextActioner].money > 0) {
      this.askForAction(nextActioner);
    } else {
      await this.endRound(); // bus uždelsimas, jei niekam nereikia atlikti veiksmo.
      if (this.table.flop.length === 5) {
        this.endGame();
      } else {
        if (this.table.flop.length === 0) {
          this.OpenCards(3);
          await this.sleep(1000);
        } else {
          this.OpenCards(1);
          await this.sleep(1000);
        }
        this.dispetcher(this.table.dealer);
      }
    }
  }

  endRound() {
    return new Promise(async (resolve, reject) => {
      await this.sleep(500);
      this.PutBetsToPot();
      await this.sleep(500);
      var players = this.getPlayingPlayers();
      var haveMoney = players.filter(x => x.money > 0); // jeigu po raundo tik vienas zaidejas turi pinigu, nereikia niekam veiksmo daryti
      if (haveMoney.length >= 2) {
        this.table.seats.forEach(x => {
          if (x.playingNow) {
            x.needAction = true;
            x.action = "none";
          }
        });
        endRoundD(this.table);
        resolve(true);
      } else {
        setTimeout(() => {
          resolve(true);
        }, 1500);
      }
    });
  }

  sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  askForAction(seat) {
    this.table.currentAction = {
      seat: seat,
      bot: !this.table.seats[seat].person,
      status: "asked"
    };
    askForActionD(this.table.tableId, this.table.currentAction).then(() => {
      this.actionTimeout = setTimeout(() => {
        this.fold(this.table.currentAction.seat);
      }, (this.table.timeForDecision + 5) * 1000)
    })
  }

  fold(seat, emoji = "") {
    this.table.seats[seat].playingNow = false;
    this.table.seats[seat].action = "fold";
    this.table.seats[seat].emoji = emoji;
    this.table.seats[seat].needAction = false;
  }

  call(seat, amount, emoji = "") {
    this.table.seats[seat].called =
      parseInt(this.table.seats[seat].called) + parseInt(amount);
    this.table.seats[seat].action = "call";
    this.table.seats[seat].emoji = emoji;
    this.table.seats[seat].money =
      parseInt(this.table.seats[seat].money) - parseInt(amount);
    this.table.seats[seat].totallyBet += amount;
    if (this.table.called < this.table.seats[seat].called) {
      this.table.called = JSON.parse(
        JSON.stringify(this.table.seats[seat].called)
      );
    }

    if (
      this.table.flop.length > 0 ||
      this.table.currentAction.status === "answered"
    ) {
      this.table.currentAction.status = "completed";
      this.table.seats[seat].needAction = false;
    }
    this.setMinBet();
    this.setMaxBet();
    callD(this.table, seat);
  }

  check(seat, emoji = "") {
    this.table.seats[seat].action = "check";
    this.table.seats[seat].emoji = emoji;
    this.table.seats[seat].needAction = false;
    checkD(this.table, seat);
  }
  setMaxBet() {
    // console.log("ACTION TIME TO", linkedLists[tableId].actionTimeTo, tableId);
    //SITAS metodas is esmes zaidejui kuris dabar atlikea veiksma parenka maksimalu statymo dydi. Jis bus arba jo pacio pinigu riba arba jeigu jis daugiausia ituri pinigu - antro zaidejo pinigu riba
    var overals = [];
    this.table.seats.forEach(x => {
      if (x.playingNow) {
        overals.push(x.called + x.money);
      }
    });

    overals.sort((a, b) => a < b);

    this.table.seats.forEach(x => {
      if (x.playingNow) {
        if (x.called + x.money === overals[0]) {
          x.maxBet = overals[1] - x.called > 0 ? overals[1] - x.called : 0;
        } else {
          x.maxBet =
            x.money + x.called < overals[0] ? x.money : overals[0] - x.called;
        }
      }
    });
    setMaxBetD(this.table);
  }

  setMinBet() {
    this.table.seats.forEach(x => {
      if (x.playingNow) {
        x.minBet =
          x.called + x.money < this.table.called
            ? x.money
            : this.table.called - x.called;
        if (x.minBet > 0) {
          x.needAction = true;
        }
      }
    });
    setMinBetD(this.table);
  }

  dealCards() {
    var seats = [];
    var counter = this.table.dealer + 1;
    while (counter <= this.table.dealer + 10) {
      var current = counter % 10;
      if (this.table.seats[current].playingNow) {
        this.table.seats[current].cards = [];

        seats.push(current);
        var random = Math.floor(
          Math.random() * Math.floor(this.table.cards.length)
        );
        var card = this.table.cards[random];
        this.table.seats[current].cards.push(card);
        this.table.cards.splice(random, 1);

        random = Math.floor(
          Math.random() * Math.floor(this.table.cards.length)
        );

        card = this.table.cards[random];
        this.table.seats[current].cards.push(card);
        this.table.cards.splice(random, 1);
      }
      counter++;
    }
    dealCardsD(this.table, seats);
  }

  burnCard() {
    var random = Math.floor(
      Math.random() * Math.floor(this.table.cards.length)
    );
    this.table.cards.splice(random, 1);
  }

  OpenCards(amount) {
    this.burnCard();
    for (var i = 0; i < amount; i++) {
      var random = Math.floor(
        Math.random() * Math.floor(this.table.cards.length)
      );
      var card = this.table.cards[random];
      this.table.cards.splice(random, 1);

      this.table.flop.push(card);
    }
    OpenCardsD(this.table);
  }

  JoinTable(request) {
    Object.assign(this.table.seats[request.seat], request);
    JoinTableD(request);
  }

  LeaveTable(request) {
    let leaveRequest = JSON.parse(JSON.stringify(request))
    let empty = {
      email: "",
      userId: "none",
      username: "Take a seat",
      playingNow: false,
      actionTime: false,
      money: 0,
      needAction: true
    };
    Object.assign(this.table.seats[request.seat], empty);
    LeaveTableD(leaveRequest);
  }

  formatFlopRecord() {
    var formatedFlop = [];
    for (var i = 0; i < this.table.flop.length; i++) {
      //PRAKTIŠKAI NEREIKALINGA ČIA ISTORIJAI PAVAIDUOTI
      var value = this.table.flop[i].substring(
        0,
        this.table.flop[i].length - 1
      );
      var mark = this.table.flop[i].split(value)[1];
      if (
        value !== "T" &&
        value !== "J" &&
        value !== "Q" &&
        value !== "K" &&
        value !== "A"
      ) {
        value = this.cardsInNumbers[value];
      }
      var formatedCard = { mark: this.cardsInMarks[mark], number: value };
      formatedFlop.push(formatedCard); // JIS REIKALINGAS VAIZDUOTI ŽAIDIMO ISTORIJA SIMBOLIU PAVEIKSLIUKAIS
    }
  }

  getSittingPlayers() {
    return this.table.seats.filter(x => x.userId !== "none");
  }
  getPlayingPlayers() {
    return this.table.seats.filter(x => x.playingNow);
  }

  deliverThePrize(bestHand, potNr) {
    var prize = parseInt(this.table.pot[potNr]) / parseInt(bestHand.length);
    for (var i = 0; i < bestHand.length; i++) {
      this.table.seats[bestHand[i].seat].money += parseInt(prize);
      this.table.seats[bestHand[i].seat].prize = parseInt(prize);
    }
    deliverThePrizeD(bestHand, this.table);
  }

  afterPrizeIsDelivered() {
    this.table.gameStatus = "waiting";
    this.cleanTheTable();
    var sittingPlayers = this.getSittingPlayers();
    if (sittingPlayers.length > 1 && this.table.gameStatus === "waiting") {
      this.initiateGame(sittingPlayers, "AfterPrizeIsDelivered");
    }
  }

  deliverPrizeSync(callback) {
    var prizeDelivering = this.deliverThePrize.bind(this);
    var table = this.table;
    forEach(
      this.table.pot,
      function(x, i) {
        var done = this.async();
        var bestHand = FindBestHand(table, i);
        
        prizeDelivering(bestHand, i);
        setTimeout(done, 4000);
      },
      callback
    );
  }

  endGameFast(playersPresent) {
    this.endRound();
    if (playersPresent.length === 1) {
      this.table.gameStatus = "awarding";
      this.deliverPrizeSync(this.afterPrizeIsDelivered.bind(this));
    } else {
      this.table.gameStatus = "waiting";
    }
  }

  endGame() {
    this.table.seats.forEach(x => {
      if (x.playingNow) {
        x.hand = CalculatePlayerHand(
          this.table.flop,
          this.table.seats[x.seat].cards
        );
      }
    });

    MakePlayerCardsPublicD(this.table);

    this.deliverPrizeSync(this.afterPrizeIsDelivered.bind(this));
  }
};
