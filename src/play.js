base.registerModule('play', function() {
  var util = base.importModule('util');
  var common = base.importModule('common');
  var editor = base.importModule('editor');
  var physical = base.importModule('physical');

  var MODES = {
    editable: 0,
    physical: 1
  };

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
      this.customTexture = null;
      this.mouseHandler = null;
      this.keyHandler = null;
      this.mousePositioned = null;
      this.signals = {
        onMouseDown: new Phaser.Signal(),
        onMouseUp: new Phaser.Signal(),
        onMouseMove: new Phaser.Signal(),
        onUpdate: new Phaser.Signal(),
        onRender: new Phaser.Signal(),
        onRemoveKey: new Phaser.Signal(),
        onModeSwitch: new Phaser.Signal(),
        onCustomRender: new Phaser.Signal()
      };
    },
    create: function create() {
      this.game.physics.startSystem(Phaser.Physics.P2JS);
      this.game.add.sprite(0, 0, 'image/background');
      this.customTexture = new CustomTexture(this.game, this.signals.onRender,
        this.signals.onCustomRender);
      this.mouseHandler = new MouseHandler(this.game, this.signals.onMouseDown,
        this.signals.onMouseUp, this.signals.onMouseMove, this.signals
        .onUpdate);
      this.keyHandler = new KeyHandler(this.game.input.keyboard, this
        .mouseHandler, this.signals.onRemoveKey, this.signals.onModeSwitch
      );
      this.mousePositioned = new MousePositioned(this.signals.onMouseMove);
      this.SwitchManager = new SwitchManager(this.game, this.customTexture,
        this.mousePositioned, this.signals);
    },
    update: function update() {
      this.signals.onUpdate.dispatch();
    },
    render: function render() {
      this.signals.onRender.dispatch();
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

  var MousePositioned = util.extend(common.Connectable, 'MousePositioned', {
    constructor: function MousePosition(onMouseMove) {
      this.position = new Phaser.Point(0, 0);
      onMouseMove.add(this.mouseMove.bind(this));
    },
    mouseMove: function mouseMove(pointer) {
      this.position = pointer;
    },
    getPosition: function getPosition() {
      return this.position;
    }
  });

  var KeyHandler = util.extend(Object, 'KeyHandler', {
    constructor: function KeyHandler(keyboard, mouseHandler,
      onKeyRemove, onModeSwitch) {
      keyboard.addKey(Phaser.KeyCode.R).onDown.add(function() {
        onKeyRemove.dispatch(mouseHandler.lastPosition);
      });
      keyboard.addKey(Phaser.KeyCode.S).onDown.add(function() {
        onModeSwitch.dispatch();
      });
    }
  });

  /**
   * handles the switching between the two worlds
   */
  var SwitchManager = util.extend(Object, 'SwitchManager', {
    constructor: function SwitchManager(game, customTexture,
      mousePositioned, globalSignals) {
      this.globalSignals = globalSignals;
      this.editableSignals = {
        onMouseDown: new Phaser.Signal(),
        onMouseUp: new Phaser.Signal(),
        onUpdate: new Phaser.Signal(),
        onRemoveKey: new Phaser.Signal(),
        onCustomRender: new Phaser.Signal()
      };
      this.physicalSignals = {
        onMouseDown: new Phaser.Signal(),
        onMouseUp: new Phaser.Signal(),
        onUpdate: new Phaser.Signal(),
        onRemoveKey: new Phaser.Signal(),
        onCustomRender: new Phaser.Signal()
      };
      this.mode = MODES.editable;


      this.editableWorld = new editor.EditableWorld(game);
      this.editor = new editor.Editor(this.editableWorld,
        customTexture,
        mousePositioned, this.editableSignals.onMouseDown, this.editableSignals
        .onMouseUp,
        this.editableSignals.onRemoveKey, this.editableSignals.onCustomRender
      );

      this.physicalWorld = null;

      this.globalSignals.onModeSwitch.add(this.switchModes.bind(this));
      this.registerDelegateHandler(this.globalSignals.onMouseDown,
        this.editableSignals.onMouseDown, this.physicalSignals.onMouseDown
      );
      this.registerDelegateHandler(this.globalSignals.onMouseUp, this
        .editableSignals.onMouseUp, this.physicalSignals.onMouseUp);
      this.registerDelegateHandler(this.globalSignals.onUpdate, this.editableSignals
        .onUpdate, this.physicalSignals.onUpdate);
      this.registerDelegateHandler(this.globalSignals.onRemoveKey,
        this.editableSignals.onRemoveKey, this.physicalSignals.onRemoveKey
      );
      this.registerDelegateHandler(this.globalSignals.onCustomRender,
        this.editableSignals.onCustomRender, this.physicalSignals.onCustomRender
      );
    },
    switchModes: function switchModes() {
      this.mode = this.mode === MODES.editable ? MODES.physical :
        MODES.editable;
      if(this.mode === MODES.editable) {
        this.editableWorld.group.visible = true;
        this.physicalWorld.kill();
        this.physicalWorld = null;
      } else {
        this.editableWorld.group.visible = false;
        this.physicalWorld = this.translateWorld(this.editableWorld);
      }
    },
    registerDelegateHandler: function registerDelegateHandler(global,
      editable, physical) {
      global.add(function() {
        if(this.mode === MODES.editable) {
          editable.dispatch.apply(editable, arguments);
        } else {
          physical.dispatch.apply(physical, arguments);
        }
      }.bind(this));
    },
    /**
     * turns editable worlds into physical worlds
     */
    translateWorld: function translateWorld(editableWorld) {
      var game = editableWorld.game;
      var physicalWorld = new physical.PhysicalWorld(game, this.physicalSignals
        .onUpdate);
      //addJoint preserves order
      var i;
      for(i = 0; i < editableWorld.joints.length; i++) {
        var position = editableWorld.joints[i].getPosition();
        physicalWorld.addJoint(new physical.PhysicalJoint(game,
          position.x, position.y));
      }
      for(i = 0; i < editableWorld.connections.length; i++) {
        var connection = editableWorld.connections[i];
        var joint1 = physicalWorld.joints[editableWorld.joints.indexOf(
          connection.joint1)];
        var joint2 = physicalWorld.joints[editableWorld.joints.indexOf(
          connection.joint2)];
        physicalWorld.addConnection(new physical.PhysicalConnection(
          physicalWorld, game.physics.p2, connection.customTexture,
          joint1,
          joint2, this.physicalSignals.onCustomRender));
      }
      return physicalWorld;
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