const canvas = document.getElementById('game');
const context = canvas.getContext('2d');

const grid = 48;
const gridGap = 10;


class Sprite {
    constructor(props) {
        Object.assign(this, props);
    }
    render() {
        context.fillStyle = this.color;

        // draw a rectangle sprite
        if (this.shape === 'rect') {
            context.fillRect(this.x, this.y + gridGap / 2, this.size, grid - gridGap);
        }
        else {
            context.beginPath();
            context.arc(
                this.x + this.size / 2, this.y + this.size / 2,
                this.size / 2 - gridGap / 2, 0, 2 * Math.PI
            );
            context.fill();
        }
    }
}

const frogger = new Sprite({
  x: grid * 6,
  y: grid * 14,
  color: 'greenyellow',
  size: grid,
  shape: 'circle'
});
const scoredFroggers = [];

const patterns = [
  // end bank is safe
  null,

  // old log one
  {
    spacing: [2],      
    color: 'saddlebrown',  
    size: grid * 4,    
    shape: 'rect',     
    speed: 0.75,        
  },

  // new log one 
  {
    spacing: [0, 2, 0, 2, 0, 2],
    color: 'brown',
    size: grid,
    shape: 'rect',
    speed: -0.5,
  },

  // old log two
  {
    spacing: [2],
    color: 'saddlebrown',
    size: grid * 3,
    shape: 'rect',
    speed: 1.5,
  },

  // log four
  {
    spacing: [3],
    color: 'brown',
    size: grid * 2,
    shape: 'rect',
    speed: 0.5,
  },

  // log five
  {
    spacing: [2, 2],
    color: 'saddlebrown',
    size: grid * 2,
    shape: 'rect',
    speed: -0.5,
  },

  // beach is safe
  null,

  // White truck
  {
    spacing: [3,8],
    color: '#c2c4da',
    size: grid * 2,
    shape: 'rect',
    speed: -2
  },

  // Speeding car
  {
    spacing: [14],
    color: '#c2c4da',
    size: grid,
    shape: 'rect',
    speed: 4
  },

  // car 1
  {
    spacing: [3,3,7],
    color: '#de3cdd',
    size: grid,
    shape: 'rect',
    speed: -1.5
  },

  // car 2
  {
    spacing: [3,3,7],
    color: '#0bcb00',
    size: grid,
    shape: 'rect',
    speed: 1.5
  },

  // car 3
  {
    spacing: [4],
    color: '#e5e401',
    size: grid,
    shape: 'rect',
    speed: -1
  },

  // start zone is safe
  null
];

// rows holds all the sprites for that row
const rows = [];
for (let i = 0; i < patterns.length; i++) {
  rows[i] = [];

  let x = 0;
  let index = 0;
  const pattern = patterns[i];

  // skip empty patterns (safe zones)
  if (!pattern) {
    continue;
  }

  // allow there to be 1 extra pattern offscreen so the loop is seamless
  let totalPatternWidth =
    pattern.spacing.reduce((acc, space) => acc + space, 0) * grid +
    pattern.spacing.length * pattern.size;
  let endX = 0;
  while (endX < canvas.width) {
    endX += totalPatternWidth;
  }
  endX += totalPatternWidth;

  // populate the row with sprites
  while (x < endX) {
    rows[i].push(new Sprite({
      x,
      y: grid * (i + 1),
      index,
      ...pattern
    }));

    // move the next sprite over according to the spacing
    const spacing = pattern.spacing;
    x += pattern.size + spacing[index] * grid;
    index = (index + 1) % spacing.length;
  }
}

// animation loop
function loop() {
  requestAnimationFrame(loop);
  context.clearRect(0,0,canvas.width,canvas.height);

  // drawing the water
  context.fillStyle = "aqua";
  context.fillRect(0, grid, canvas.width, grid * 6);

  // drawing the sandy beach
  context.fillStyle = 'tan';
  context.fillRect(0, grid, canvas.width, grid);
  

  // smaller sidewalk
  context.fillStyle = 'grey';
  context.fillRect(0, 7 * grid, canvas.width, grid);

  // starting at sidewalk
  context.fillRect(0, canvas.height - grid * 2, canvas.width, grid * 2);

  // update & draw obstacles
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    for (let i = 0; i < row.length; i++) {
      const sprite = row[i]
      sprite.x += sprite.speed;
      sprite.render();

      // loop sprite around the screen
      // sprite is moving to the left and goes offscreen
      if (sprite.speed < 0 && sprite.x < 0 - sprite.size) {

        // find the rightmost sprite
        let rightMostSprite = sprite;
        for (let j = 0; j < row.length; j++) {
          if (row[j].x > rightMostSprite.x) {
            rightMostSprite = row[j];
          }
        }

        // move the sprite to the next spot in the pattern so it continues
        const spacing = patterns[r].spacing;
        sprite.x =
          rightMostSprite.x + rightMostSprite.size +
          spacing[rightMostSprite.index] * grid;
        sprite.index = (rightMostSprite.index + 1) % spacing.length;
      }

      // sprite is moving to the right and goes offscreen
      if (sprite.speed > 0 && sprite.x > canvas.width) {

        // find the leftmost sprite
        let leftMostSprite = sprite;
        for (let j = 0; j < row.length; j++) {
          if (row[j].x < leftMostSprite.x) {
            leftMostSprite = row[j];
          }
        }

        // move the sprite to the next spot in the pattern so it continues
        const spacing = patterns[r].spacing;
        let index = leftMostSprite.index - 1;
        index = index >= 0 ? index : spacing.length - 1;
        sprite.x = leftMostSprite.x - spacing[index] * grid - sprite.size;
        sprite.index = index;
      }
    }
  }

  // draw frogger
  frogger.x += frogger.speed || 0;
  frogger.render();

  scoredFroggers.forEach(frog => frog.render());

  // check for collision with all sprites in the same row as frogger
  const froggerRow = frogger.y / grid - 1 | 0;
  let collision = false;
  for (let i = 0; i < rows[froggerRow].length; i++) {
    let sprite = rows[froggerRow][i];

    // axis-aligned bounding box (AABB) collision check
    if (frogger.x < sprite.x + sprite.size - gridGap &&
        frogger.x + grid - gridGap > sprite.x &&
        frogger.y < sprite.y + grid &&
        frogger.y + grid > sprite.y) {
      collision = true;

      // reset frogger if got hit by car
      if (froggerRow > rows.length / 2) {
        frogger.x = grid * 6;
        frogger.y = grid * 14;
      }
      // move frogger along with obstacle
      else {
        frogger.speed = sprite.speed;
      }
    }
  }

  if (!collision) {
    // if fogger isn't colliding reset speed
    frogger.speed = 0;

    // frogger got to the beach (goal every 3 cols)
    const col = (frogger.x + grid) / grid | 0;
    if (froggerRow === 0 && col  === 0 &&
        // check to see if there isn't a scored frog already there
        !scoredFroggers.find(frog => frog.x === col * grid)) {
      scoredFroggers.push(new Sprite({
        ...frogger,
        x: col * grid,
        y: frogger.y + 5
      }));
    }

    // reset frogger if not on obstacle in river
    if (froggerRow < rows.length / 2 - 1) {
      frogger.x = grid * 6;
      frogger.y = grid * 13;
    }
  }
}

// listen to keyboard events to move frogger
document.addEventListener('keydown', function(e) {
  // left arrow key
  if (e.which === 37) {
    frogger.x -= grid;
  }
  // right arrow key
  else if (e.which === 39) {
    frogger.x += grid;
  }

  // up arrow key
  else if (e.which === 38) {
    frogger.y -= grid;
  }
  // down arrow key
  else if (e.which === 40) {
    frogger.y += grid;
  }

  // clamp frogger position to stay on screen
  frogger.x = Math.min( Math.max(0, frogger.x), canvas.width - grid);
  frogger.y = Math.min( Math.max(grid, frogger.y), canvas.height - grid * 2);
});

// start the game
requestAnimationFrame(loop);
