base.registerModule('editor', function() {
  var util = base.importModule('util');
  var common = base.importModule('common');

  var EditableWorld = util.extend(common.World, 'EditableWorld', {});

  var EditableJoint = util.extend(common.Joint, 'EditableJoint', {
    isClicked: function isClicked(pointer) {
      return util.dist([pointer.x, pointer.y], [this.sprite.position.x,
        this.sprite.position.y
      ]) < this.radius;
    }
  });

  var EditableConnection = util.extend(common.Connection,
    'EditableConnection', {});

  var Editor = util.extend(Object, 'Editor', {
    constructor: function Editor(world, customTexture, mousePositioned,
      onMouseDown, onMouseUp, onRemoveKey, onRender) {
      this.world = world;
      this.customTexture = customTexture;
      this.onRender = onRender;
      this.currentConnection = null;
      this.mousePositioned = mousePositioned;
      onMouseDown.add(this.mouseDown.bind(this));
      onMouseUp.add(this.mouseUp.bind(this));
      onRemoveKey.add(this.removeKey.bind(this));
    },
    getJointAt: function getJointAt(point) {
      for(var i = 0; i < this.world.joints.length; i++) {
        var joint = this.world.joints[i];
        if(joint.isClicked(point)) {
          return joint;
        }
      }
      return null;
    },
    mouseDown: function mouseDown(pointer) {
      var joint = this.getJointAt(pointer);
      if(joint === null) {
        this.world.addJoint(new EditableJoint(this.world.game,
          pointer.x, pointer.y));
      } else {
        this.currentConnection = new EditableConnection(this.customTexture,
          joint, this.mousePositioned, this.onRender);
      }
    },
    mouseUp: function mouseUp(pointer) {
      if(this.currentConnection !== null) {
        var joint = this.getJointAt(pointer);
        if(joint === null || joint === this.currentConnection.joint1) {
          this.currentConnection.kill();
          this.currentConnection = null;
        } else {
          this.currentConnection.setJoint2(joint);
          this.world.addConnection(this.currentConnection);
          this.currentConnection = null;
        }
      }
    },
    removeKey: function removeKey(pointer) {
      var joint = this.getJointAt(pointer);
      if(joint !== null) {
        this.world.removeJoint(joint);
      }
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

  return {
    EditableWorld: EditableWorld,
    EditableJoint: EditableJoint,
    Editor: Editor,
    MousePositioned: MousePositioned
  };
});