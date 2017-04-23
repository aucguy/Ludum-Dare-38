base.registerModule('physical', function() {
  var util = base.importModule('util');
  var common = base.importModule('common');

  var PhysicalWorld = util.extend(common.World, 'PhysicalWorld', {
    kill: function kill() {
      this.group.destroy();
      for(var i = 0; i < this.joints.length; i++) {
        this.joints[i].kill();
      }
    }
  });

  var PhysicalJoint = util.extend(common.Joint, 'PhysicalJoint', {
    constructor: function PhysicalJoint(game, x, y) {
      this.constructor$Joint(game, x, y);
      game.physics.p2.enable(this.sprite);
    }
  });

  var PhysicalConnection = util.extend(common.Connection,
    'PhysicalConnection', {
      constructor: function PhysicalConnection(physics, customTexture,
        joint1, joint2, onRender) {
        this.physics = physics;
        this.constraint = null;
        this.constructor$Connection(customTexture, joint1, joint2,
          onRender);
      },
      setJoint1: function setJoint1(joint) {
        this.setJoint1$Connection(joint);
        this.updateConstraint();
      },
      setJoint2: function setJoint2(joint) {
        this.setJoint2$Connection(joint);
        this.updateConstraint();
      },
      updateConstraint: function updateConstraint() {
        if(this.constraint !== null) {
          this.physics.removeConstraint(this.constraint);
          this.constraint = null;
        }
        if(this.joint1 && this.joint2) {
          var pos1 = this.joint1.getPosition();
          var pos2 = this.joint2.getPosition();
          var dist = util.dist([pos1.x, pos1.y], [pos2.x, pos2.y]);
          this.constraint = this.physics.createDistanceConstraint(this.joint1
            .sprite, this.joint2.sprite, dist);
        }
      },
      destroy: function destroy() {
        this.destroy$Connection();
        this.physics.removeConstraint(this.constraint);
      }
    });

  return {
    PhysicalJoint: PhysicalJoint,
    PhysicalConnection: PhysicalConnection,
    PhysicalWorld: PhysicalWorld
  };
});