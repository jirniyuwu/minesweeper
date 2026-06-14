let rows;
let columns;

let wallTiles = [];
let lockedTiles = [];

let mousePressed = false;
let selector = 'blank';
let isShifting = false;
let debugMode = false;

function int(num) {return parseInt(num, 10)}
checkParam();
generateField(8, 8)

document.addEventListener('input', (event) => {
    if (event.target.matches('.textbox')) {
        let rowsInput = document.getElementById('rowinput').value;
        let columnsInput = document.getElementById('columninput').value;

        generateField(rowsInput, columnsInput)
    }
})

document.addEventListener('keydown', (event) => {
    if (event.shiftKey) {
        isShifting = true;
    }

    switch (event.key) {
        case '1':
            selector = 'blank';
            document.getElementById('blank_button').checked = true;
            document.getElementById('locked_button').checked = false;
            document.getElementById('wall_button').checked = false;
            break;
        case '2':
            selector = 'locked';
            document.getElementById('blank_button').checked = false;
            document.getElementById('locked_button').checked = true;
            document.getElementById('wall_button').checked = false;
            break;
        case '3':
            selector = 'wall';
            document.getElementById('blank_button').checked = false;
            document.getElementById('locked_button').checked = false;
            document.getElementById('wall_button').checked = true;
            break;
        default:
            break;
    }
    updateDebug();
}) 
document.addEventListener('keyup', (event) => {
    if (!event.shiftKey) {
        isShifting = false;
    }
    updateDebug();
}) 

document.querySelectorAll('input[name="button_select"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        selector = event.target.value;
        updateDebug();
    })
})

function generateField(row, column) {
    rows = row;
    columns = column;
    wallTiles = [];
    lockedTiles = [];

    if (rows > 512 || columns > 512 || rows*columns > 16384) {
        throw new Error("board too big")
    } else if (rows < 1 || columns < 1) {
        throw new Error("negative values")
    }
    refreshField();
}

function refreshField() {
    document.querySelector('#field').innerHTML = '';
    let fieldHtml = '';
    for (let i = 0; i < rows; i++) {
        fieldHtml += `<div class="editrow" id="row${i}">`
        for (let j = 0; j < columns; j++) {
            let id = j + int(columns)*i;
            if (wallTiles.includes(id)) {
                fieldHtml += `<button class="editbutton ed_wall_button" id="button${id}"></button>`
            } else if (lockedTiles.includes(id)) {
                fieldHtml += `<button class="editbutton ed_locked_button" id="button${id}"></button>`
            } else {
                fieldHtml += `<button class="editbutton ed_button" id="button${id}"></button>`;
            }
        }   
        fieldHtml += `</div>`
    }
    document.querySelector('#field').innerHTML = fieldHtml;
    updateDebug();
}

function editButton(button) {
    let id = int(button.id.replace('button', ''))
    switch (selector) {
        case 'blank':
            wallTiles = wallTiles.filter(value => value != id);
            lockedTiles = lockedTiles.filter(value => value != id);
            button.classList.remove('ed_wall_button', 'ed_locked_button');
            button.classList.add('ed_button');
            break;
        case 'locked':
            if (!lockedTiles.includes(id)) {lockedTiles.push(id)}
            wallTiles = wallTiles.filter(value => value != id);
            button.classList.add('ed_locked_button');
            button.classList.remove('ed_wall_button', 'ed_button');
            break;
        case 'wall':
            if (!wallTiles.includes(id)) {wallTiles.push(id)}
            lockedTiles = lockedTiles.filter(value => value != id);
            button.classList.add('ed_wall_button');
            button.classList.remove('ed_locked_button', 'ed_button');
            break;
        default:
            break;
    }
    updateDebug();
}

function resetField() {
    wallTiles = [];
    lockedTiles = [];

    refreshField();
}

function exportSet() {
    if (!isShifting) {
        let json = '';
        json += `"${rows}x${columns}": [\n`
        for (let i = 0; i < rows; i++) {
            json += '"'
            for (let j = 0; j < columns; j++) {
                let id = j + int(columns)*i;
                if (wallTiles.includes(id)) {
                    json += '#'
                } else if (lockedTiles.includes(id)) {
                    json += '/'
                } else {
                    json += '*'
                }
            }
            json += i == rows-1 ? '"\n' : '", \n'
        }
        json += ']\n'

        return '{' + json + '}';
    } else {  
        let json = '';
        json += `[\n`
        for (let i = 0; i < rows; i++) {
            json += '"'
            for (let j = 0; j < columns; j++) {
                let id = j + int(columns)*i;
                if (wallTiles.includes(id)) {
                    json += '#'
                } else if (lockedTiles.includes(id)) {
                    json += '/'
                } else {
                    json += '*'
                }
            }
            json += i == rows-1 ? '"\n' : '", \n'
        }
        json += ']'

        return json;
    }
}

function exportButton(copy) {
    try {
        let json = exportSet();
        localStorage.setItem('customLayout', json);
        localStorage.setItem('clRows', rows);
        localStorage.setItem('clColumns', columns);

        if (copy) {
            navigator.clipboard.writeText(json)
            let text = document.querySelector('.text_export');
            text.classList.add('text_animation');
            text.addEventListener('animationend', (event) => {
                text.classList.remove('text_animation');
            })
        }
    } catch (error) {
        alert('failed to export')
    }
}

function exportAndPlay() {
    exportButton(false);
    let redirect = window.location.origin + window.location.pathname.replace('editor.html', '').replace('editor', '');
    let debug = debugMode ? '&debug=true' : '';
    window.location.assign(redirect + '?custom=true' + debug)
}

document.querySelector('#field').addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('editbutton')) {
        mousePressed = true;
        editButton(event.target)
    }
})

document.addEventListener('mousemove', (event) => {
    if (!mousePressed) {return};

    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const selectedButton = elements[0];
    if (selectedButton && selectedButton.classList.contains('editbutton')) {
        editButton(selectedButton);
    }
});

document.addEventListener('mouseup', () => {
    if (mousePressed) {
        mousePressed = false;
        updateDebug();
    }
});

function checkParam() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const isDebug = urlParams.get('debug') ? urlParams.get('debug') : false;

    if (isDebug) {
        debugMode = true;
        updateDebug();
    }
}

function updateDebug() {
    let container = document.querySelector('#debugvariables')
    if (debugMode) {
        container.innerHTML = `
            -- debug mode --<br>
            <br>
            rows = ${rows}<br>
            columns = ${columns}<br>
            <br>
            wallTiles = [${wallTiles}]<br>
            lockedTiles = [${lockedTiles}]<br>
            <br> 
            selector = "${selector}"<br>
            mousePressed = ${mousePressed}<br>
            isShifting = ${isShifting}<br>
            debugMode = ${debugMode}<br>
            
        `
    } else {
        container.innerHTML = '';
    }
    return debugMode;
}