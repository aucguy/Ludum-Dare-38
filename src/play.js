base.registerModule('play', function() {
  var util = base.importModule('util');
  
  var TILES = {
    air: 0,
    soil: 1
  }
  
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
      this.onUpdate = new Phaser.Signal();
      this.onMouseDown = new Phaser.Signal();
      this.onSelectSoil = new Phaser.Signal();
    },
    init: function create() {
      this.mouseHandler = this.create(MouseHandler, this.game, this.onMouseDown, this.onUpdate);
      this.keyHandler = this.create(KeyHandler, this.game, this.onSelectSoil);
      this.world = this.create(World, this.game);
      this.soil = this.create(Soil, this.game, this.world, this.onUpdate);
      this.editor = this.create(Editor, this.world, this.onMouseDown);
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
      var mouse = this.game.input.activePointer.leftButton
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
  
  var KeyHandler = util.extend(util.Contextual, 'KeyHandler', )
  
  /**
   * contains the ... world
   */
  var World = util.extend(util.Contextual, 'World', {
    constructor: function World(game) {
      this.constructor$Contextual();
      this.width = game.width;
      this.height = game.height;
      this.tiles = new Uint8Array(game.width * game.height);
      for(var i=0; i<this.tiles.length; i++) {
        this.tiles[i] = TILES.soil;
      }
    },
    setTile: function setTile(x, y, tile) {
      this.tiles[y * this.width + x] = tile;
    }
  });
  
  /**
   * responsible for changing the world's tiles based on user input
   */
  var Editor = util.extend(util.Contextual, 'Editor', {
    constructor: function Editor(world, onMouseDown) {
      onMouseDown.add(this.mouseDown.bind(this));
      this.world = world;
      this.radius = 10;
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
      for(var y=minY; y<maxY; y++) {
        for(var x=minX; x<maxX; x++) {
          var inter;
          //just ignores vertical lines
          if(pointer.now.x === pointer.last.x) {
            inter = pointer.now
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
            this.world.setTile(x, y, TILES.air);
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
      for(var y=0; y<imageData.height; y++) {
        for(var x=0; x<imageData.width; x++) {
          var tile = tiles[tileIndex++];
          if(tile === TILES.air) {
            imageData.data[imageIndex++] = 255;
            imageData.data[imageIndex++] = 255;
            imageData.data[imageIndex++] = 255;
          } else {
            imageData.data[imageIndex++] = 0;
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
  
  return {
    PlayState: PlayState
  };
});