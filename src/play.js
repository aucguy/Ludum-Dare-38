base.registerModule('play', function() {
  var util = base.importModule('util');

  var TILES = {
    air: 0,
    soil: 1
  };

  var MAX_POTENTIAL = 0x0FFFFF;

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
      this.onMouseDown = new Phaser.Signal();
      this.onToggleTile = new Phaser.Signal();
    },
    init: function create() {
      this.mouseHandler = this.create(MouseHandler, this.game, this.onMouseDown, this.onUpdate);
      this.keyHandler = this.create(KeyHandler, this.onToggleTile, this.game.input.keyboard);
      this.world = this.create(World, this.game);
      this.soil = this.create(Soil, this.game, this.world, this.onUpdate);
      this.editor = this.create(Editor, this.world, this.onMouseDown, this.onToggleTile);
      this.flow = this.create(Flow, this.world, this.onUpdate);
      this.world.onSetTile = this.flow.onSetTile.bind(this.flow);
    },
    update: function update() {
      this.onUpdate.dispatch();
    },
    shutdown: function shutdown() {
      util.clearBitmapCache();
    }
  });

  var MouseHandler = util.extend(util.Contextual, 'MouseHandler', {
    constructor: function MouseHandler(game, onMouseDown, onUpdate) {
      this.game = game;
      this.onMouseDown = onMouseDown;
      onUpdate.add(this.update.bind(this));
      this.lastMouseCoord = null;
    },
    update: function update() {
      var mouse = this.game.input.activePointer.leftButton;
      if(mouse.isDown) {
        var now = {
          x: mouse.parent.x,
          y: mouse.parent.y
        };
        if(this.lastMouseCoord === null) {
          this.lastMouseCoord = now;
        }
        this.onMouseDown.dispatch({
          now: now,
          last: this.lastMouseCoord
        });
        this.lastMouseCoord = now;
      } else {
        this.lastMouseCoord = null;
      }
    }
  });

  var KeyHandler = util.extend(util.Contextual, 'KeyHandler', {
    constructor: function KeyHandler(onToggleTile, keyboard) {
      this.constructor$Contextual();
      keyboard.addKey(Phaser.KeyCode.S).onDown.add(function() {
        onToggleTile.dispatch();
      });
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
        this.tiles[i] = TILES.soil;
        this.potential[i] = MAX_POTENTIAL;
      }
    },
    setTile: function setTile(x, y, tile) {
      var index = y * this.width + x;
      this.tiles[index] = tile;
      this.onSetTile(x, y, tile, this, index);
    }
  });

  /**
   * responsible for changing the world's tiles based on user input
   */
  var Editor = util.extend(util.Contextual, 'Editor', {
    constructor: function Editor(world, onMouseDown, onToggleTile) {
      this.world = world;
      this.radius = 10;
      this.tile = TILES.air;
      onMouseDown.add(this.mouseDown.bind(this));
      onToggleTile.add(this.toggleTile.bind(this));
    },
    mouseDown: function mouseDown(pointer) {
      var minX = Math.max(0, Math.min(pointer.now.x, pointer.last.x) - this.radius);
      var maxX = Math.min(this.world.width, Math.max(pointer.now.x, pointer.last.x) + this.radius);
      var minY = Math.max(0, Math.min(pointer.now.y, pointer.last.y) - this.radius);
      var maxY = Math.min(this.world.height, Math.max(pointer.now.y, pointer.last.y) + this.radius);
      //go over all the pixels in the circle, along with the ones in the 'corners'
      //then trim off the 'corners'
      //TODO fix pointer going straight up
      //TODO fix missing parts of the line
      for(var y = minY; y < maxY; y++) {
        for(var x = minX; x < maxX; x++) {
          var inter;
          //just ignores vertical lines
          if(pointer.now.x === pointer.last.x) {
            inter = pointer.now;
          } else {
            var m = (pointer.last.y - pointer.now.y) / (pointer.last.x - pointer.now.x);
            var mPrime = -1 / m;
            var interX = (m * pointer.last.x - mPrime * x - pointer.last.y + y) / (m - mPrime);
            var interY = m * (interX - pointer.last.x) + pointer.last.y;
            inter = {
              x: interX,
              y: interY
            };
            inter = this.clampPoint(pointer.now, pointer.last, inter);
            inter = this.clampPoint(pointer.last, pointer.now, inter);
          }
          if(util.dist([x, y], [inter.x, inter.y]) < this.radius) {
            this.world.setTile(x, y, this.tile);
          }
        }
      }
    },
    clampPoint: function clampPoint(a, b, c) {
      if((a.x < b.x && c.x < a.x) ||
        (a.x > b.x && c.x > a.x) ||
        (a.y < b.y && c.y < a.y) ||
        (a.y > b.y && c.y > a.y)) {
        return a;
      } else {
        return c;
      }
    },
    toggleTile: function toggleTile() {
      this.tile = this.tile == TILES.air ? TILES.soil : TILES.air;
    }
  });

  /**
   * the earth that the ants walk around in
   */
  var Soil = util.extend(util.Contextual, 'Soil', {
    constructor: function Soil(game, world, onUpdate) {
      this.constructor$Contextual();
      this.world = world;
      //mask for the soil
      this.texture = util.createBitmap(game, game.width, game.height);
      this.sprite = game.add.sprite(0, 0, this.texture);
      onUpdate.add(this.update.bind(this));
    },
    update: function update() {
      var imageData = this.texture.context.getImageData(0, 0, this.texture.width, this.texture.height);
      var tiles = this.world.tiles;
      var imageIndex = 0;
      var tileIndex = 0;
      for(var y = 0; y < imageData.height; y++) {
        for(var x = 0; x < imageData.width; x++) {
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
      for(var i = 0; i < 1; i++) {
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
        if(tiles[x] == TILES.air) {
          this.world.potential[x] = 0;
        }
      }

      var newDiffs = new util.SemiFilledTypedArray(Uint32Array, this.diffs.capacity);
      var visited = new Uint32Array(tiles.length);

      for(var i = 0; i < this.diffs.length; i++) {
        var index = this.diffs.data[i];
        x = index % width;
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
      if(tile === TILES.air) {
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