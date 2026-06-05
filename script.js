let rows;
let columns;
let bombs = [];
let bombNum;
let flags = [];
let hearts = [];
let eyes = [];
let keys = [];
let coinTiles = [];
let isFirstClick = true;
let canClickButton = true;
let flagMode = false;
let currentLife;
let maxLife = 3;
let resistedBombs = 0;
let coins = 0;
let clickedBombs = [];
let pickedPickups = [];
let wallTiles = [];
let lockedTiles = [];

document.addEventListener('keydown', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (!flagMode && event.shiftKey) {
        toggleButton.classList.replace('button_toggle', 'button_toggle_active')
        flagMode = true;
    }
    if (event.key == "r") {
        resetGame();
    }
})
document.addEventListener('keyup', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (flagMode && !event.shiftKey) {
        toggleButton.classList.replace('button_toggle_active', 'button_toggle')
        flagMode = false;
    }
})

function getButtonID(x, y) {
    let id = y*columns+x;
    return !wallTiles.includes(id) && x < columns && y < rows && x >= 0 && y >= 0 
    ? id : NaN;}
function getButtonX(id) {return id%columns;}
function getButtonY(id) {return (id-getButtonX(id))/columns}
function isButtonPressed(id) {
    return document.querySelector('#button' + id).classList.contains("button_pressed")
}

async function resetGame() {
    row = document.getElementById("row").value;
    column = document.getElementById("column").value;
    bombNum = document.getElementById("bombs").value;
    currentLife = maxLife;
    coins = 0;
    setHearts();
    setCoins();
    canClickButton = true;
    document.documentElement.style.setProperty('--is-active', 1)
    generateField(row, column);
}
async function generateField(row, column) {
    rows = row;
    columns = column;
    await parseWallsJson(rows+'x'+columns);
    document.querySelector('#endscreen').classList.remove('screen_win', 'screen_lose');
    if (bombNum > rows*columns-wallTiles.length-9) {
        throw new Error("too many bombs");
    } else if (rows > 512 || columns > 512 || rows*columns > 16384) {
        throw new Error("board too big")
    } else if (rows < 1 || columns < 1 || bombs < 0) {
        throw new Error("negative values")
    }
    clickedBombs = [];
    pickedPickups = [];
    flags = [];
    resistedBombs = 0;
    isFirstClick = true;
    document.querySelector('#field').innerHTML = '';
    let fieldHtml = '';
    for (let i = 0; i < rows; i++) {
        fieldHtml += `<div class="row" id="row${i}">`
        for (let j = 0; j < columns; j++) {
            if (wallTiles.includes(j + columns*i)) {
                fieldHtml += `<button class="wall_button" id="button${j + columns*i}"></button>`
            } else if (lockedTiles.includes(j + columns*i)) {
                fieldHtml += `<button onclick="clickButton(${j + columns*i}, true)"
                class="button locked_button" id="button${j + columns*i}"></button>`
            } else {
                fieldHtml += `<button onclick="clickButton(${j + columns*i}, true)"
                class="button" id="button${j + columns*i}"></button>`;
            }
        }   
        fieldHtml += `</div>`
    }
    document.querySelector('#field').innerHTML = fieldHtml;
    bombs = [];
    while (bombs.length < bombNum) {
        let bombId = Math.floor(Math.random() * rows * columns);
        if (!bombs.includes(bombId) && !wallTiles.includes(bombId)) {
            bombs.push(bombId)
        }
    }
    generatePickups();
}

function generateBombs(id) {
    bombs = [];
    let exclude = [...getNeighbors(id), ...wallTiles];
    if (bombNum > rows*columns - exclude.length - 1) {
        throw new Error("too many bombs")
    }
    while (bombs.length < bombNum) {
        let bombId = Math.floor(Math.random() * rows * columns);
        if (!bombs.includes(bombId) && !exclude.includes(bombId) && bombId != id) {
            bombs.push(bombId)
        }
    }
    generatePickups();
}
function generatePickups() {
    let exclude = [...bombs, ...wallTiles];
    generateKey(exclude);
    generateHearts(exclude);
    generateEyes(exclude);
    generateCoins(exclude);

    pickedPickups = []
}

function generateKey(exclude) {
    keys = [];
    if (lockedTiles.length > 0) {
        max = 1;
        while (keys.length < max) {
            let keyId = Math.floor(Math.random() * rows * columns);
            if (!exclude.includes(keyId) && !lockedTiles.includes(keyId)) {
                keys.push(keyId)
            }
        }
    }
    exclude = [...exclude, ...keys]
}
function generateHearts(exclude) {
    hearts = [];
    max = bombNum/10 + Math.floor(Math.random() * 2 - 2)
    while (hearts.length < max && exclude.length + hearts.length < rows*columns) {
        let heartId = Math.floor(Math.random() * rows * columns);
        if (!hearts.includes(heartId) && !exclude.includes(heartId)) {
            hearts.push(heartId)
        }
    }
    exclude = [...exclude, ...hearts]
}
function generateEyes(exclude) {
    eyes = [];
    max = bombNum/30 + Math.floor(Math.random() * 5 - 4)
    while (eyes.length < max && exclude.length + eyes.length < rows*columns) {
        let eyeId = Math.floor(Math.random() * rows * columns);
        if (!eyes.includes(eyeId) && !exclude.includes(eyeId)) {
            eyes.push(eyeId)
        }
    }
    exclude = [...exclude, ...eyes]
}
function generateCoins(exclude) {
    coinTiles = [];
    max = bombNum/5 + Math.floor(Math.random() * 7 - 2)
    while (coinTiles.length < max && exclude.length + coinTiles.length < rows*columns) {
        let coinId = Math.floor(Math.random() * rows * columns);
        if (!coinTiles.includes(coinId) && !exclude.includes(coinId)) {
            coinTiles.push(coinId)
        }
    }
    exclude = [...exclude, ...coinTiles]
}

function getNeighbors(id) {
    let x = getButtonX(id);
    let y = getButtonY(id);
    let neighbors = [];
    neighbors.push(getButtonID(x-1, y-1))
    neighbors.push(getButtonID(x-1, y))
    neighbors.push(getButtonID(x-1, y+1))
    neighbors.push(getButtonID(x, y-1))
    neighbors.push(getButtonID(x, y+1))
    neighbors.push(getButtonID(x+1, y-1))
    neighbors.push(getButtonID(x+1, y))
    neighbors.push(getButtonID(x+1, y+1))
    return neighbors.filter(value => !Number.isNaN(value))
}

function getBombNeighbors(id) {
    return getNeighbors(id).filter(value => bombs.includes(value))
}

function clickButton(id, isClick) {
    let button = document.querySelector('#button' + id);
    if (canClickButton && !clickedBombs.includes(id) && !wallTiles.includes(id) && !lockedTiles.includes(id)) {
        let nearBombs = getBombNeighbors(id).length;
        if ((bombs.includes(id) || nearBombs > 0) && isFirstClick) {
            generateBombs(id);
            nearBombs = getBombNeighbors(id).length;
        }
        isFirstClick = false;
        if (isClick && pickedPickups.includes(id)) {
            if (hearts.includes(id) && currentLife < maxLife) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                currentLife++;
                setHearts();
                hearts = hearts.filter(value => value != id);
                pickedPickups = pickedPickups.filter(value => value != id);
                return;
            }
            if (eyes.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                let exclude = [...bombs, ...wallTiles, ...flags]
                let reveal = false;
                let attempts = 0;
                while (!reveal && attempts < 256) {
                    let randomId = Math.floor(Math.random() * rows * columns);
                    if (!exclude.includes(randomId) && !isButtonPressed(randomId)) {
                        clickButton(randomId)
                        reveal = true;
                    }
                    attempts++;
                }
                eyes = eyes.filter(value => value != id);
                pickedPickups = pickedPickups.filter(value => value != id);
                return;
            }
            if (keys.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                lockedTiles.forEach(lockId => {
                    let lock = document.querySelector('#button' + lockId);
                    lock.classList.remove("locked_button")
                });
                lockedTiles = [];
                keys = [];
                pickedPickups = pickedPickups.filter(value => value != id);
                return;
            }
            if (coinTiles.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                coins++;
                setCoins();
                coinTiles = coinTiles.filter(value => value != id);
                pickedPickups = pickedPickups.filter(value => value != id);
                return;
            }
        }

        if (flagMode && !flags.includes(id)) {
            button.classList.replace("button", "button_flagged");
            flags.push(id);
        } else if (flagMode && flags.includes(id)) {
            button.classList.replace("button_flagged", "button");
            flags = flags.filter(value => value != id);
        } else if (!flags.includes(id)) {
            button.classList.replace("button", "button_pressed");

            if (bombs.includes(id)) {
                button.innerHTML = `<div class="bg bomb"></div>`
                clickedBombs.push(id);
                resistedBombs++;
                currentLife--;
                setHearts();
                if (currentLife == 0) {
                    resistedBombs--;
                    lose();
                }
            } else if (nearBombs == 0) {
                let neighbors = getNeighbors(id);
                neighbors.forEach(value => {if (!isButtonPressed(value)) {
                    clickButton(value, false);
                }})
            } else {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
            }

            if (hearts.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg heartpickup"></div></div>`
                pickedPickups.push(id);
            }
            if (eyes.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg eyepickup"></div></div>`
                pickedPickups.push(id);
            }
            if (keys.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg keypickup"></div></div>`
                pickedPickups.push(id);
            }
            if (coinTiles.includes(id)) {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg coinpickup"></div></div>`
                pickedPickups.push(id);
            }
        }
        if (winCondition()) {
            win();
        }
    }   
}

function lose() {
    document.documentElement.style.setProperty('--is-active', 0);
    canClickButton = false;
    document.querySelector('#endscreen').classList.add('screen_lose');
    revealTiles();
}

function win() {
    /* for floors mode
    rows = parseInt(rows, 10)+1;
    columns = parseInt(columns, 10)+1;
    bombNum = Math.min(parseInt(bombNum, 10) + 
        Math.floor(Math.sqrt(parseInt(rows, 10)+parseInt(columns, 10))), 2*rows*columns/3)
    generateField(parseInt(rows, 10), parseInt(columns, 10))
    */
    
    let coinsGained = 0;
    flags.forEach(flag => {
        if (bombs.includes(flag)) {
            coinsGained++;
        }
    });
    coins += Math.floor(Math.sqrt(coinsGained+2))
    setCoins();

    document.documentElement.style.setProperty('--is-active', 0);
    canClickButton = false;   
    document.querySelector('#endscreen').classList.add('screen_win');
    revealTiles();
}

function winCondition() {
    return document.querySelectorAll('.button_pressed').length == rows*columns - bombs.length - wallTiles.length + resistedBombs;
}

function revealTiles() {
    bombs.forEach(value => {
        let button = document.querySelector('#button' + value);
        if (!flags.includes(value)) {
        button.classList.replace('button', 'button_low');
        button.innerHTML = `<div class="bg bomb"></div>`};
    });
    coinTiles.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = button.classList.contains('button_pressed') ? 
            `<div class="bg num${getBombNeighbors(value).length}">
            <div class="bg coinpickup"></div></div>` : 
            `<div class="bg coinpickup"></div>`;
    });
    hearts.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = button.classList.contains('button_pressed') ? 
            `<div class="bg num${getBombNeighbors(value).length}">
            <div class="bg heartpickup"></div></div>` : 
            `<div class="bg heartpickup"></div>`;
    });
    eyes.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = button.classList.contains('button_pressed') ? 
            `<div class="bg num${getBombNeighbors(value).length}">
            <div class="bg eyepickup"></div></div>` : 
            `<div class="bg eyepickup"></div>`;
    });
    keys.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = button.classList.contains('button_pressed') ? 
            `<div class="bg num${getBombNeighbors(value).length}">
            <div class="bg keypickup"></div></div>` : 
            `<div class="bg keypickup"></div>`;
    });
}

function flagToggle() {
    let toggleButton = document.querySelector('#flag_toggle')
    if (!flagMode) {
        toggleButton.classList.replace('button_toggle', 'button_toggle_active')
        flagMode = true;
    } else {
        toggleButton.classList.replace('button_toggle_active', 'button_toggle')
        flagMode = false;
    }
}

function setHearts() {
    let container = document.querySelector('#hearts')
    let html = '';
    for (let i = 0; i < maxLife; i++) {
        html += `<div id="life${i}" class="${i < currentLife ? 'heart' : 'heart_empty'}"></div>`
    }
    container.innerHTML = html;
}
function setCoins() {
    let container = document.querySelector('#coinamount')
    container.innerHTML = `${coins}`;
}

async function loadJSON(path) {
  try {
    const response = await fetch(path); 
    
    if (!response.ok) {
      throw new Error(`failed to load json: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('failed to load json:', error);
  }
}
async function parseWallsJson(name) {
    wallTiles = []
    lockedTiles = [];
    let data = await loadJSON('./walls.json')
    try {
        let walls = data[name]
        if (typeof walls[0] !== "string") {
            walls = walls[Math.floor(Math.random() * (walls.length + 1))]
        }
        let wallsLayout = [...walls.join()].filter(value => value != ",")
        if (wallsLayout.length == rows*columns) {
            for (let i = 0; i < wallsLayout.length; i++) {
                let char = wallsLayout[i];
                switch (char) {
                    case '#':
                        wallTiles.push(i);
                        break;
                    case '/':
                        lockedTiles.push(i);
                        break;
                    default:
                        break;
                }
            }
        }
    } catch {
        lockedTiles = [];
        wallTiles = [];
    }
}