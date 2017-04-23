base.registerModule('common', function() {
  var util = base.importModule('util');

  var ConnectionContainer = util.extend(Object, 'ConnectionContainer', {
    constructor: function ConnectionContainer() {
      this.connections = [];
    },
    addConnection: function addConnection(connection) {
      this.connections.push(connection);
    },
    removeConnection: function removeConnection(connection) {
      if(this.connections.indexOf(connection) !== -1) {
        this.connections.splice(this.connections.indexOf(connection),
          1);
      }
    }
  });

  /**
   * connection endpoints
   **/
  var Connectable = util.extend(ConnectionContainer, 'Connectable', {
    constructor: function Connectable() {
      this.constructor$ConnectionContainer();
    },
    getPosition: function getPosition() {
      throw(new Error('abstract method'));
    },
    addConnection: function addConnection(connection) {},
    removeConnection: function removeConnection(connection,
      killConnection) {}
  });

  var World = util.extend(ConnectionContainer, 'World', {
    constructor: function World(game) {
      this.constructor$ConnectionContainer();
      this.game = game;
      this.group = this.game.add.group();
      this.joints = [];
    },
    addJoint: function(joint) {
      this.joints.push(joint);
      this.group.add(joint.sprite);
    },
    removeJoint: function removeJoint(joint) {
      joint.kill();
      if(this.joints.indexOf(joint) !== -1) {
        this.joints.splice(this.joints.indexOf(joint), 1);
      }
    },
    removeConnection: function removeConnection(connection) {
      connection.kill();
      this.removeConnection$ConnectionContainer();
    }
  });

  var Joint = util.extend(ConnectionContainer, 'Joint', {
    constructor: function Joint(game, x, y) {
      this.constructor$ConnectionContainer();
      this.sprite = game.make.sprite(x, y, 'image/joint');
      this.sprite.anchor.setTo(0.5, 0.5);
      this.radius = 5;
    },
    kill: function kill() {
      this.sprite.kill();
      var connections = this.connections.slice();
      for(var i = 0; i < connections.length; i++) {
        connections[i].kill();
      }
    },
    getPosition: function getPosition() {
      return this.sprite.position;
    }
  });

  var Connection = util.extend(Object, 'Connection', {
    constructor: function Connection(world, customTexture, joint1,
      joint2,
      onRender) {
      //joint 1 and 2 are position, not necessarily joints
      this.world = world;
      this.customTexture = customTexture;
      this.setJoint1(joint1);
      this.setJoint2(joint2);
      this.renderBinding = onRender.add(this.render.bind(this));
      this.width = 3;
    },
    setJoint1: function setJoint1(joint) {
      if(this.joint1) {
        this.joint1.removeConnection(this);
      }
      this.joint1 = joint;
      this.joint1.addConnection(this);
    },
    setJoint2: function setJoint2(joint) {
      if(this.joint2) {
        this.joint2.removeConnection(this);
      }
      this.joint2 = joint;
      this.joint2.addConnection(this);
    },
    render: function render() {
      var context = this.customTexture.texture.context;
      context.save();
      context.strokeStyle = '#000000';
      context.lineWidth = this.width;
      context.beginPath();
      context.moveTo(this.joint1.getPosition().x, this.joint1.getPosition()
        .y);
      context.lineTo(this.joint2.getPosition().x, this.joint2.getPosition()
        .y);
      context.stroke();
      context.restore();
      this.customTexture.texture.dirty = true;
    },
    kill: function kill() {
      this.renderBinding.detach();
      this.joint1.removeConnection(this);
      this.joint2.removeConnection(this);
      this.world.removeConnection$ConnectionContainer(this);
    }
  });

  return {
    Connectable: Connectable,
    World: World,
    Joint: Joint,
    Connection: Connection
  };
});