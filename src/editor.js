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
    getConnectionAt: function getConnectionAt(point) {
      for(var i = 0; i < this.world.connections.length; i++) {
        var connection = this.world.connections[i];
        var pos1 = connection.joint1.getPosition();
        var pos2 = connection.joint2.getPosition();
        var interX;
        var interY;
        if(pos1.x === pos2.x) {
          interX = pos1.x;
          interY = point.y;
        } else {
          //the result of algebra
          //I have no clue what it means intuitively
          var m = (pos1.y - pos2.y) / (pos1.x - pos2.x);
          var mPrime = -1 / m;
          interX = (m * pos1.x - mPrime * point.x - pos1.y + point.y) /
            (m - mPrime);
          interY = m * (interX - pos1.x) + pos1.y;
        }
        var inter = new Phaser.Point(interX, interY);
        inter = this.clampPoint(pos1, pos2, inter);
        inter = this.clampPoint(pos2, pos1, inter);
        if(util.dist([point.x, point.y], [inter.x, inter.y]) <
          connection.width) {
          return connection;
        }
      }
      return null;
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
    mouseDown: function mouseDown(pointer) {
      var joint = this.getJointAt(pointer);
      if(joint === null) {
        this.world.addJoint(new EditableJoint(this.world.game,
          pointer.x, pointer.y));
      } else {
        this.currentConnection = new EditableConnection(this.world,
          this.customTexture,
          joint, this.mousePositioned, this.onRender);
      }
    },
    mouseUp: function mouseUp(pointer) {
      if(this.currentConnection !== null) {
        var joint = this.getJointAt(pointer);
        if(joint === null || joint === this.currentConnection.joint1) {
          this.currentConnection.kill(this.currentConnection.joint1);
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
      var connection = this.getConnectionAt(pointer);
      if(joint !== null) {
        this.world.removeJoint(joint);
      } else if(connection !== null) {
        this.world.removeConnection(connection);
      }
    }
  });

  return {
    EditableWorld: EditableWorld,
    EditableJoint: EditableJoint,
    Editor: Editor
  };
});