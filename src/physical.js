base.registerModule('physical', function() {
  var util = base.importModule('util');
  var common = base.importModule('common');

  var GRAVITY = 100;
  var MIN_R = 100;

  var PhysicalWorld = util.extend(common.World, 'PhysicalWorld', {
    constructor: function PhysicalWorld(game, onUpdate, onGravityChange) {
      this.constructor$World(game);
      this.updateBinding = onUpdate.add(this.update.bind(this));
      this.initialMass = 100;
      this.massRate = 0.001;
      this.startTime = game.time.elapsedSince(0);
      this.onGravityChange = onGravityChange;
    },
    update: function update() {
      var center = new Phaser.Point(this.game.width / 2, this.game.height /
        2);
      var deltaTime = this.game.time.elapsedSince(this.startTime);
      var mass = this.initialMass + this.massRate * deltaTime;
      for(i = 0; i < this.joints.length; i++) {
        this.joints[i].update(center, mass);
      }
      this.onGravityChange.dispatch(mass);
    },
    kill: function kill() {
      this.updateBinding.detach();
      this.group.destroy();
      for(var i = 0; i < this.joints.length; i++) {
        this.joints[i].kill();
      }
    }
  });

  var PhysicalJoint = util.extend(common.Joint, 'PhysicalJoint', {
    constructor: function PhysicalJoint(game, x, y) {
      this.constructor$Joint(game, x, y);
      game.physics.p2.enable(this.sprite, true);
      this.sprite.body.fixedRotation = true;
      this.sprite.body.clearShapes(); //so there are no collisions
      this.sprite.body.mass = 1;
    },
    update: function update(gravityCenter, gravityMass) {
      var m1 = this.sprite.body.mass;
      var m2 = gravityMass;
      var r = util.dist([this.getPosition().x, this.getPosition().y], [
        gravityCenter.x, gravityCenter.y
      ]);
      r = Math.max(MIN_R, r);
      var magnitude = GRAVITY * m1 * m2 / Math.pow(r, 2);
      var unit = Phaser.Point.normalize(Phaser.Point.subtract(this.getPosition(),
        gravityCenter));
      var force = Phaser.Point.multiply(unit, new Phaser.Point(
        magnitude, magnitude));
      this.sprite.body.applyForce([force.x, force.y], this.getPosition()
        .x, this.getPosition().y);
    }
  });

  var PhysicalConnection = util.extend(common.Connection,
    'PhysicalConnection', {
      constructor: function PhysicalConnection(world, physics,
        customTexture,
        joint1, joint2, onRender) {
        this.physics = physics;
        this.constraint = null;
        this.constructor$Connection(world, customTexture, joint1,
          joint2,
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
      kill: function kill() {
        this.kill$Connection();
        this.physics.removeConstraint(this.constraint);
      }
    });

  return {
    PhysicalJoint: PhysicalJoint,
    PhysicalConnection: PhysicalConnection,
    PhysicalWorld: PhysicalWorld
  };
});