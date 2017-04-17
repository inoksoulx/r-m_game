var requestAnimFrame = (function(){
  return window.requestAnimationFrame       ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame    ||
         window.oRequestAnimationFrame      ||
         window.msRequestAnimationFrame     ||
         function(callback){
            window.setTimeout(callback, 1000 / 60);
         };
})();

var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 960;
canvas.height = 600;
document.body.appendChild(canvas);



var lastTime;
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000.0;

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
};

function init() {
  terrainPattern = ctx.createPattern(resources.get('img/background.png'), 'repeat');
  document.getElementById('play-again').addEventListener('click', function() {
      reset();
  });

  reset();
  lastTime = Date.now();
  main();
}

resources.load([
  'img/background.png',
  'img/rick.png',
  'img/morty.png',
  'img/blood.png',
  'img/bullet.png',
  'img/items.png',
]);

resources.onReady(init);

var currentHS = localStorage.getItem('HIGHSCORE');

var player = {
  pos: [0, 0],
  sprite: new Sprite('img/rick.png', [517, 507], [88, 88], 0, [0, 0])
};

var bullets = [];
var enemies = [];
var explosions = [];
var health = [];

var lastFire = Date.now();
var gameTime = 0;
var isGameOver;
var terrainPattern;

var score = 0;
var highScore = 0;
var lifes = 3;
var scoreEl = document.getElementById('score');
var highScoreEl = document.getElementById('high-score');
var lifesEl = document.getElementById('lifes');


var playerSpeed = 200;
var bulletSpeed = 600;
var enemySpeed = 100;



function update(dt) {
  gameTime += dt;

  var time = Math.round(Math.random() * 1000 + gameTime);
  console.log(time)
  handleInput(dt);
  updateEntities(dt);

    if(Math.random() < 1 - Math.pow(.998, gameTime)) {
      enemies.push({
          pos: [canvas.width,
                Math.random() * (canvas.height - 150)],
          sprite: new Sprite('img/morty.png', [3, 688], [125, 130],
                             6, [0, 1, 2, 3, 2, 1])
      });
    }

    if (Math.round(gameTime) === time) {
      health.push({
        pos: [Math.random() * canvas.width,
              Math.random() * (canvas.height - 150)],
        sprite: new Sprite('img/items.png', [97, 170], [20, 21],
                           null, null)
      })
      console.log('PAU')
    }

  checkCollisions();

  scoreEl.innerHTML = 'Score: ' + score;
  highScoreEl.innerHTML = 'High score: ' + currentHS;
  lifesEl.innerHTML = 'Lifes: ' + lifes;
};

function handleInput(dt) {
  if(input.isDown('DOWN') || input.isDown('s')) {
    player.pos[1] += playerSpeed * dt;
  }

  if(input.isDown('UP') || input.isDown('w')) {
    player.pos[1] -= playerSpeed * dt;
  }

  if(input.isDown('LEFT') || input.isDown('a')) {
    player.pos[0] -= playerSpeed * dt;
  }

  if(input.isDown('RIGHT') || input.isDown('d')) {
    player.pos[0] += playerSpeed * dt;
  }

  if(input.isDown('SPACE') &&
     !isGameOver &&
     Date.now() - lastFire > 120) {
      var x = player.pos[0] + player.sprite.size[0] / 2;
      var y = player.pos[1] + player.sprite.size[1] / 2;

      bullets.push({ pos: [x, y],
                     sprite: new Sprite('img/bullet.png', [0, 8], [23, 14], 1, [0, 1, 2], null, true) });

      lastFire = Date.now();
  }
}

function updateEntities(dt) {
  player.sprite.update(dt);

  for(var i=0; i<bullets.length; i++) {
      var bullet = bullets[i];
      bullet.sprite.update(dt);
      bullet.pos[0] += bulletSpeed * dt;

      if(bullet.pos[1] < 0 || bullet.pos[1] > canvas.height ||
         bullet.pos[0] > canvas.width) {
          bullets.splice(i, 1);
          i--;
      }
  }

  for(var i=0; i<enemies.length; i++) {
    enemies[i].pos[0] -= enemySpeed * dt;
    enemies[i].sprite.update(dt);

    if(enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
        enemies.splice(i, 1);
        i--;
        if (lifes > 0) {
          lifes--;
        }
    }
    if (lifes <= 0) {
      gameOver();
    }
  }

  for(var i=0; i<explosions.length; i++) {
    explosions[i].sprite.update(dt);

    if(explosions[i].sprite.done) {
        explosions.splice(i, 1);
        i--;
    }
  }
}


function collides(x, y, r, b, x2, y2, r2, b2) {
  return !(r <= x2 || x > r2 ||
           b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
  return collides(pos[0], pos[1],
                  pos[0] + size[0], pos[1] + size[1],
                  pos2[0], pos2[1],
                  pos2[0] + size2[0], pos2[1] + size2[1]);
}

var highScoreDate = [];

function checkCollisions() {
  checkPlayerBounds();
  checkColEnemies();
  checkColHealth();

  for(var i=0; i<enemies.length; i++) {
      var pos = enemies[i].pos;
      var size = enemies[i].sprite.size;

      for(var j=0; j<bullets.length; j++) {
        var pos2 = bullets[j].pos;
        var size2 = bullets[j].sprite.size;

        if(boxCollides(pos, size, pos2, size2)) {
            enemies.splice(i, 1);
            i--;

            score += 1;
            if(highScoreDate.length < score){
              highScoreDate.push(score);
            }

            explosions.push({
                pos: pos,
                sprite: new Sprite('img/blood.png',
                                   [0, 256],
                                   [122, 367],
                                   19,
                                   [0, 1, 2, 3],
                                   null,
                                   true)
            });

            bullets.splice(j, 1);
            break;
        }
      }
  }
}

function checkColEnemies(){
  for(var i=0; i<enemies.length; i++) {
      var pos = enemies[i].pos;
      var size = enemies[i].sprite.size;
      var pos2 = player.pos;
      var size2 = player.sprite.size;

      if(boxCollides(pos, size, pos2, size2)) {
          enemies.splice(i, 1);
          i--;
          if (lifes > 0) {
            lifes--;
          }
        }
      }
}

function checkColHealth(){
  for(var i=0; i<health.length; i++) {
      var pos = health[i].pos;
      var size = health[i].sprite.size;
      var pos2 = player.pos;
      var size2 = player.sprite.size;

      if(boxCollides(pos, size, pos2, size2)) {
          health.splice(i, 1);

          if (lifes > 0) {
            lifes++;
          }
        }
      }
}

function checkPlayerBounds() {
  if(player.pos[0] < 0) {
      player.pos[0] = 0;
  }
  else if(player.pos[0] > canvas.width - player.sprite.size[0]) {
      player.pos[0] = canvas.width - player.sprite.size[0];
  }

  if(player.pos[1] < 0) {
      player.pos[1] = 0;
  }
  else if(player.pos[1] > canvas.height - player.sprite.size[1]) {
      player.pos[1] = canvas.height - player.sprite.size[1];
  }
}

function render() {
  ctx.fillStyle = terrainPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(!isGameOver) {
      renderEntity(player);
      renderEntities(bullets);
      renderEntities(enemies);
      renderEntities(explosions);
      renderEntities(health);
  }
};

function renderEntities(list) {
  for(var i=0; i<list.length; i++) {
      renderEntity(list[i]);
  }
}

function renderEntity(entity) {
  ctx.save();
  ctx.translate(entity.pos[0], entity.pos[1]);
  entity.sprite.render(ctx);
  ctx.restore();
}

function gameOver() {
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('game-over-overlay').style.display = 'block';
  isGameOver = true;

  localStorage.setItem('HIGHSCORE', highScoreDate.length);
}

function reset() {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('game-over-overlay').style.display = 'none';
  isGameOver = false;
  gameTime = 0;
  score = 0;
  lifes = 3;

  enemies = [];
  bullets = [];
  health = [];

  player.pos = [50, canvas.height / 2];
};
