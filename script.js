let rows;
let columns;
let bombs = [];
let bombNum;
let flags = [];
let hearts = [];
let eyes = [];
let isFirstClick = true;
let canClickButton = true;
let flagMode = false;
let currentLife;
let maxLife = 2;
let resistedBombs = 0;
let clickedBombs = [];
let pickedPickups = [];

document.addEventListener('keydown', (event) => {
    let toggleButton = document.querySelector('#flag_toggle')
    if (!flagMode && event.shiftKey) {
        toggleButton.classList.replace('button_toggle', 'button_toggle_active')
        flagMode = true;
    }
    if (event.key == "r") {
        generateField();
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
    return x < columns && y < rows && x >= 0 && y >= 0 
    ? y*columns+x : NaN;}
function getButtonX(id) {return id%columns;}
function getButtonY(id) {return (id-getButtonX(id))/columns}
function isButtonPressed(id) {
    return document.querySelector('#button' + id).classList.contains("button_pressed")
}

function generateField() {
    rows = document.getElementById("row").value;
    columns = document.getElementById("column").value;
    bombNum = document.getElementById("bombs").value;
        document.querySelector('#endscreen').classList.remove('screen_win', 'screen_lose');
    if (bombNum > rows*columns-1) {
        throw new Error("too many bombs");
    } else if (rows > 512 || columns > 512) {
        throw new Error("board too big")
    } else if (rows < 1 || columns < 1 || bombs < 0) {
        throw new Error("negative values")
    } else if (bombs > rows*columns - 9) {
    }
    clickedBombs = [];
    pickedPickups = [];
    currentLife = maxLife;
    resistedBombs = 0;
    setHearts();
    isFirstClick = true;
    canClickButton = true;
    flags = [];
    let fieldHtml = '';
    for (let i = 0; i < rows; i++) {
        fieldHtml += `<div class="row" id="row${i}">`
        for (let j = 0; j < columns; j++) {
            fieldHtml += `<button onclick="clickButton(${j + columns*i}, true)"
            class="button" id="button${j + columns*i}">
            </button>`
        }   
        fieldHtml += `</div>`
    }
    document.querySelector('#field').innerHTML = fieldHtml;
    bombs = [];
    while (bombs.length < bombNum) {
        let bombId = Math.floor(Math.random() * rows * columns);
        if (!bombs.includes(bombId)) {
            bombs.push(bombId)
        }
    }
    generatePickups();
    document.documentElement.style.setProperty('--is-active', 1)
}
function generateBombs(id) {
    bombs = [];
    let exclude = getNeighbors(id);
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
    generateHearts();
    generateEyes();

    pickedPickups = []
}

function generateHearts() {
    hearts = [];
    while (hearts.length < bombNum/10) {
        let heartId = Math.floor(Math.random() * rows * columns);
        if (!hearts.includes(heartId) && !bombs.includes(heartId)) {
            hearts.push(heartId)
        }
    }
}
function generateEyes() {
    eyes = [];
    while (eyes.length < bombNum/30) {
        let eyeId = Math.floor(Math.random() * rows * columns);
        if (!eyes.includes(eyeId) && !bombs.includes(eyeId) && !hearts.includes(eyeId)) {
            eyes.push(eyeId)
        }
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
    if (canClickButton && !clickedBombs.includes(id)) {
        let nearBombs = getBombNeighbors(id).length;
        if ((bombs.includes(id) || nearBombs > 0) && isFirstClick) {
            generateBombs(id);
            nearBombs = getBombNeighbors(id).length;
        }
        isFirstClick = false;
        if (flagMode && !flags.includes(id)) {
            button.classList.replace("button", "button_flagged");
            flags.push(id);
        } else if (flagMode && flags.includes(id)) {
            button.classList.replace("button_flagged", "button");
            flags = flags.filter(value => value != id);
        } else if (!flags.includes(id)) {
            button.classList.replace("button", "button_pressed");
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
                    let reveal = false;
                    let attempts = 0;
                    while (!reveal && attempts < 256) {
                        let randomId = Math.floor(Math.random() * rows * columns);
                        if (!bombs.includes(randomId) && !flags.includes(randomId) && !isButtonPressed(randomId)) {
                            clickButton(randomId)
                            reveal = true;
                        }
                        attempts++;
                    }
                    eyes = eyes.filter(value => value != id);
                    pickedPickups = pickedPickups.filter(value => value != id);
                    return;
                }
            }

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
        }
        if (winCondition()) {
            document.documentElement.style.setProperty('--is-active', 0);
            canClickButton = false;   
            document.querySelector('#endscreen').classList.add('screen_win');
            revealTiles();
        }
    }   
}

function lose() {
    canClickButton = false;      
    revealTiles();
    document.documentElement.style.setProperty('--is-active', 0);
    document.querySelector('#endscreen').classList.add('screen_lose');
}

function winCondition() {
    return document.querySelectorAll('.button_pressed').length == rows*columns - bombs.length + resistedBombs;
}

function revealTiles() {
    bombs.forEach(value => {
        let button = document.querySelector('#button' + value);
        if (!flags.includes(value)) {
        button.classList.replace('button', 'button_low');
        button.innerHTML = `<div class="bg bomb"></div>`};
    });
    hearts.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = `<div class="bg heartpickup"></div>`;
    });
    eyes.forEach(value => {
        let button = document.querySelector('#button' + value);
        button.classList.replace('button', 'button_low');
        button.innerHTML = `<div class="bg eyepickup"></div>`;
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