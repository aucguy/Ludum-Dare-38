base.registerModule('input', function() {
  var util = base.importModule('util');
  var common = base.importModule('common');
  var TILES = common.TILES;
  
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
      var minY = Math.max(1, Math.min(pointer.now.y, pointer.last.y) - this.radius);
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
          if(util.dist([x, y], [inter.x, inter.y]) < this.radius && y > 0) {
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
  
  return {
    MouseHandler: MouseHandler,
    KeyHandler: KeyHandler,
    Editor: Editor
  }
});