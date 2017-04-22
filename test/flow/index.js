(function() {
  var WIDTH = 640;
  var HEIGHT = 480;
  var MAX_POTENTIAL = 1000;
  
  function main() {
    var context = document.getElementById('display').getContext('2d');
    var field = new Uint16Array(WIDTH * HEIGHT);
    for(var i=0; i<field.length; i++) {
      field[i] = MAX_POTENTIAL;
    }
    update(context, field);
  }
  
  function update(context, field) {
    field = simulate(field);
    render(context, field);
    requestAnimationFrame(update.bind(null, context, field));
  }
  
  function simulate(oldField) {
    var newField = new Uint16Array(WIDTH * HEIGHT);
    var index = 0;
    for(var y=0; y<HEIGHT; y++) {
      for(var x=0; x<WIDTH; x++) {
        if(x === 300 && y === 300) {
          newField[index++] = 0;
        } else {
          var left  = x === 0           ? Infinity : oldField[index - 1];
          var right = x === WIDTH - 1   ? Infinity : oldField[index + 1];
          var up    = y === 0           ? Infinity : oldField[index - WIDTH];
          var down  = y === HEIGHT - 1  ? Infinity : oldField[index + WIDTH];
          var lowest;
          if(left <= right && left <= up && left <= down) {
            lowest = left;
          } else if(right <= left && right <= up && right <= down) {
            lowest = right;
          } else if(up <= left && up <= right && up <= down) {
            lowest = up;
          } else if(down <= left && down <= right && down <= up){
            lowest = down;
          } else {
            lowest = MAX_POTENTIAL - 1;
          }
          newField[index++] = lowest + 1;
        }
      }
    }
    return newField;
  }
  
  function render(context, field) {
    var fieldIndex = 0;
    var imageIndex = 0;
    var imageData = context.getImageData(0, 0, WIDTH, HEIGHT);
    for(var y=0; y<HEIGHT; y++) {
      for(var x=0; x<WIDTH; x++) {
        var color = field[fieldIndex++];
        imageData.data[imageIndex++] = color;
        imageData.data[imageIndex++] = color;
        imageData.data[imageIndex++] = color;
        imageData.data[imageIndex++] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);
  }
  
  document.addEventListener("DOMContentLoaded", main);
})();