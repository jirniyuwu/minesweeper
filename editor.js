let rows;
let columns;

let wallTiles = [];
let lockedTiles = [];

let mousePressed = false;
let selector = 'blank';
let isShifting = false;

function int(num) {return parseInt(num, 10)}
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
}) 
document.addEventListener('keyup', (event) => {
    if (!event.shiftKey) {
        isShifting = false;
    }
}) 

document.querySelectorAll('input[name="button_select"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        selector = event.target.value;
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
}

function editButton(button) {
    let id = int(button.id.replace('button', ''))
    switch (selector) {
        case 'blank':
            wallTiles.filter(value => value != id);
            lockedTiles.filter(value => value != id);
            button.classList.remove('ed_wall_button', 'ed_locked_button');
            button.classList.add('ed_button');
            break;
        case 'locked':
            if (!lockedTiles.includes(id)) {lockedTiles.push(id)}
            wallTiles.filter(value => value != id);
            button.classList.add('ed_locked_button');
            button.classList.remove('ed_wall_button', 'ed_button');
            break;
        case 'wall':
            if (!wallTiles.includes(id)) {wallTiles.push(id)}
            lockedTiles.filter(value => value != id);
            button.classList.add('ed_wall_button');
            button.classList.remove('ed_locked_button', 'ed_button');
            break;
        default:
            break;
    }
}

function resetField() {
    wallTiles = [];
    lockedTiles = [];

    refreshField();
}

function exportSet() {
    if (!isShifting) {
        let json = '';
        json += `"${rows}x${columns}": [\n[\n`
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
        json += ']\n]'

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

function exportButton() {
    try {
        navigator.clipboard.writeText(exportSet())
        let text = document.querySelector('.text_export');
        text.classList.add('text_animation');
        text.addEventListener('animationend', (event) => {
            text.classList.remove('text_animation');
        })
    } catch (error) {
        alert('failed to copy')
    }
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
    }
});