'use strict';
const Game = require('./game');

(async () => {
  const game = new Game(process.env.COOKIE_STR);
  await game.init();
  await game.start();
})();