(function() {

  function main() {
    var context = document.getElementById('display').getContext('2d');
    
    var points = {
      points: [
        createPoint([100, 200]),
        createPoint([200, 100])
      ],
      dist: null
    };
    
    points.dist = dist(points.points[0].position, points.points[1].position);
    update(context, points)
  }
  
  function createPoint(position) {
    return {
      velocity: [0, 0],
      position: position,
      dist: null,
    }
  }
  
  function dist(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }
  
  function angle(a, b) {
    return Math.atan2(a[1] - b[1], a[0] - b[0]);
  }
  
  function update(context, points) {
    simulate(points, context)
    render(context, points);
    setInterval(function() {
      update(context, points)
    }, 1000/20);
  }
  
  function simulate(points, context) {
    var point;
    //gravity
    for(var i=0; i<points.points.length; i++) {
      points.points[i].velocity[1] += 0.001;
    }
    
    //move by velocity
    for(var i=0; i<points.points.length; i++) {   
      point = points.points[i];
      point.position[0] += point.velocity[0];
      point.position[1] += point.velocity[1];
    }
    
    //collide with floor
    for(var i=0; i<points.points.length; i++) {
      point = points.points[i] 
      if(point.position[1] > 480) {
        point.position[1] = 480;
        point.velocity[1] = 480;
      }
    }
    
    //make solid
    var delta_d = dist(points.points[0].position, points.points[1].position) - points.dist;
    var theta = angle(points.points[0].position, points.points[1].position);
    var change = [
      Math.sin(theta) * delta_d / 2,
      Math.cos(theta) * delta_d / 2
    ];
    
    if(Math.abs(change[1]) > 1) {
      var pause = true;
    }
    
    points.points[0].position[0] += change[0] * (points.points[0].position[0] < points.points[1].position[0] ? -1 : 1);
    points.points[0].position[1] += change[1] * (points.points[0].position[1] < points.points[1].position[1] ? -1 : 1);
    points.points[1].position[0] += change[0] * (points.points[1].position[0] < points.points[0].position[0] ? -1 : 1);
    points.points[1].position[1] += change[1] * (points.points[1].position[1] < points.points[0].position[1] ? -1 : 1);
  }
  
  function render(context, points) {
    context.save();
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 640, 480);
    context.fillStyle = '#000000';
    var position;
    for(var i=0; i<points.points.length; i++) {
      context.beginPath();
      position = points.points[i].position;
      context.arc(position[0], position[1], 5, 0, 2 * Math.PI);
      context.fill();
    }
    
    context.strokeStyle = '#000000';
    context.beginPath();
    position = points.points[0].position;
    context.moveTo(position[0], position[1]);
    for(var i=1; i<points.points.length; i++) {
      position = points.points[i].position;
      context.lineTo(position[0], position[1])
    }
    context.stroke();

    context.restore();
  }
  
  document.addEventListener('DOMContentLoaded', main);
})();