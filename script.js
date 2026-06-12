let rows;
let columns;

let allowPickups = true;
let pickedPickups = [];
let excludeForPickupGeneration = []

let hearts = [];
let blankHearts = [];
let eyes = [];
let keys = [];
let coinTiles = [];
let coinBags = [];
let randomTiles = [];

let customLayout = false;
let jsonCache = {};
let wallTiles = [];
let lockedTiles = [];

let bombs = [];
let megaBombs = [];
let bombNum;
let flags = [];
let resistedBombs = 0;
let clickedBombs = [];

let currentLife;
let maxLife;
let coins = 0;

let isFirstClick = true;
let canClickButton = true;
let flagMode = false;
let isShifting = false;
let isMidGame = false;
let debugMode = false;

let isFloorsMode = false;
let currentFloor = 0;

checkParam();
resetGame();

document.addEventListener('keydown', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (!flagMode && event.shiftKey) {
        toggleButton.classList.replace('button_toggle', 'button_toggle_active')
        flagMode = true;
        isShifting = true;
    }
    if (event.key == "r") {
        resetGame();
    }
    updateDebug();
})
document.addEventListener('keyup', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (flagMode && !event.shiftKey) {
        toggleButton.classList.replace('button_toggle_active', 'button_toggle')
        flagMode = false;
        isShifting = false;
    }
    updateDebug();
})
document.addEventListener('animationend', (event) => {
    if (event.animationName == 'explosion') {
        event.target.remove();
    }
})

function int(num) {return parseInt(num, 10)}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function bombRatio() {
    return (rows*columns-wallTiles.length)/bombNum
}

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

    if (isFloorsMode) {
        row = 5;
        column = 5;
        bombNum = 4;
        currentFloor = 1;
        lockedTiles = [];
        wallTiles = [];
        setFloor();
    }

    maxLife = document.getElementById("heart").value;
    currentLife = maxLife;
    coins = 0;
    setHearts();
    setCoins();
    canClickButton = true;
    toggleMidGame(false);

    document.documentElement.style.setProperty('--is-active', 1);
    updateDebug();
    generateField(row, column);
}
async function generateField(row, column) {
    rows = row;
    columns = column;

    if (!isFloorsMode) {
        await parseWallsJson(rows+'x'+columns);
    } // will remain until there are sufficient wall layouts
    document.querySelector('#endscreen').classList.remove('screen_win', 'screen_lose');
    if (bombNum > rows*columns-wallTiles.length-9) {
        throw new Error("too many bombs");
    } else if (rows > 512 || columns > 512 || rows*columns > 16384) {
        throw new Error("board too big")
    } else if (rows < 1 || columns < 1 || bombNum < 0) {
        throw new Error("negative values")
    }

    clickedBombs = [];
    pickedPickups = [];
    flags = [];
    randomTiles = [];
    coinTiles = [];
    coinBags = [];
    hearts = [];
    blankHearts = [];
    eyes = [];
    keys = [];
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

    generateBombs();
    if (allowPickups) {
        generatePickups();
    }
    updateDebug();
}

function generateBombs(id) {
    bombs = [];
    megaBombs = [];
    let exclude = [...getNeighbors(id), ...wallTiles, id];
    if (bombNum > rows*columns - exclude.length - 1) {
        throw new Error("too many bombs")
    }
    if (isFloorsMode) {
        while (bombs.length < bombNum) {
            let bombId = Math.floor(Math.random() * rows * columns);
            if (!bombs.includes(bombId) && !exclude.includes(bombId)) {
                bombs.push(bombId)
            }
        }
        bombs = bombs.filter(value => !wallTiles.includes(value))

        if (currentFloor >= 10) {
            let megaBombNum = Math.min(currentFloor/10, bombs.length/15);
            while (megaBombs.length < megaBombNum) {
                let bombId = Math.floor(Math.random() * rows * columns);
                if (bombs.includes(bombId)) {
                    megaBombs.push(bombId)
                }
            }
            bombs = bombs.filter(value => !megaBombs.includes(value))
        }

        document.getElementById('bombs').value = bombs.length + megaBombs.length;
        document.getElementById('row').value = rows;
        document.getElementById('column').value = columns;
    } else {
        while (bombs.length < bombNum) {
            let bombId = Math.floor(Math.random() * rows * columns);
            if (!bombs.includes(bombId) && !wallTiles.includes(bombId) && !exclude.includes(bombId)) {
                bombs.push(bombId)
            }
        }
    }
    if (allowPickups) {
        generatePickups();
    }
}
function generatePickups() {
    excludeForPickupGeneration = [...bombs, ...megaBombs, ...wallTiles];
    generateRandoms();
    generateKey();
    generateHearts();
    generateEyes();
    generateCoins();

    updateDebug();
    pickedPickups = []
}

function generateRandoms() {
    randomTiles = [];
    max = isFloorsMode ? Math.floor(bombNum/30 + randInt(0, currentFloor)/6 + randInt(-3, 2)) : Math.floor(bombNum/30 + randInt(-2, 1))
    while (randomTiles.length < max && excludeForPickupGeneration.length + randomTiles.length < rows*columns) {
        let randomId = Math.floor(Math.random() * rows * columns);
        if (!randomTiles.includes(randomId) && !excludeForPickupGeneration.includes(randomId)) {
            randomTiles.push(randomId)
        }
    }
    excludeForPickupGeneration = [...excludeForPickupGeneration, ...randomTiles]
}
function generateKey() {
    keys = [];
    if (lockedTiles.length > 0) {
        max = 1;
        while (keys.length < max) {
            let keyId = Math.floor(Math.random() * rows * columns);
            if (!excludeForPickupGeneration.includes(keyId) && !lockedTiles.includes(keyId)) {
                keys.push(keyId)
            }
        }
    }
    excludeForPickupGeneration = [...excludeForPickupGeneration, ...keys]
}
function generateHearts() {
    if (maxLife == 1) {
        return;
    }
    hearts = [];
    blankHearts = []
    max = Math.floor(bombNum/15 + randInt(-2, 1))
    while (hearts.length < max && excludeForPickupGeneration.length + hearts.length < rows*columns) {
        let heartId = Math.floor(Math.random() * rows * columns);
        if (!hearts.includes(heartId) && !excludeForPickupGeneration.includes(heartId)) {
            hearts.push(heartId)
        }
    }
    
    if (currentFloor >= 10) {
        let blankHeartNum = Math.floor(Math.min(currentFloor/7, hearts.length/5 + 2, hearts.length));
        while (blankHearts.length < blankHeartNum) {
            let heartId = Math.floor(Math.random() * rows * columns);
            if (hearts.includes(heartId)) {
                blankHearts.push(heartId)
            }
        }
        hearts = hearts.filter(value => !blankHearts.includes(value))
    }

    excludeForPickupGeneration = [...excludeForPickupGeneration, ...hearts, ...blankHearts]
}
function generateEyes() {
    eyes = [];
    max = Math.floor(bombNum/30 + randInt(-3, 1))
    while (eyes.length < max && excludeForPickupGeneration.length + eyes.length < rows*columns) {
        let eyeId = Math.floor(Math.random() * rows * columns);
        if (!eyes.includes(eyeId) && !excludeForPickupGeneration.includes(eyeId)) {
            eyes.push(eyeId)
        }
    }
    excludeForPickupGeneration = [...excludeForPickupGeneration, ...eyes]
}
function generateCoins() {
    coinTiles = [];
    coinBags = [];
    max = Math.floor(bombNum/5 + randInt(-2, 4))
    while (coinTiles.length < max && excludeForPickupGeneration.length + coinTiles.length < rows*columns) {
        let coinId = Math.floor(Math.random() * rows * columns);
        if (!coinTiles.includes(coinId) && !excludeForPickupGeneration.includes(coinId)) {
            coinTiles.push(coinId)
        }
    }

    if (currentFloor >= 7) {
        let bagNum = Math.floor(Math.min(currentFloor/9, coinTiles.length/7 + 1, coinTiles.length));
        while (coinBags.length < bagNum) {
            let bagId = Math.floor(Math.random() * rows * columns);
            if (coinTiles.includes(bagId)) {
                coinBags.push(bagId)
            }
        }
        coinTiles = coinTiles.filter(value => !coinBags.includes(value))
    }

    excludeForPickupGeneration = [...excludeForPickupGeneration, ...coinTiles, ...coinBags]
}

function getPickupAt(id) {
    let pickups = [];
    if (randomTiles.includes(id)) {pickups.push('random')}
    if (hearts.includes(id)) {pickups.push('heart')}
    if (blankHearts.includes(id)) {pickups.push('blankheart')}
    if (eyes.includes(id)) {pickups.push('eye')}
    if (coinTiles.includes(id)) {pickups.push('coin')}
    if (coinBags.includes(id)) {pickups.push('bag')}
    if (keys.includes(id)) {pickups.push('key')}
    if (bombs.includes(id)) {pickups.push('bomb')}
    if (megaBombs.includes(id)) {pickups.push('megabomb')}
    
    if (pickups.length > 1) {
        throw new Error('too many pickups at id ' + id + ": " + pickups)
    } else {
        return pickups.length == 1 ? pickups[0] : null;
    }
}

function getNeighbors(id) {
    if (id == null) {return []}
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
    return getNeighbors(id).filter(value => bombs.includes(value) || megaBombs.includes(value))
}

function clickButton(id, isClick) {
    updateDebug();
    let button = document.querySelector('#button' + id);
    if (!isMidGame) {
        toggleMidGame(true);
    } 
    if (isFirstClick && !isClick) {
        return;
    }
    if (canClickButton && !clickedBombs.includes(id) && !wallTiles.includes(id)) {
        let nearBombs = getBombNeighbors(id).length;
        if ((bombs.includes(id) || nearBombs > 0) && isFirstClick) {
            generateBombs(id);
            nearBombs = getBombNeighbors(id).length;
        }
        isFirstClick = false;
        if (isClick && pickedPickups.includes(id)) {
            updateDebug();
            switch (getPickupAt(id)) {
                case 'heart':
                    triggerHeartPickup(id, button);
                    return;
                    break;
                case 'blankheart':
                    triggerBlankHeartPickup(id, button);
                    return;
                    break;
                case 'eye':
                    triggerEyePickup(id, button);
                    return;
                    break;
                case 'coin':
                    triggerCoinPickup(id, button);
                    return;
                    break;
                case 'bag':
                    triggerCoinBagPickup(id, button);
                    return;
                    break;
                case 'key':
                    triggerKeyPickup(id, button);
                    return;
                    break;
                case 'random':
                    triggerRandomPickup(id, button);
                    return;
                    break;
                default:
                    break;
            }
        }

        if (flagMode && !flags.includes(id) && isClick) {
            button.classList.replace("button", "button_flagged");
            button.classList.replace("locked_button", "locked_button_flagged");
            flags.push(id);
        } else if (flagMode && flags.includes(id) && isClick) {
            button.classList.replace("button_flagged", "button");
            button.classList.replace("locked_button_flagged", "locked_button");
            flags = flags.filter(value => value != id);
        } else if (!flags.includes(id) && !lockedTiles.includes(id)) {
            button.classList.replace("button", "button_pressed");
            button.classList.replace("button_low", "button_pressed");

            if (bombs.includes(id)) {
                button.innerHTML = `<div class="bg bomb"><div class="explosion"></div></div>`
                clickedBombs.push(id);
                resistedBombs++;
                currentLife--;
                setHearts();
                if (currentLife == 0) {
                    resistedBombs--;
                    lose();
                }
            } else if (megaBombs.includes(id)) {
                button.innerHTML = `<div class="bg megabomb"><div class="explosion"></div></div>`
                clickedBombs.push(id);
                currentLife = 0;
                setHearts();
                lose();
            } else if (nearBombs == 0) {
                let neighbors = getNeighbors(id);
                neighbors.forEach(value => {if (!isButtonPressed(value)) {
                    clickButton(value, false);
                }})
            } else {
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
            }

            switch (getPickupAt(id)) {
                case 'heart': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg heartpickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'blankheart': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg blankheartpickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'eye': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg eyepickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'key': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg keypickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'coin': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg coinpickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'bag': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg bagpickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                case 'random': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg randompickup"></div></div>`
                    pickedPickups.push(id);
                    break;
                default:
                    break;
            }
        }
        if (winCondition() && document.documentElement.style.getPropertyValue('--is-active') == 1) {
            win();
        }
    }   
    updateDebug();
}

function triggerHeartPickup(id, button) {
    if (currentLife < maxLife) {
        if (button != null) {
            button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
        }
        currentLife++;
        setHearts();
        hearts = hearts.filter(value => value != id);
        pickedPickups = pickedPickups.filter(value => value != id);
        updateDebug();
        return true;
    } else {
        return false;
    }
}
function triggerBlankHeartPickup(id, button) {
    if (currentLife == maxLife) {
        if (button != null) {
            button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
        }
        currentLife++;
        setHearts();
        blankHearts = blankHearts.filter(value => value != id);
        pickedPickups = pickedPickups.filter(value => value != id);
        updateDebug();
        return true;
    } else {
        return false;
    }
}
function triggerEyePickup(id, button) {
    let exclude = [...bombs, ...wallTiles, ...lockedTiles]
    let reveal = false;
    let attempts = 0;
    while (!reveal && attempts < 256) {
        let randomId = Math.floor(Math.random() * rows * columns);
        if (!exclude.includes(randomId) && !isButtonPressed(randomId)) {
            if (flags.includes(randomId)) {
                let flag = document.querySelector('#button' + randomId);
                flag.classList.replace("button_flagged", "button");
                flags = flags.filter(value => value != randomId);
            }
            clickButton(randomId, false)
            reveal = true;
        }
        attempts++;
    }
    if (!reveal) {return false};
    
    if (button) {
        button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
    }
    eyes = eyes.filter(value => value != id);
    pickedPickups = pickedPickups.filter(value => value != id);
    updateDebug();
    return true;
}
function triggerCoinPickup(id, button) {
    if (button) {
        button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
    }
    coins++;
    setCoins();
    coinTiles = coinTiles.filter(value => value != id);
    pickedPickups = pickedPickups.filter(value => value != id);
    updateDebug();
    return true;
}
function triggerCoinBagPickup(id, button) {
    if (id == null) {
        return false;
    }

    let neighbors = getNeighbors(id).filter(value => getPickupAt(value) == null && !wallTiles.includes(value))
    neighbors.forEach((neighborId) => {
        if (Math.random() <= 0.3) {
            setPickupAt(neighborId, 'coin')
        }
    })
    coinBags = coinBags.filter(value => value != id);
    pickedPickups = pickedPickups.filter(value => value != id);
    
    setPickupAt(id, 'coin')
    updateDebug();
    return true;
}
function triggerKeyPickup(id, button) {
    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
    lockedTiles.forEach(lockId => {
        let lock = document.querySelector('#button' + lockId);
        lock.classList.replace("locked_button", "button")
        lock.classList.replace("locked_button_flagged", "button_flagged")
    });
    lockedTiles = [];
    keys = [];
    pickedPickups = pickedPickups.filter(value => value != id);
    updateDebug();
    return true;
}
function triggerRandomPickup(id, button) {
    let isTriggered = false;
    let isBomb = false;

    while (!isTriggered) {
    let randomSelect = randInt(0, 3);
        switch (randomSelect) {
            case 0:
                isTriggered = triggerHeartPickup();
                if (!isTriggered) {
                    isTriggered = triggerBlankHeartPickup();
                }
                break;
            case 1:
                isTriggered = triggerEyePickup();
                break;
            case 2:
                isTriggered = true;
                coins += randInt(1, 4);
                setCoins();
                break;
            case 3:
                isTriggered = true;
                isBomb = true;
                currentLife--;
                setHearts();
                if (currentLife == 0) {
                    resistedBombs--;
                    lose();
                }
                break;
            default:
                isTriggered = false;
                break;
        }
    }
    
    if (isTriggered) {
        button.innerHTML = isBomb 
            ? `<div class="bg num${getBombNeighbors(id).length} bgblank">
            <div class="explosion"></div></div>` 
            : `<div class="bg num${getBombNeighbors(id).length}"></div>`
        randomTiles = randomTiles.filter(value => value != id);
        pickedPickups = pickedPickups.filter(value => value != id);
        updateDebug();
        return true;
    } else {
        return false;
    }
}

function lose() {
    document.documentElement.style.setProperty('--is-active', 0);
    canClickButton = false;
    toggleMidGame(false);
    document.querySelector('#endscreen').classList.add('screen_lose');
    revealTiles(true);
    updateDebug();
}

function win() {
    let coinsGained = 0;
    flags.forEach(flag => {
        if (bombs.includes(flag)) {
            coinsGained++;
        }
    });
    coins += Math.floor(Math.sqrt(coinsGained+2))
    setCoins();

    if (isFloorsMode) {
        coinTiles.forEach(value => {
            let button = document.querySelector('#button' + value);
            if (button.classList.contains('button_pressed'))  {
                coins++;
                setCoins();
            }
        });
    
        currentFloor++;
        setFloor();

        if (Math.random() <= 0.5) {
            rows = Math.min(int(rows)+randInt(0, 2), 17);
            columns = Math.min(int(columns)+1, 28);
        } else {
            rows = Math.min(int(rows)+1, 17);
            columns = Math.min(int(columns)+randInt(0, 2), 28);
        }

        bombNum = Math.floor(Math.min(int(bombNum) + Math.sqrt(int(rows)+int(columns)), 
            (rows*columns-wallTiles.length)/4));
        
        generateField(int(rows), int(columns))
        updateDebug();
        return;
    }

    document.documentElement.style.setProperty('--is-active', 0);
    canClickButton = false;  
    toggleMidGame(false);
    document.querySelector('#endscreen').classList.add('screen_win');
    revealTiles(false);
    updateDebug();
}

function winCondition() {
    return document.querySelectorAll('.button_pressed').length == rows*columns - bombs.length - wallTiles.length + resistedBombs;
}

function revealTiles(explode) {
    flags.forEach(value => {
        let button = document.querySelector('#button' + value);
        if (!bombs.includes(value) && !megaBombs.includes(value)) {
            button.classList.replace('button_flagged', 'button');
            button.classList.replace('locked_button_flagged', 'locked_button');
            flags = flags.filter(id => id != value);
        }
    })
    for (let i = 0; i < rows*columns; i++) {
        let button = document.querySelector('#button' + i);
        switch (getPickupAt(i)) {
            case 'bomb':  
                if (!flags.includes(i)) {
                button.classList.replace('button', 'button_low');
                button.innerHTML = explode ? `<div class="bg bomb"><div class="explosion"></div></div>` : `<div class="bg bomb"></div>`};
                break;
            case 'megabomb':  
                if (!flags.includes(i)) {
                button.classList.replace('button', 'button_low');
                button.innerHTML = explode ? `<div class="bg megabomb"><div class="explosion"></div></div>` : `<div class="bg megabomb"></div>`};
                break;
            case 'coin':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg coinpickup"></div></div>` : 
                    `<div class="bg coinpickup"></div>`;
                break;
            case 'bag':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg bagpickup"></div></div>` : 
                    `<div class="bg bagpickup"></div>`;
                break;
            case 'heart':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg heartpickup"></div></div>` : 
                    `<div class="bg heartpickup"></div>`;
                break;
            case 'blankheart':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg blankheartpickup"></div></div>` : 
                    `<div class="bg blankheartpickup"></div>`;
                break;
            case 'eye':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg eyepickup"></div></div>` : 
                    `<div class="bg eyepickup"></div>`;
                break;
            case 'key':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg keypickup"></div></div>` : 
                    `<div class="bg keypickup"></div>`;
                break;
            case 'random':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg randompickup"></div></div>` : 
                    `<div class="bg randompickup"></div>`;
                break;
            default:
                break;
        }
    }
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
    updateDebug();
}

function setHearts() {
    let container = document.querySelector('#hearts')
    let html = '';
    if (currentLife <= maxLife) {
        for (let i = 0; i < maxLife; i++) {
            html += `<div id="life${i}" class="${i < currentLife ? 'heart' : 'heart_empty'}"></div>`
        }
    } else {
        for (let i = 0; i < currentLife; i++) {
            html += `<div id="life${i}" class="${i < maxLife ? 'heart' : 'heart_blank'}"></div>`
        }
    }
    container.innerHTML = html;
}
function setCoins() {
    let container = document.querySelector('#coinamount')
    container.innerHTML = `${coins}`;
    if (!allowPickups) {
        container.classList.add('disabled');
    } else {
        container.classList.remove('disabled');
    }
}
function setFloor() {
    let container = document.querySelector('#floor')
    container.innerHTML = `Floor ${currentFloor}`;
    if (!isFloorsMode) {
        container.classList.add('disabled');
    } else {
        container.classList.remove('disabled');
    }
}

function toggleMidGame(boolean) {
    isMidGame = boolean;
    if (boolean && isFloorsMode) {
        document.getElementById('heart').classList.add('disabledinput');
    } else {
        document.getElementById('heart').classList.remove('disabledinput');
    }
}

async function loadJSON(path) {
    if (jsonCache[path] != null) {
        return jsonCache[path];
    }
    try {
        const response = await fetch(path); 
        
        if (!response.ok) {
        throw new Error(`failed to load json: ${response.status}`);
        }
        
        let result = await response.json();
        jsonCache[path] = result;
        return result;
    } catch (error) {
        console.error('failed to load json:', error);
    }
}
async function parseWallsJson(name) {
    wallTiles = []
    lockedTiles = [];

    let custom = localStorage.getItem('customLayout')
    let data = customLayout ? JSON.parse(custom) : await loadJSON('./walls.json')
    
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
                        if (allowPickups) {
                            lockedTiles.push(i);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        updateDebug();
    } catch {
        lockedTiles = [];
        wallTiles = [];
    }
}

function checkParam() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const isCustom = urlParams.get('custom') ? urlParams.get('custom') : false;
    const isDebug = urlParams.get('debug') ? urlParams.get('debug') : false;

    if (localStorage.getItem('customLayout') != null && isCustom) {
        customLayout = true;
        document.querySelector('#layout_toggle').classList.add('toggle_on')
        document.getElementById("row").value = localStorage.getItem('clRows')
        document.getElementById("column").value = localStorage.getItem('clColumns')
        document.getElementById("bombs").value = int(localStorage.getItem('clRows')*localStorage.getItem('clColumns')/6)
    }
    if (isDebug) {
        debugMode = true;
        updateDebug();
    }
    return (isDebug)
}

function toggleFloors() {
    let toggleButton = document.querySelector('#floors_toggle');
    if (isFloorsMode) {
        isFloorsMode = false;
        toggleButton.classList.remove('toggle_on');
        if (isMidGame) {
            resetGame();
        }

        document.getElementById('row').classList.remove('disabledinput');
        document.getElementById('column').classList.remove('disabledinput');
        document.getElementById('bombs').classList.remove('disabledinput');
    } else {
        isFloorsMode = true;
        toggleButton.classList.add('toggle_on')
        if (isMidGame) {
            resetGame();
        }
        
        document.getElementById('row').classList.add('disabledinput');
        document.getElementById('column').classList.add('disabledinput');
        document.getElementById('bombs').classList.add('disabledinput');
        
        document.querySelector('#layout_toggle').classList.remove('toggle_on');
        customLayout = false;
    }
    resetGame();
    updateDebug();
}

function togglePickups() {
    if (isMidGame) {
        return;
    }
    let toggleButton = document.querySelector('#pickups_toggle');
    if (allowPickups) {
        allowPickups = false;
        toggleButton.classList.remove('toggle_on');
        setCoins();
    } else {
        allowPickups = true;
        toggleButton.classList.add('toggle_on')
        setCoins();
    }
    resetGame();
    updateDebug();
}

function toggleCustomLayout() {
    let toggleButton = document.querySelector('#layout_toggle');
    if (customLayout || isFloorsMode) {
        customLayout = false;
        toggleButton.classList.remove('toggle_on');
    } else {
        if (localStorage.getItem('customLayout') == null) {
            let currentUrl = window.location.origin + window.location.pathname.replace('index.html', '');
            window.location.assign(currentUrl + 'editor.html')
            return;
        }
        customLayout = true;
        toggleButton.classList.add('toggle_on')
    }   
    updateDebug();

    if (isShifting) {
        let currentUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        window.location.assign(currentUrl + 'editor.html')
        return;
    }
}

function updateDebug() {
    let container = document.querySelector('#debug')
    if (debugMode) {
        container.innerHTML = `
            -- debug mode --<br>
            can reduce performance, use at your own risk<br>
            <br>
            rows = ${rows}<br>
            columns = ${columns}<br>
            <br>
            allowPickups = ${allowPickups}<br>
            pickedPickups = [${pickedPickups}]<br>
            excludeForPickupGeneration = [${excludeForPickupGeneration}]<br>
            <br>
            hearts = [${hearts}]<br>
            blankHearts = [${blankHearts}]<br>
            eyes = [${eyes}]<br>
            keys = [${keys}]<br>
            coinTiles = [${coinTiles}]<br>
            coinBags = [${coinBags}]<br>
            randomTiles = [${randomTiles}]<br>
            <br>
            customLayout = ${customLayout}<br>
            jsonCache = ${JSON.stringify(Object.keys(jsonCache))}<br>
            wallTiles = [${wallTiles}]<br>
            lockedTiles = [${lockedTiles}]<br>
            <br>
            bombs = [${bombs}]<br>
            megaBombs = [${megaBombs}]<br>
            bombNum = ${bombNum}<br>
            flags = [${flags}]<br>
            resistedBombs = ${resistedBombs}<br>
            clickedBombs = [${clickedBombs}]<br>
            <br>
            currentLife = ${currentLife}<br>
            maxLife = ${maxLife}<br>
            coins = ${coins}<br>
            <br>
            isFirstClick = ${isFirstClick}<br>
            canClickButton = ${canClickButton}<br>
            flagMode = ${flagMode}<br>
            isShifting = ${isShifting}<br>
            isMidGame = ${isMidGame}<br>
            debugMode = ${debugMode}<br>
            <br>
            isFloorsMode = ${isFloorsMode}<br>
            currentFloor = ${currentFloor}<br>
        `
    } else {
        container.innerHTML = '';
    }
    return debugMode;
}

function setPickupAt(id, pickup) {
    if (id == null || pickup == null) {
        return false;
    }
    let exclude = [...bombs, ...megaBombs, ...wallTiles, ...hearts, ...blankHearts, ...eyes, ...keys, ...coinTiles, ...coinBags, ...randomTiles];
    let button = document.querySelector('#button' + id);
    if (exclude.includes(id)) {
        return false;
    }
    if (isButtonPressed(id)) {
        switch (pickup) {
            case 'heart': 
                hearts.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg heartpickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'blankheart': 
                blankHearts.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg blankheartpickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'eye': 
                eyes.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg eyepickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'key': 
                keys.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg keypickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'coin': 
                coinTiles.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg coinpickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'bag': 
                coinBags.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg bagpickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'random': 
                randomTiles.push(id);
                button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                <div class="bg randompickup"></div></div>`
                pickedPickups.push(id);
                break;
            case 'bomb': 
                bombs.push(id);
                button.innerHTML = `<div class="bg bomb"></div>`
                break;
            case 'megabomb':
                megaBombs.push(id); 
                button.innerHTML = `<div class="bg megabomb"></div>`
                break;
            default:
                return false;
                break;
        }
        updateDebug();
        return true;
    } else {
        switch (pickup) {
            case 'heart': 
                hearts.push(id);
                break;
            case 'blankheart':
                blankHearts.push(id); 
                break;
            case 'eye': 
                eyes.push(id);
                break;
            case 'key': 
                keys.push(id);
                break;
            case 'coin': 
                coinTiles.push(id);
                break;
            case 'bag': 
                coinBags.push(id);
                break;
            case 'random': 
                randomTiles.push(id);
                break;
            case 'bomb': 
                bombs.push(id);
                break;
            case 'megabomb': 
                megaBombs.push(id);
                break;
            default:
                return false;
                break;
        }
        updateDebug();
        return true;
    }
}

document.addEventListener('click', e => {
    updateDebug();
    const isDropdown = e.target.matches("[data-dropdown-button]")
    if (!isDropdown && e.target.closest("[data-dropdown]") != null) {
        return;
    } 

    let currentDropdown;
    if (isDropdown) {
        currentDropdown = e.target.closest("[data-dropdown]")
        if (e.target.matches('[data-dropdown-toggle]')) {
            currentDropdown.classList.toggle('activedropdown')
        } else  {
            currentDropdown.classList.add('activedropdown')
        }
    }
    document.querySelectorAll("[data-dropdown].activedropdown").forEach(dropdown => {
        if (dropdown === currentDropdown) {
            return;
        } else {
            dropdown.classList.remove('activedropdown')
        }
    })
})