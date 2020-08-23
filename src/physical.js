import * as util from '/lib/util.js';
import * as common from './common.js';

var GRAVITY = 1;
var MAX_FORCE = 25;
var DIST_THRESHOLD = 25;
var GOAL_HEIGHT = 375 / 2;

var PhysicalWorld = util.extend(common.World, 'PhysicalWorld', {
  constructor: function PhysicalWorld(game, onUpdate, onGravityChange) {
    this.constructor$World(game);
    this.updateBinding = onUpdate.add(this.update.bind(this));
    this.initialMass = 10;
    this.massRate = 0.001;
    this.startTime = game.time.elapsedSince(0);
    this.onGravityChange = onGravityChange;

    /*var center = this.game.add.sprite(game.width / 2, game.height /
      2, undefined, undefined, this.group);
    center.visible = false;
    game.physics.p2.enable(center);
    center.body.setCircle(20);
    center.body.static = true;*/
    this.running = true;
  },
  update: function update() {
    if(!this.running) {
      return;
    }
    var center = new Phaser.Point(this.game.width / 2, this.game.height /
      2);
    var deltaTime = this.game.time.elapsedSince(this.startTime);
    var mass = this.initialMass + this.massRate * deltaTime;
    for(i = 0; i < this.joints.length; i++) {
      this.joints[i].update(center, mass);
    }
    var connections = this.connections.slice();
    for(i = 0; i < connections.length; i++) {
      connections[i].update();
    }
    this.onGravityChange.dispatch(mass);

    var goalReached = false;
    var pos1 = [this.game.width / 2, this.game.height / 2];
    for(var i = 0; i < this.joints.length; i++) {
      var pos2 = [this.joints[i].getPosition().x, this.joints[i].getPosition().y];
      if(util.dist(pos1, pos2) > GOAL_HEIGHT) {
        goalReached = true;
      }
    }
    if(!goalReached) {
      //this.running = false;
      //this.game.physics.p2.paused = true;
    }
  },
  kill: function kill() {
    this.updateBinding.detach();
    var joints = this.joints.slice();
    for(var i = 0; i < joints.length; i++) {
      joints[i].kill();
    }
    this.group.destroy();
  }
});

var PhysicalJoint = util.extend(common.Joint, 'PhysicalJoint', {
  constructor: function PhysicalJoint(world, game, x, y) {
    this.constructor$Joint(game, x, y);
    //game.physics.p2.enable(this.sprite);
    //this.sprite.body.fixedRotation = true;
    //this.sprite.body.setCircle(5);
    //this.sprite.body.mass = 1;
    this.world = world;
    this.velocity = new Phaser.Point(0, 0);
  },
  update: function update(gravityCenter, gravityMass) {
    var m1 = 1;
    var m2 = gravityMass;
    //var r = util.dist([this.getPosition().x, this.getPosition().y], [
    //  gravityCenter.x, gravityCenter.y
    //]);
    //r = Math.max(MIN_R, r);
    var r = 10;
    var magnitude = GRAVITY * m1 * m2 / Math.pow(r, 2);
    var unit = Phaser.Point.normalize(Phaser.Point.subtract(this.getPosition(),
      gravityCenter));
    var force = Phaser.Point.multiply(unit, new Phaser.Point(
      magnitude, magnitude));
    this.sprite.position.x -= force.x;
    this.sprite.position.y -= force.y;

    //this.sprite.position.x += this.velocity.x;
    //this.sprite.position.y += this.velocity.y;
  },
  removeConnection: function removeConnection(connection) {
    this.removeConnection$ConnectionContainer(connection);
    if(this.connections.length === 0) {
      this.world.removeJoint(this);
    }
  }
});

var PhysicalConnection = util.extend(common.Connection,
  'PhysicalConnection', {
    constructor: function PhysicalConnection(world, physics,
      customTexture,
      joint1, joint2, onRender) {
      this.physics = physics;
      this.constraint = null;
      this.distance = null;
      this.constructor$Connection(world, customTexture, joint1,
        joint2, onRender);
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
        this.distance = this.getJointDist();
        /*this.constraint = this.physics.createDistanceConstraint(this.joint1
          .sprite, this.joint2.sprite, this.distance, undefined,
          undefined, MAX_FORCE);*/
      }
    },
    getJointDist: function getJointDist() {
      var pos1 = this.joint1.getPosition();
      var pos2 = this.joint2.getPosition();
      return util.dist([pos1.x, pos1.y], [pos2.x, pos2.y]);
    },
    update: function update() {
      var delta_d = this.getJointDist() - this.distance;
      if(Math.abs(delta_d) > DIST_THRESHOLD) {
        this.kill();
      }
      //bring the joints together
      var pos1 = this.joint1.getPosition();
      var pos2 = this.joint2.getPosition();
      var theta = util.angle([pos1.x, pos1.y], [pos2.x, pos2.y]);
      var change = [
        Math.sin(theta) * delta_d / 2,
        Math.cos(theta) * delta_d / 2
      ];
      this.joint1.sprite.position.x -= change[0];
      this.joint1.sprite.position.y -= change[1];
      this.joint2.sprite.position.x += change[0];
      this.joint2.sprite.position.y += change[1];
      if(Math.abs(this.getJointDist() - this.distance) > 10) {
        var errored = true;
      }

      //console.log(this.getJointDist() - this.distance);
    }
  });

export {
  PhysicalJoint,
  PhysicalConnection,
  PhysicalWorld
};