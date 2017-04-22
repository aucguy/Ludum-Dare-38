(function() {

  function main() {
    var context = document.getElementById('display').getContext('2d');
    
    var points = [
      createPoint([100, 100]),
      createPoint([200, 200]),
      createPoint([200, 100])
    ];
    
    for(var i=0; i<points.length; i++) {
      var here = points[i];
      var next = points[(i + 1) % points.length];
      var last = points[(i + points.length + 1) % points.length];
      here.nextDist = dist(here.position, next.position);
      here.nextAngle = angle(last.position, next.position);
    }
    
    update(context, points)
  }
  
  function createPoint(position) {
    return {
      velocity: [0, 0],
      position: position,
      nextDist: null,
      nextAngle: null
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
    for(var i=0; i<points.length; i++) {
      var here = points[i];
      var next = points[(i + 1) % points.length];
      var last = points[(i + points.length - 1) % points.length];
      
      here.velocity[1] += 0.001;
      
      var angleWithLast = angle(last.position, here.position);
      var targetAngle = angleWithLast + here.nextAngle;
      var target = [
        Math.cos(targetAngle) * here.nextDist + here.position[0],
        Math.sin(targetAngle) * here.nextDist + here.position[1]
      ];
      console.log(Math.cos(targetAngle) * here.nextDist + here.position[0]);
      
      context.save();
      context.fillStyle = '#FF0000';
      context.beginPath();
      context.arc(target[0], target[1], 10, 0, 2 * Math.PI);
      context.fill();
      context.restore();
      
      next.position[0] += (target[0] - next.position[0]) / 1000;
      next.position[1] += (target[1] - next.position[1]) / 1000;
    }
    
    for(var i=0; i<points.length; i++) {      
      points[i].position[0] += points[i].velocity[0];
      points[i].position[1] += points[i].velocity[1];
    }
    
    for(var i=0; i<points.length; i++) {
      if(points[i].position[1] > 480) {
        points[i].position[1] = 480;
        points[i].velocity[1] = 480;
      }
    }
  }
  
  function render(context, points) {
    context.save();
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 640, 480);
    context.fillStyle = '#000000';
    var position;
    for(var i=0; i<points.length; i++) {
      context.beginPath();
      position = points[i].position;
      context.arc(position[0], position[1], 5, 0, 2 * Math.PI);
      context.fill();
    }
    
    context.strokeStyle = '#000000';
    context.beginPath();
    position = points[points.length - 1].position;
    context.moveTo(position[0], position[1]);
    for(var i=0; i<points.length; i++) {
      position = points[i].position;
      context.lineTo(position[0], position[1])
    }
    context.stroke();

    context.restore();
  }
  
  document.addEventListener('DOMContentLoaded', main);
})();