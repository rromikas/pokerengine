var cardsProvider = require("./cards");
var cardsInNumbers = cardsProvider.cardsInNumbers;

module.exports.FindBestHand = (table, potNr) => {
  var bestHand = [{ hand: { rank: 0 } }];
  var playingPlayers = table.seats.filter(x => x.playingNow);
  if (playingPlayers.length === 1) {
    bestHand[0] = playingPlayers[0];
  } else {
    for (var i = 0; i < table.seats.length; i++) {
      if (table.seats[i].playingNow && table.seats[i].potNr >= potNr) {
        if (table.seats[i].hand.rank > bestHand[0].hand.rank) {
          bestHand = [table.seats[i]];
        } else if (table.seats[i].hand.rank === bestHand[0].hand.rank) {
          if (bestHand[0].hand.name === "Royal Flush") {
            bestHand.push(table.seats[i]);
          } else if (bestHand[0].hand.name === "Straight Flush") {
            if (
              bestHand[0].hand.cards[0].number <
              table.seats[i].hand.cards[0].number
            ) {
              bestHand = [table.seats[i]];
            } else if (
              bestHand[0].hand.cards[0].number ===
              table.seats[i].hand.cards[0].number
            ) {
              bestHand.push(table.seats[i]);
            }
          } else if (bestHand[0].hand.name === "Four of a kind") {
            // console.log(bestHand[0]);
            if (
              bestHand[0].hand.cards[0].number <
              table.seats[i].hand.cards[0].number
            ) {
              bestHand = [table.seats[i]];
            } else if (
              bestHand[0].hand.cards[0].number ===
              table.seats[i].hand.cards[0].number
            ) {
              if (
                bestHand[0].hand.cards[1].number <
                table.seats[i].hand.cards[1].number
              ) {
                bestHand = [table.seats[i]];
              } else if (
                bestHand[0].hand.cards[1].number ===
                table.seats[i].hand.cards[1].number
              ) {
                bestHand.push(table.seats[i]);
              }
            }
          } else if (bestHand[0].hand.name === "Flush") {
            var state = "same";
            for (var j = 0; j < 5; j++) {
              if (
                bestHand[0].hand.cards.numbers[j] <
                table.seats[i].hand.cards.numbers[j]
              ) {
                bestHand = [table.seats[i]];
                break;
              } else if (
                bestHand[0].hand.cards.numbers[j] >
                table.seats[i].hand.cards.numbers[j]
              ) {
                break;
              }

              if (j === 4) {
                bestHand.push(table.seats[i]);
              }
            }
          } else if (bestHand[0].hand.name === "Straight") {
            if (
              bestHand[0].hand.cards[0].number <
              table.seats[i].hand.cards[0].number
            ) {
              bestHand = [table.seats[i]];
            } else if (
              bestHand[0].hand.cards[0].number ===
              table.seats[i].hand.cards[0].number
            ) {
              bestHand.push(table.seats[i]);
            }
          } else if (bestHand[0].hand.name === "Three of a kind") {
            if (
              bestHand[0].hand.cards[0].number <
              table.seats[i].hand.cards[0].number
            ) {
              bestHand = [table.seats[i]];
            } else if (
              bestHand[0].hand.cards[0].number ===
              table.seats[i].hand.cards[0].number
            ) {
              var state = "same";
              for (var j = 1; j < 3; j++) {
                if (
                  bestHand[0].hand.cards[j].number <
                  table.seats[i].hand.cards[j].number
                ) {
                  bestHand = [table.seats[i]];
                  break;
                } else if (
                  bestHand[0].hand.cards[j].number >
                  table.seats[i].hand.cards[j].number
                ) {
                  break;
                }
                if (j === 2) {
                  bestHand.push(table.seats[i]);
                }
              }
            }
          } else if (bestHand[0].hand.name === "Two Pairs") {
            if (
              bestHand[0].hand.cards[0].number <
              table.seats[i].hand.cards[0].number
            ) {
              bestHand = [table.seats[i]];
            } else if (
              bestHand[0].hand.cards[0].number ===
              table.seats[i].hand.cards[0].number
            ) {
              if (
                bestHand[0].hand.cards[1].number <
                table.seats[i].hand.cards[1].number
              ) {
                bestHand = [table.seats[i]];
              } else if (
                bestHand[0].hand.cards[1].number ===
                table.seats[i].hand.cards[1].number
              ) {
                if (
                  bestHand[0].hand.cards[2].number <
                  table.seats[i].hand.cards[2].number
                ) {
                  bestHand = [table.seats[i]];
                } else if (
                  bestHand[0].hand.cards[2].number ===
                  table.seats[i].hand.cards[2].number
                ) {
                  bestHand.push(table.seats[i]);
                }
              }
            }
          } else if (bestHand[0].hand.name === "One Pair") {
            for (var j = 0; j < 5; j++) {
              if (
                bestHand[0].hand.cards[j].number <
                table.seats[i].hand.cards[j].number
              ) {
                bestHand = [table.seats[i]];
                break;
              } else if (
                bestHand[0].hand.cards[j].number >
                table.seats[i].hand.cards[j].number
              ) {
                break;
              }
              if (
                bestHand[0].hand.cards[j].number ===
                  table.seats[i].hand.cards[j].number &&
                j === 4
              ) {
                bestHand.push(table.seats[i]);
              }
            }
          } else if (bestHand[0].hand.name === "High Card") {
            for (var j = 0; j < 5; j++) {
              if (
                bestHand[0].hand.cards[j].number <
                table.seats[i].hand.cards[j].number
              ) {
                bestHand = [table.seats[i]];
                break;
              } else if (
                bestHand[0].hand.cards[j].number >
                table.seats[i].hand.cards[j].number
              ) {
                break;
              }
              if (
                bestHand[0].hand.cards[j].number ===
                  table.seats[i].hand.cards[j].number &&
                j === 4
              ) {
                bestHand.push(table.seats[i]);
              }
            }
          }
        }
      }
    }
  }

  return bestHand;
};
module.exports.CalculatePlayerHand = (flop, cards) => {
  var sevenCardsList = CreateSevenCardsList(flop, cards);
  // console.log("seven card list", sevenCardsList);
  var sortedList = SortSevenCardsList(sevenCardsList);

  // console.log("sortelist", sortedList);
  var { sameKindsByNumber, sameKindsByRank } = FindAllSameKindsOfThePlayer(
    sortedList
  );
  var straights = FindAllStraightsOfThePlayer(sortedList, sameKindsByNumber);
  var flush = SearchForFlush(sortedList);
  var fullHouse = SearchForFullHouse(sameKindsByRank);
  var straightFlush = SearchForStraightFlush(straights);

  if (straightFlush.length < 5) {
    if (sameKindsByRank[0].marks.length !== 4) {
      if (fullHouse === false) {
        if (flush === false) {
          if (straights.length === 0) {
            if (sameKindsByRank[0].marks.length !== 3) {
              if (
                sameKindsByRank[0].marks.length === 2 &&
                sameKindsByRank[1].marks.length === 2
              ) {
                //console.log("TWO PAIRS");
                var hand = {
                  name: "Two Pairs",
                  rank: 3,
                  cards: sameKindsByRank
                };
                return hand;
              } else {
                if (sameKindsByRank[0].marks.length !== 2) {
                  //console.log("HIGH CARD");
                  var hand = {
                    name: "High Card",
                    rank: 1,
                    cards: sameKindsByRank
                  };
                  return hand;
                } else {
                  //console.log("ONE PAIR");
                  var hand = {
                    name: "One Pair",
                    rank: 2,
                    cards: sameKindsByRank
                  };
                  return hand;
                }
              }
            } else {
              //console.log("THREE OF A KIND");
              var hand = {
                name: "Three of a kind",
                rank: 4,
                cards: sameKindsByRank
              };
              return hand;
            }
          } else {
            //console.log("STRAIGHT");
            var hand = { name: "Straight", rank: 5, cards: straights[0] };
            return hand;
          }
        } else {
          //console.log("FLUSH");
          var hand = { name: "Flush", rank: 6, cards: flush };
          return hand;
        }
      } else {
        //console.log("FULL HOUSE");
        var hand = { name: "Full House", rank: 7, cards: fullHouse };
        return hand;
      }
    } else {
      //console.log("FOUR OF A KIND");
      var hand = { name: "Four of a kind", rank: 8, cards: sameKindsByRank };
      return hand;
    }
  } else {
    if (straightFlush[0].number === 14) {
      //console.log("ROYAL FLUSHAS", straightFlush);
      var hand = { name: "Royal Flush", rank: 10, cards: straightFlush };
      return hand;
    } else {
      //console.log("STRAIGHT FLUSH");
      var hand = { name: "Straight Flush", rank: 9, cards: straightFlush };
      return hand;
    }
  }
};

const CreateSevenCardsList = (flop, cards) => {
  var sevenCardsList = [];
  for (var i = 0; i < flop.length; i++) {
    var value = flop[i].substring(0, flop[i].length - 1);
    var mark = flop[i].split(value)[1];
    sevenCardsList[i] = { number: cardsInNumbers[value], mark: mark };
  }
  // console.log(flop, cards);
  if (cards[0] !== null && cards[1] !== null) {
    var value = cards[0].substring(0, cards[0].length - 1);
    var mark = cards[0].split(value)[1];
    sevenCardsList[5] = { number: cardsInNumbers[value], mark: mark };

    var value = cards[1].substring(0, cards[1].length - 1);
    var mark = cards[1].split(value)[1];
    sevenCardsList[6] = { number: cardsInNumbers[value], mark: mark };
  }

  return sevenCardsList;
};

const SortSevenCardsList = list => {
  var newList = list.sort((a, b) =>
    a.number > b.number ? -1 : b.number > a.number ? 1 : 0
  );
  sortedSevenCardsList = newList;
  return newList;
};

const Comparer = (a, b) => {
  if (a.marks.length > b.marks.length) {
    return -1;
  } else if (a.marks.length === b.marks.length) {
    if (a.number > b.number) {
      return -1;
    } else if (a.number === b.number) {
      return 0;
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};

const FindAllSameKindsOfThePlayer = list => {
  var grouped = groupBy(list, card => card.number);

  var sameKinds = [];
  grouped.forEach((value, key, map) => {
    if (value !== undefined) {
      sameKinds.push({ number: key, marks: value });
    }
  });
  //Sorted by rank reiškia, kad dvi vienodos bet mazesnes geriau nei viena aukstesne(compareris yra)
  var sameKindsByRank = sameKinds.slice().sort((a, b) => Comparer(a, b));

  var sameKindsByNumber = sameKinds
    .slice()
    .sort((a, b) => (a.number > b.number ? -1 : a.number < b.number ? 1 : 0));

  if (sameKindsByNumber[0].number === 14) {
    sameKindsByNumber[sameKindsByNumber.length] = JSON.parse(
      JSON.stringify(sameKindsByNumber[0])
    );
  }

  return { sameKindsByNumber, sameKindsByRank };
};

const groupBy = (list, keyGetter) => {
  const map = new Map();
  list.forEach(item => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
};

const FindAllStraightsOfThePlayer = (list, sameKinds) => {
  // console.log(
  //   "STRAIGHT PAIESKOS",
  //   list,
  //   sameKinds.map(x => {
  //     return x.marks;
  //   })
  // );
  var straightslocal = [];

  var multiple;
  multiple = sameKinds.filter(x => x.number === list[0].number);

  if (multiple.length === 0) {
    straightslocal.push([list[0].mark]);
  } else {
    for (var i = 0; i < multiple[0].marks.length; i++) {
      straightslocal.push([multiple[0].marks[i]]);
    }
  }

  for (var i = 1; i < sameKinds.length; i++) {
    var newStraights = [];

    straightslocal.forEach(x => {
      if (x[x.length - 1].number - 1 === sameKinds[i].number) {
        // jei paskutinio eilių masyvo elemento kortos numeris minus 1 lygus is eiles einanciu vienodu kortu numeriui
        for (var j = 0; j < sameKinds[i].marks.length; j++) {
          var newStraight = x.concat(sameKinds[i].marks[j]);
          newStraights.push(newStraight);
        }
      } else if (sameKinds[i].number === 14 && x[x.length - 1].number === 2) {
        for (var j = 0; j < sameKinds[i].marks.length; j++) {
          var newStraight = x.concat(sameKinds[i].marks[j]);
          newStraights.push(newStraight);
        }
      } else {
        for (var j = 0; j < sameKinds[i].marks.length; j++) {
          straightslocal.push([sameKinds[i].marks[j]]);
        }
      }
    });
    straightslocal = straightslocal.concat(newStraights);
  }

  var straights = straightslocal.filter(x => x.length >= 5);

  straights.sort((a, b) => a[0].number > b[0].number);

  // console.log("straights", straights);

  return straights;
};

const SearchForFlush = list => {
  // console.log(list);
  var marks = [
    { mark: "H", numbers: [] },
    { mark: "S", numbers: [] },
    { mark: "D", numbers: [] },
    { mark: "C", numbers: [] }
  ];
  for (var i = 0; i < list.length; i++) {
    marks.find(x => x.mark === list[i].mark).numbers.push(list[i].number);
  }
  //console.log("flushes", marks);
  var flushes = marks.filter(x => x.numbers.length >= 5);
  var flush = false;
  if (flushes.length > 0) {
    flush = flushes[0];
  }

  return flush;
};

const SearchForStraightFlush = straights => {
  var straightFlushes = [];
  //console.log("STRAIGHTS: ", straights);
  for (var i = 0; i < straights.length; i++) {
    var straightFlush = [];
    straights[i].forEach((x, j) => {
      if (j === 0) {
        straightFlush.push(x);
      } else {
        if (straightFlush.length === 0 || x.mark === straightFlush[0].mark) {
          straightFlush.push(x);
        } else {
          straightFlush = [x];
        }
      }
    });

    if (straightFlush.length >= 5) {
      straightFlushes.push(straightFlush);
    }
  }
  var greatestStraightFlush = [{ number: 0, mark: "S" }]; // pradinė, kad būtų bent už vieną mazesne
  straightFlushes.forEach(x => {
    if (x[0].number > greatestStraightFlush[0].number) {
      greatestStraightFlush = x;
    }
  });
  return greatestStraightFlush;
};

const SearchForFullHouse = sameKindsByRank => {
  var fullHouse = false;
  if (
    sameKindsByRank[0].marks.length >= 3 &&
    sameKindsByRank[1].marks.length >= 2
  ) {
    fullHouse = {
      three: sameKindsByRank[0],
      two: sameKindsByRank[1]
    };
  } else if (
    sameKindsByRank[0].marks.length >= 2 &&
    sameKindsByRank[1].marks.length >= 3
  ) {
    fullHouse = {
      three: sameKindsByRank[1],
      two: sameKindsByRank[0]
    };
  }
  return fullHouse;
};
