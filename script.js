let rows;
let columns;

let allowPickups = true;
let pickedPickups = [];
let excludeForPickupGeneration = []

let flags = [];
let hearts = [];
let eyes = [];
let keys = [];
let coinTiles = [];

let customLayout = false;
let wallTiles = [];
let lockedTiles = [];

let bombs = [];
let bombNum;
let resistedBombs = 0;
let clickedBombs = [];

let currentLife;
let maxLife;
let coins = 0;

let isFirstClick = true;
let canClickButton = true;
let flagMode = false;
let isShifting = false;

let isFloorsMode = false;
let currentFloor = 0;

if (localStorage.getItem('customLayout') != null) {
    checkCustomParam();
}
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
})
document.addEventListener('keyup', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (flagMode && !event.shiftKey) {
        toggleButton.classList.replace('button_toggle_active', 'button_toggle')
        flagMode = false;
        isShifting = false;
    }
})

function int(num) {return parseInt(num, 10)}
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

    document.documentElement.style.setProperty('--is-active', 1)
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
    coinTiles = [];
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
    if (isFloorsMode) {
        while (bombs.length < bombNum) {
            let bombId = Math.floor(Math.random() * rows * columns);
            if (!bombs.includes(bombId)) {
                bombs.push(bombId)
            }
        }
        bombs.filter(value => {!wallTiles.includes(value)})
    } else {
        while (bombs.length < bombNum) {
            let bombId = Math.floor(Math.random() * rows * columns);
            if (!bombs.includes(bombId) && !wallTiles.includes(bombId)) {
                bombs.push(bombId)
            }
        }
    }
    if (allowPickups) {
        generatePickups();
    }
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
    if (allowPickups) {
        generatePickups();
    }
}
function generatePickups() {
    excludeForPickupGeneration = [...bombs, ...wallTiles];
    generateKey();
    generateHearts();
    generateEyes();
    generateCoins();

    pickedPickups = []
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
    max = bombNum/10 + Math.floor(Math.random() * 2 - 2)
    while (hearts.length < max && excludeForPickupGeneration.length + hearts.length < rows*columns) {
        let heartId = Math.floor(Math.random() * rows * columns);
        if (!hearts.includes(heartId) && !excludeForPickupGeneration.includes(heartId)) {
            hearts.push(heartId)
        }
    }
    excludeForPickupGeneration = [...excludeForPickupGeneration, ...hearts]
}
function generateEyes() {
    eyes = [];
    max = bombNum/30 + Math.floor(Math.random() * 5 - 4)
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
    max = bombNum/5 + Math.floor(Math.random() * 7 - 2)
    while (coinTiles.length < max && excludeForPickupGeneration.length + coinTiles.length < rows*columns) {
        let coinId = Math.floor(Math.random() * rows * columns);
        if (!coinTiles.includes(coinId) && !excludeForPickupGeneration.includes(coinId)) {
            coinTiles.push(coinId)
        }
    }
    excludeForPickupGeneration = [...excludeForPickupGeneration, ...coinTiles]
}

function getPickupAt(id) {
    let pickups = [];
    if (hearts.includes(id)) {pickups.push('heart')}
    if (eyes.includes(id)) {pickups.push('eye')}
    if (coinTiles.includes(id)) {pickups.push('coin')}
    if (keys.includes(id)) {pickups.push('key')}
    if (bombs.includes(id)) {pickups.push('bomb')}
    
    if (pickups.length > 1) {
        throw new Error('too many pickups at id ' + id)
    } else {
        return pickups.length == 1 ? pickups[0] : null;
    }
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
            switch (getPickupAt(id)) {
                case 'heart':
                    if (currentLife < maxLife) {
                        button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                        currentLife++;
                        setHearts();
                        hearts = hearts.filter(value => value != id);
                        pickedPickups = pickedPickups.filter(value => value != id);
                        return;
                    }
                    break;
                case 'eye':
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                    let exclude = [...bombs, ...wallTiles, ...lockedTiles, ...flags]
                    let reveal = false;
                    let attempts = 0;
                    while (!reveal && attempts < 256) {
                        let randomId = Math.floor(Math.random() * rows * columns);
                        if (!exclude.includes(randomId) && !isButtonPressed(randomId)) {
                            clickButton(randomId, false)
                            reveal = true;
                        }
                        attempts++;
                    }
                    eyes = eyes.filter(value => value != id);
                    pickedPickups = pickedPickups.filter(value => value != id);
                    return;
                    break;
                case 'coin':
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                    coins++;
                    setCoins();
                    coinTiles = coinTiles.filter(value => value != id);
                    pickedPickups = pickedPickups.filter(value => value != id);
                    return;
                    break;
                case 'key':
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}"></div>`
                    lockedTiles.forEach(lockId => {
                        let lock = document.querySelector('#button' + lockId);
                        lock.classList.replace("locked_button", "button")
                        lock.classList.replace("locked_button_flagged", "button_flagged")
                    });
                    lockedTiles = [];
                    keys = [];
                    pickedPickups = pickedPickups.filter(value => value != id);
                    return;
                    break;
                default:
                    break;
            }
        }

        if (flagMode && !flags.includes(id)) {
            button.classList.replace("button", "button_flagged");
            button.classList.replace("locked_button", "locked_button_flagged");
            flags.push(id);
        } else if (flagMode && flags.includes(id)) {
            button.classList.replace("button_flagged", "button");
            button.classList.replace("locked_button_flagged", "locked_button");
            flags = flags.filter(value => value != id);
        } else if (!flags.includes(id) && !lockedTiles.includes(id)) {
            button.classList.replace("button", "button_pressed");
            button.classList.replace("button_low", "button_pressed");

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

            switch (getPickupAt(id)) {
                case 'heart': 
                    button.innerHTML = `<div class="bg num${getBombNeighbors(id).length}">
                    <div class="bg heartpickup"></div></div>`
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
        rows = Math.min(int(rows)+Math.floor(Math.random()*2+1), 17);
        columns = Math.min(int(columns)+Math.floor(Math.random()*2+1), 28);
        bombNum = Math.min(int(bombNum) + 
            Math.floor(Math.sqrt(int(rows)+int(columns)))/2, (rows*columns-wallTiles.length)/4)
        generateField(int(rows), int(columns))
        return;
    }

    document.documentElement.style.setProperty('--is-active', 0);
    canClickButton = false;   
    document.querySelector('#endscreen').classList.add('screen_win');
    revealTiles();
}

function winCondition() {
    return document.querySelectorAll('.button_pressed').length == rows*columns - bombs.length - wallTiles.length + resistedBombs;
}

function revealTiles() {
    flags.forEach(value => {
        let button = document.querySelector('#button' + value);
        if (!bombs.includes(value)) {
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
                button.innerHTML = `<div class="bg bomb"></div>`};
                break;
            case 'coin':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg coinpickup"></div></div>` : 
                    `<div class="bg coinpickup"></div>`;
                break;
            case 'heart':
                button.classList.replace('button', 'button_low');
                button.innerHTML = button.classList.contains('button_pressed') ? 
                    `<div class="bg num${getBombNeighbors(i).length}">
                    <div class="bg heartpickup"></div></div>` : 
                    `<div class="bg heartpickup"></div>`;
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
    } catch {
        lockedTiles = [];
        wallTiles = [];
    }
}

function checkCustomParam() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const isCustom = urlParams.get('custom') ? urlParams.get('custom') : false;

    if (isCustom) {
        customLayout = true;
        document.querySelector('#layout_toggle').classList.add('toggle_on')
        document.getElementById("row").value = localStorage.getItem('clRows')
        document.getElementById("column").value = localStorage.getItem('clColumns')
        document.getElementById("bombs").value = int(localStorage.getItem('clRows')*localStorage.getItem('clColumns')/6)
    }
}

function toggleFloors() {
    let toggleButton = document.querySelector('#floors_toggle');
    if (isFloorsMode) {
        isFloorsMode = false;
        toggleButton.classList.remove('toggle_on');
    } else {
        isFloorsMode = true;
        toggleButton.classList.add('toggle_on')
    }
}

function togglePickups() {
    let toggleButton = document.querySelector('#pickups_toggle');
    if (allowPickups) {
        allowPickups = false;
        toggleButton.classList.remove('toggle_on');
    } else {
        allowPickups = true;
        toggleButton.classList.add('toggle_on')
    }
}

function toggleCustomLayout() {
    let toggleButton = document.querySelector('#layout_toggle');
    if (customLayout) {
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

    if (isShifting) {
        let currentUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        window.location.assign(currentUrl + 'editor.html')
        return;
    }
}

document.addEventListener('click', e => {
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