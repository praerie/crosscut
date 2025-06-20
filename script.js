// load list of crossword terms from JSON file
async function loadWords() {
  const res = await fetch('data/terms.json');
  if (!res.ok) throw new Error("Failed to load terms!");
  const terms = await res.json();
  return terms;
}

/* This function looks for *all shared characters* between two words.
   For each shared letter, it records both the index in word1 and the index in word2.
   It returns an array of these intersection points, or an empty array if none exist. */
function findIntersections(word1, word2) {
  const intersections = [];

  // loop through each character in word1
  for (let i = 0; i < word1.length; i++) {
    const char = word1[i];

    // loop through each character in word2 to find *all* matches
    for (let j = 0; j < word2.length; j++) {
      if (word2[j] === char) {
        // if there's a match, store the index pair
        intersections.push({ w1Index: i, w2Index: j });
      }
    }
  }

  return intersections; // could be empty if no matches found
}

// performs an in-place Fisher–Yates shuffle on the array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // pick random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];   // swap elements
  }
  return array;
}

// attempts to pick 3 terms (2 horizontal, 1 vertical) that can intersect in a valid crossword layout
function pickIntersectingTerms(terms) {
  const MAX_VERTICAL_LENGTH = 9;
  const MAX_ATTEMPTS = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const shuffled = shuffle([...terms]);

    for (let a = 0; a < shuffled.length; a++) {
      for (let b = 0; b < shuffled.length; b++) {
        if (b === a) continue;
        for (let c = 0; c < shuffled.length; c++) {
          if (c === a || c === b) continue;

          const vertical = shuffled[a].term;
          const h1 = shuffled[b].term;
          const h2 = shuffled[c].term;

          if (vertical.length > MAX_VERTICAL_LENGTH) continue;

          const layout = buildGrid(h1, h2, vertical);
          if (!layout) continue;

          const allTerms = [h1, h2, vertical];
          const inGrid = allTerms.every(term => {
            const letters = term.replace(/\s/g, "").split("");
            return letters.every(l => Object.values(layout).includes(l));
          });

          if (!inGrid) continue;

          return [
            { term: h1, clue: terms.find(t => t.term === h1).clue },
            { term: h2, clue: terms.find(t => t.term === h2).clue },
            { term: vertical, clue: terms.find(t => t.term === vertical).clue }
          ];
        }
      }
    }
  }

  return [
    { term: "*****", clue: "placeholder 1" },
    { term: "*****", clue: "placeholder 2" },
    { term: "*****", clue: "placeholder 3" }
  ];
}

// used to collect the actual answer key from the layout (not user input)
function collectWord(inputMap, layout, x, y, dx, dy) {
  let word = '';
  while (true) {
    const key = `${x},${y}`;
    const input = inputMap[key];
    if (!input) break;
    word += input.dataset.answer;
    x += dx;
    y += dy;
  }
  return word.toLowerCase();
}

/* Used to collect the user-typed input starting from a given cell,
   moving in a specific direction (dx, dy), until an empty cell or boundary is hit. */
function getTypedWord(inputMap, x, y, dx, dy) {
  let word = "";
  while (true) {
    const key = `${x},${y}`;
    const input = inputMap[key];
    if (!input || !input.value) break;
    word += input.value.toLowerCase();
    x += dx;
    y += dy;
  }
  return word;
}

// Tries to build the crossword grid with given terms, using all possible intersection pairs
function buildGrid(horizontal1, horizontal2, vertical) {
  const centerX = 7;
  const centerY = 7;

  const inter1List = findIntersections(vertical, horizontal1);
  const inter2List = findIntersections(vertical, horizontal2);

  for (const inter1 of inter1List) {
    for (const inter2 of inter2List) {
      const layout = {};
      const usedHorizontalRows = new Set();

      const vertStartY = centerY - inter1.w1Index;

      for (let i = 0; i < vertical.length; i++) {
        const y = vertStartY + i;
        layout[`${centerX},${y}`] = vertical[i];
      }

      const horiz1Y = centerY;
      const horiz1StartX = centerX - inter1.w2Index;

      let conflict = false;

      for (let i = 0; i < horizontal1.length; i++) {
        const x = horiz1StartX + i;
        const key = `${x},${horiz1Y}`;
        const existing = layout[key];
        if (existing && existing !== horizontal1[i]) {
          conflict = true;
          break;
        }
        layout[key] = horizontal1[i];
      }

      if (conflict) continue;
      usedHorizontalRows.add(horiz1Y);

      const horiz2Y = vertStartY + inter2.w1Index;
      const MIN_SPACING = 1;

      for (const row of usedHorizontalRows) {
        if (Math.abs(row - horiz2Y) <= MIN_SPACING && row !== horiz2Y) {
          conflict = true;
          break;
        }
      }

      if (conflict || usedHorizontalRows.has(horiz2Y)) continue;

      const horiz2StartX = centerX - inter2.w2Index;

      for (let i = 0; i < horizontal2.length; i++) {
        const x = horiz2StartX + i;
        const key = `${x},${horiz2Y}`;
        const existing = layout[key];
        if (existing && existing !== horizontal2[i]) {
          conflict = true;
          break;
        }
        layout[key] = horizontal2[i];
      }

      if (conflict) continue;

      return layout;
    }
  }

  return null;
}

let currentDirection = null;
let typingStarted = false;

// renders crossword grid to the DOM
function renderGrid(layout) {
  const container = document.getElementById('crossword-container');
  container.innerHTML = '';

  const coords = Object.keys(layout).map(key => key.split(',').map(Number));
  const xs = coords.map(([x]) => x);
  const ys = coords.map(([_, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${height}, 1fr)`;

  const inputMap = {};
  const inputs = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`;
      const cell = document.createElement('div');
      cell.className = 'grid-cell';

      const char = layout[key];
      if (char) {
        if (/[a-z0-9]/i.test(char)) {
          const input = document.createElement('input');
          input.setAttribute('maxlength', 1);
          input.className = 'input-cell';
          input.dataset.answer = char.toLowerCase();
          input.dataset.x = x;
          input.dataset.y = y;
          inputMap[key] = input;
          inputs.push(input);
          cell.appendChild(input);
        } else {
          cell.textContent = char;
          cell.classList.add('non-alpha-cell');
        }
      }

      container.appendChild(cell);
    }
  }

  function getNextInput(x, y, dx, dy) {
    while (true) {
      x += dx;
      y += dy;
      const key = `${x},${y}`;
      const input = inputMap[key];
      if (!layout[key]) return null; // stop if outside layout
      if (input) return input; // return next valid input cell
    }
  }

  for (const input of inputs) {
    input.addEventListener('focus', () => {
      typingStarted = false;
      currentDirection = null;
    });

    input.addEventListener('input', () => {
      const val = input.value.toLowerCase();
      const x = parseInt(input.dataset.x, 10);
      const y = parseInt(input.dataset.y, 10);

      if (!val) return;

      if (!typingStarted) {
        typingStarted = true;

        const hasDown = inputMap[`${x},${y + 1}`];
        const hasRight = inputMap[`${x + 1},${y}`];

        currentDirection = hasDown ? 'down' : hasRight ? 'across' : 'across';
      }

      const next = currentDirection === 'down'
        ? getNextInput(x, y, 0, 1)
        : getNextInput(x, y, 1, 0);

      if (next) next.focus();
    });

    input.addEventListener('keydown', (e) => {
      const x = parseInt(input.dataset.x, 10);
      const y = parseInt(input.dataset.y, 10);

      if (e.key === 'Backspace') {
        e.preventDefault();
        input.value = '';
        const prev = currentDirection === 'across'
          ? getNextInput(x, y, -1, 0)
          : getNextInput(x, y, 0, -1);
        if (prev) prev.focus();
      }

      if (e.key === 'ArrowRight') {
        currentDirection = 'across';
        typingStarted = true;
      }
      if (e.key === 'ArrowDown') {
        currentDirection = 'down';
        typingStarted = true;
      }
    });
  }
}

// fills in clues for the player
function displayClues(terms) {
  document.getElementById('clue-1').textContent = 'Act I: ' + terms[0].clue;
  document.getElementById('clue-2').textContent = 'Act II: ' + terms[1].clue;
  document.getElementById('clue-3').textContent = 'Act III: ' + terms[2].clue;
}

// main entry point once the page loads
window.addEventListener('DOMContentLoaded', async () => {
  const terms = await loadWords();
  let selected, layout = null;
  let attempts = 0;

  while (!layout && attempts < 100) {
    selected = pickIntersectingTerms(terms);
    layout = buildGrid(selected[0].term, selected[1].term, selected[2].term);
    console.log("Attempt", attempts + 1, "Words:", selected.map(w => w.term), "Success:", !!layout);
    attempts++;
  }

  displayClues(selected);
  renderGrid(layout);
});
