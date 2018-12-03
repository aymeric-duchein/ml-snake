const canvasSize = 600;
const pixelSize = 12;
const populationSize = 100;
let population;
let generation = 0;
let applePos;
let gridSize;

const initState = {
    dir : 'right',
    snake: [{
        x: 10,
        y: 10
    },{
        x: 10,
        y: 9
    },{
        x: 10,
        y: 8
    }],
    score: 0,
    nbApple: 0,
    alive: 250
};
function setup() {
    frameRate(50000);
    gridSize = floor(canvasSize / pixelSize);
    createCanvas(canvasSize, canvasSize);
    applePos = Array(gridSize * gridSize).fill(0).map(a => ({
        x: floor(random(gridSize)),
        y: floor(random(gridSize))
    }));
    population = Array(populationSize).fill(0).map((_, i) => {
        return {
            nn: new NeuralNetwork(5,30,4),
            ...initState,
            z: i,
            r: floor(random(255)),
            g: floor(random(255)),
            b: floor(random(255)),
            apple: createNewApple(0)
        }
    });
}

function draw() {
    background(120);
    /*stroke(0);
    for (let i = 0; i < gridSize + 1; i++) {
        line(i * pixelSize, 0, i * pixelSize, pixelSize * gridSize);
        line(0, i * pixelSize, pixelSize * gridSize, i * pixelSize);
    }*/
    population.forEach(pop => {

        if (pop.alive > 0) {
            drawApple(pop.apple.x, pop.apple.y);
            let nn_inputs = Array(5).fill(0);
            nn_inputs[0] = isSnake(pop.snake[0].x - 1,pop.snake[0].y,pop.snake)? -1:1;
            nn_inputs[1] = isSnake(pop.snake[0].x + 1,pop.snake[0].y,pop.snake)? -1:1;
            nn_inputs[2] = isSnake(pop.snake[0].x,pop.snake[0].y - 1,pop.snake)? -1:1;
            nn_inputs[3] = isSnake(pop.snake[0].x,pop.snake[0].y + 1,pop.snake)? -1:1;
            nn_inputs[4] = appleAngle(pop.snake[0].x,pop.snake[0].y, pop.apple.x, pop.apple.y);
            let prediction = pop.nn.predict(nn_inputs);
            let sortedPrediction = prediction.map((p,i) => ({prediction:p, index: i})).sort((p1,p2) => p2.prediction - p1.prediction);
            switch (sortedPrediction[0].index) {
                case 0:
                    pop.dir = 'left';
                    break;
                case 1:
                    pop.dir = 'right';
                    break;
                case 2:
                    pop.dir = 'up';
                    break;
                case 3:
                    pop.dir = 'down';
                    break;
            }
            let lastSnakePart = pop.snake[pop.snake.length - 1];
            pop.snake = moveSnake(pop.snake, pop.dir);

            if (pop.snake[0].x === pop.apple.x && pop.snake[0].y === pop.apple.y) {
                pop.snake = [...pop.snake, lastSnakePart];
                pop.nbApple++;
                pop.apple = createNewApple(pop.nbApple);
                pop.score+=1000;
                pop.alive+=250;
            }
            pop.alive--;
            pop.score++;
            if (isInSnake(pop.snake) || pop.snake[0].x < 0 || pop.snake[0].x >= gridSize || pop.snake[0].y < 0 || pop.snake[0].y >= gridSize) {
                pop.alive = 0;
                // reset();
            }

        pop.snake.forEach(s => drawSnakePart(s.x, s.y,pop.r, pop.g, pop.b));
        }

    });

    if (!population.some(pop => pop.alive > 0)) {
        population = population.sort((p1, p2) => p2.score - p1.score);
        let best = population[0];
        console.log('best score for generation ' + generation++ + ': ' + best.score +',' + best.nbApple);
        console.log({s: best.nn.serialize()});
        let bestChildren = Array(populationSize).fill(0).map((_, i) => {
            return {
                nn: new NeuralNetwork(best.nn),
                ...initState,
                apple: createNewApple(0),
                r: floor(random(255)),
                g: floor(random(255)),
                b: floor(random(255)),
            }
        });
        bestChildren.forEach(c => c.nn.mutate(mutate));
        let secondBestChildren = Array(populationSize).fill(0).map(_ => {
            return {
                nn: new NeuralNetwork(population[1].nn),
                ...initState,
                apple: createNewApple(0),
                r: floor(random(255)),
                g: floor(random(255)),
                b: floor(random(255)),
            }
        });
        let randomChildren = Array(populationSize).fill(0).map(_ => {
            return {
                nn: new NeuralNetwork(5,30,4),
                ...initState,
                apple: createNewApple(0),
                r: floor(random(255)),
                g: floor(random(255)),
                b: floor(random(255)),
            }
        });
        secondBestChildren.forEach(c => c.nn.mutate(mutate));
        population = [{
                nn: new NeuralNetwork(best.nn),
                ...initState,
                apple: createNewApple(0),
                r: best.r,
                g: best.g,
                b: best.b,
            },
            ...bestChildren,
            ...secondBestChildren,
            ...randomChildren
        ];
    }
}

const moveSnake = (snake, direction) => {
    let newSnake;
    switch (direction) {
        case 'left':
            newSnake = [{
                x: snake[0].x - 1,
                y: snake[0].y
            }, ...snake.filter((p, i) => i < snake.length - 1)];
            break;
        case 'right':
            newSnake = [{
                x: snake[0].x + 1,
                y: snake[0].y
            }, ...snake.filter((p, i) => i < snake.length - 1)];
            break;
        case 'up':
            newSnake = [{
                x: snake[0].x,
                y: snake[0].y - 1,
            }, ...snake.filter((p, i) => i < snake.length - 1)];
            break;
        case 'down':
            newSnake = [{
                x: snake[0].x,
                y: snake[0].y + 1,
            }, ...snake.filter((p, i) => i < snake.length - 1)];
            break;
    }
    return newSnake;
};


const createNewApple = (i) => applePos[i];
const isSnake = (x,y,snake) => {
    return snake.some(p => p.x === x && p.y === y) || x < 0 || x >= gridSize || y < 0 || y >= gridSize;
};
const appleAngle = (x,y,ax,ay) => {
    const dx = ax - x;
    const dy = ay - y;
    if (dx < 0) {
        if(dy <0 ){
            return -0.75;
        } else if (dy > 0) {
            return -0.25;
        } else {
            return -0.5;
        }
    } else if (dx > 0) {
        if(dy <0 ){
            return 0.75;
        } else if (dy > 0) {
            return 0.25;
        } else {
            return 0.5;
        }
    } else {
        if(dy <0 ){
            return 1;
        } else if (dy > 0) {
            return 0;
        } else {
            return 0;
        }
    }
};
const isInSnake = (snake) => {

    return snake.some((part, index, arr) => index > 0 && arr[0].x === part.x && arr[0].y === part.y);
};

const drawSnakePart = (x, y,r,g,b) => {
    fill(r,g,b);
    stroke(r,g,b);
    rect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
};

const drawApple = (x, y) => {
    fill(255, 0, 0);
    stroke(12);
    rect(x * pixelSize + 2, y * pixelSize + 2, pixelSize - 4, pixelSize - 4, pixelSize / 2);
};

function mutate(x) {
    if (random(1) < 0.1) {
        let offset = randomGaussian() * 0.5;
        let newx = x + offset;
        return newx;
    } else {
        return x;
    }
}