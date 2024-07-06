'use strict';
const conf = require('./config');
const Game = require('./game');

(async () => {
  const game = new Game(conf.cookies);
  await game.start();
})();