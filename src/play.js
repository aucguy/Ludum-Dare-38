base.registerModule('play', function() {
  var util = base.importModule('util');
  var editor = base.importModule('editor');

  var PlayState = util.extend(Object, 'PlayState', {
    constructor: function PlayState(main) {
      this.top = new Top(main, this);
    },
    create: function create() {
      this.top.create();
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

  var Top = util.extend(Object, 'Top', {
    constructor: function Top(main, state) {
      this.main = main;
      this.game = main.game;
      this.state = state;
      this.mouseHandler = null;
      this.world = null;
      this.editor = null;
      this.mousePositioned = null;
      this.customTexture = null;
      this.keyHandler = null;
      this.onMouseDown = new Phaser.Signal();
      this.onMouseUp = new Phaser.Signal();
      this.onMouseMove = new Phaser.Signal();
      this.onUpdate = new Phaser.Signal();
      this.onRender = new Phaser.Signal();
      this.onRemoveKey = new Phaser.Signal();
      this.onCustomRender = new Phaser.Signal();
    },
    create: function create() {
      this.game.add.sprite(0, 0, 'image/background');
      this.customTexture = new CustomTexture(this.game, this.onRender,
        this.onCustomRender);
      this.mouseHandler = new MouseHandler(this.game, this.onMouseDown,
        this.onMouseUp, this.onMouseMove, this.onUpdate);
      this.keyHandler = new KeyHandler(this.game.input.keyboard, this
        .mouseHandler, this.onRemoveKey);
      this.world = new editor.EditableWorld(this.game);
      this.mousePositioned = new editor.MousePositioned(this.onMouseMove);
      this.editor = new editor.Editor(this.world, this.customTexture,
        this.mousePositioned, this.onMouseDown, this.onMouseUp,
        this.onRemoveKey, this.onCustomRender);
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

  var MouseHandler = util.extend(util.Contextual, 'MouseHandler', {
    constructor: function MouseHandler(game, onMouseDown, onMouseUp,
      onMouseMove, onUpdate) {
      this.game = game;
      this.onMouseDown = onMouseDown;
      this.onMouseUp = onMouseUp;
      this.onMouseMove = onMouseMove;
      onUpdate.add(this.update.bind(this));
      this.wasDown = null;
      this.lastPosition = null;
    },
    update: function update() {
      var mouse = this.game.input.activePointer.leftButton.parent;
      var point = new Phaser.Point(mouse.x, mouse.y);
      if(mouse.isDown && !this.wasDown) {
        this.onMouseDown.dispatch(point);
      } else if(!mouse.isDown && this.wasDown) {
        this.onMouseUp.dispatch(point);
      }
      this.wasDown = mouse.isDown;
      if(this.lastPosition !== null && (mouse.x !== this.lastPosition
          .x || mouse.y !== this.lastPosition.y)) {
        this.onMouseMove.dispatch(new Phaser.Point(mouse.x, mouse.y));
      }
      this.lastPosition = point;
    }
  });

  var KeyHandler = util.extend(Object, 'KeyHandler', {
    constructor: function KeyHandler(keyboard, mouseHandler,
      onKeyRemove) {
      keyboard.addKey(Phaser.KeyCode.R).onDown.add(function() {
        onKeyRemove.dispatch(mouseHandler.lastPosition);
      });
    }
  });

  /**
   * used to display objects that don't have single images
   */
  var CustomTexture = util.extend(Object, 'CustomTexture', {
    constructor: function CustomTexture(game, onRender, onCustomRender) {
      this.texture = util.createBitmap(game, game.width, game.height);
      this.sprite = game.add.sprite(0, 0, this.texture);
      this.onCustomRender = onCustomRender;
      onRender.add(this.render.bind(this));
    },
    render: function render() {
      var context = this.texture.context;
      context.save();
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      this.onCustomRender.dispatch();
      context.restore();
      this.texture.dirty = true;
    }
  });

  return {
    PlayState: PlayState
  };
});