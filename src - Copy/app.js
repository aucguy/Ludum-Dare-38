/**
 * entry point of the real application
 **/
base.registerModule('app', function() {
  var play = base.importModule('play');

  var setup = {
    /**
     * called prior to initialization
     **/
    preinit: function preinit(main) {},
    /**
     * load the assets
     */
    loadAssets: function loadAssets(main) {},
    /**
     * create the states
     */
    getStates: function getStates(main) {
      return {
        play: new play.PlayState(main)
      };
    },
    /**
     * initialize the application
     */
    initApp: function initApp(main) {
      main.game.state.start('play');
    },
    /**
     * the config for the phaser instance
     **/
    getPhaserConfig: function getPhaserConfig() {
      return {
        width: 640,
        height: 480,
        canvasID: 'display',
        parent: 'screen',
        renderer: Phaser.AUTO,
      };
    }
  };

  return {
    setup: setup
  };
});