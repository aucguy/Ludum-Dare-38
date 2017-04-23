base.registerModule('play', function() {
  var util = base.importModule('util');
  var input = base.importModule('input');
  var common = base.importModule('common');
  var TILES = common.TILES;

  var MAX_POTENTIAL = 0x0FFFFF;
  var COOL_DOWN = MAX_POTENTIAL + 1;

  var PlayState = util.extend(util.Contextual, 'PlayState', {
    constructor: function PlayState(main) {
      this.constructor$Contextual();
      this.main = main;
      this.top = this.create$Contextual(Top, this);
    },
    create: function create() {
      this.top.init();
    },
    update: function update() {
      this.top.update();
    },
    render: function render() {
      this.top.render();
    },
    shutdown: function shutdown() {
      this.top.shutdown();
    }
  });

  var Top = util.extend(util.Contextual, 'Top', {
    constructor: function Top(state) {
      this.constructor$Contextual();
      this.state = state;
      this.main = state.main;
      this.game = state.main.game;
      this.mouseHandler = null;
      this.keyHandler = null;
      this.world = null;
      this.soil = null;
      this.editor = null;
      this.flow = null;
      this.onUpdate = new Phaser.Signal();
      this.onRender = new Phaser.Signal();
      this.onMouseDown = new Phaser.Signal();
      this.onToggleTile = new Phaser.Signal();
    },
    init: function create() {
      this.mouseHandler = this.create(input.MouseHandler, this.game, this.onMouseDown, this.onUpdate);
      this.keyHandler = this.create(input.KeyHandler, this.onToggleTile, this.game.input.keyboard);
      this.world = this.create(World, this.game);
      this.editor = this.create(input.Editor, this.world, this.onMouseDown, this.onToggleTile);
      this.soil = this.create(Soil, this.game, this.world, this.onRender);
      this.flow = this.create(Flow, this.world, this.onUpdate);
      this.world.onSetTile = this.flow.onSetTile.bind(this.flow);
    },
    update: function update() {
      this.onUpdate.dispatch();
    },
    render: function render() {
      this.onRender.dispatch();
    },
    shutdown: function shutdown() {
      util.clearBitmapCache();
    }
  });

  /**
   * contains the ... world
   */
  var World = util.extend(util.Contextual, 'World', {
    constructor: function World(game) {
      this.constructor$Contextual();
      this.width = game.width;
      this.height = game.height;
      this.tiles = new Uint8Array(game.width * game.height);
      this.potential = new Uint32Array(game.width * game.height);
      this.onSetTile = util.NOP;
      for(var i = 0; i < this.tiles.length; i++) {
        this.tiles[i] = i < this.width ? TILES.air : TILES.soil;
        this.potential[i] = MAX_POTENTIAL;
      }
    },
    setTile: function setTile(x, y, tile) {
      if(x > 0 && x < this.width && y > 0 && y < this.height) {
        var index = y * this.width + x;
        this.tiles[index] = tile;
        this.onSetTile(x, y, tile, this, index);
      }
    }
  });

  /**
   * the earth that the ants walk around in
   */
  var Soil = util.extend(util.Contextual, 'Soil', {
    constructor: function Soil(game, world, onRender) {
      this.constructor$Contextual();
      this.world = world;
      //mask for the soil
      this.texture = util.createBitmap(game, game.width, game.height);
      this.sprite = game.add.sprite(0, 0, this.texture);
      onRender.add(this.render.bind(this));
    },
    render: function render() {
      var imageData = this.texture.context.getImageData(0, 0, this.texture.width, this.texture.height);
      var tiles = this.world.tiles;
      var imageIndex = 0;
      var tileIndex = 0;
      var width = imageData.width;
      var height = imageData.height;
      for(var y = 0; y < height; y++) {
        for(var x = 0; x < width; x++) {
          var tile = tiles[tileIndex++];
          if(tile === TILES.air) {
            var potential = this.world.potential[tileIndex - 1] / 5;
            imageData.data[imageIndex++] = potential;
            imageData.data[imageIndex++] = potential;
            imageData.data[imageIndex++] = potential;
          } else {
            imageData.data[imageIndex++] = 255;
            imageData.data[imageIndex++] = 0;
            imageData.data[imageIndex++] = 0;
          }
          imageData.data[imageIndex++] = 255;
        }
      }
      this.texture.context.putImageData(imageData, 0, 0);
      this.texture.dirty = true;
    }
  });

  var Flow = util.extend(util.Contextual, 'Flow', {
    constructor: function Flow(world, onUpdate) {
      this.constructor$Contextual();
      this.world = world;
      //index1, index2 ...
      //doesn't need to be that long, but there's enough memory anyway
      this.diffs = new util.SemiFilledTypedArray(Uint32Array, this.world.potential.length);
      onUpdate.add(this.update.bind(this));
    },
    update: function update() {
      for(var i = 0; i < 10; i++) {
        this.simulate();
      }
    },
    simulate: function simulate() {
      //TODO fix alternating lines, it might get the ants stuck or slow them down
      var oldField = new Uint32Array(this.world.potential);

      var width = this.world.width;
      var height = this.world.height;
      var tiles = this.world.tiles;

      var x;
      for(x = 0; x < width; x++) {
        if(tiles[x] === TILES.air) {
          this.world.potential[x] = 0;
        }
      }

      var newDiffs = new util.SemiFilledTypedArray(Uint32Array, this.diffs.capacity);
      var visited = new Uint8Array(tiles.length);
      
      console.log(this.diffs.length);

      for(var i = 0; i < this.diffs.length; i++) {
        var index = this.diffs.data[i];
        var x = index % width;
        var y = Math.floor(index / width);
        if(tiles[index] === TILES.air && y !== 0) {
          if(visited[index] !== 0) {
            continue;
          }
          visited[index] = 1;

          var left = x === 0 || tiles[index - 1] !== TILES.air ? MAX_POTENTIAL : oldField[index - 1];
          var right = x === width - 1 || tiles[index + 1] !== TILES.air ? MAX_POTENTIAL : oldField[index + 1];
          var up = y === 0 || tiles[index - width] !== TILES.air ? MAX_POTENTIAL : oldField[index - width];
          var down = y === height - 1 || tiles[index + width] !== TILES.air ? MAX_POTENTIAL : oldField[index + width];
          var lowest = Math.min(left, right, up, down);

          var here = oldField[index];
          var target = Math.min(MAX_POTENTIAL, lowest + 1);
          var out = MAX_POTENTIAL + 1;
          if(target <= here) {
            this.world.potential[index] = target;
            if(left > target) {
              newDiffs.push(index - 1);
            }
            if(right > target) {
              newDiffs.push(index + 1);
            }
            if(up > target) {
              newDiffs.push(index - width);
            }
            if(down > target) {
              newDiffs.push(index + width);
            }
          } else {
            this.world.potential[index] = MAX_POTENTIAL;
            newDiffs.push(index - 1);
            newDiffs.push(index + 1);
            newDiffs.push(index - width);
            newDiffs.push(index + width);
          }
        } else {
          this.world.potential[index] = MAX_POTENTIAL;
        }
      }
      this.diffs = newDiffs;
    },
    onSetTile: function onSetTile(x, y, tile, world, index) {
      if(y === 0 ){
        console.log('y = 0');
      }
      if(tile === TILES.air && false) {
        this.diffs.push(index);
      } else {
        this.diffs.push(index - 1);
        this.diffs.push(index + 1);
        this.diffs.push(index - world.width);
        this.diffs.push(index + world.width);
      }
    }
  });

  return {
    PlayState: PlayState
  };
});