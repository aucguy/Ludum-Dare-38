/**
 * entry point of the real application
 **/
import * as util from '/lib/util.js';
import * as play from './play.js';

function init() {
  var game = new Phaser.Game({
    width: 640,
    height: 480,
    canvasID: 'display',
    parent: 'screen',
    renderer: Phaser.AUTO,
    state: new util.BootState('play')
  });
  game.state.add('play', new play.PlayState());
  return game;
}

export {
  init
};