async function loadWords() {
  const res = await fetch('data/terms.json');
  const terms = await res.json();
  return terms;
}

function findIntersection(word1, word2) {
  for (let i = 0; i < word1.length; i++) {
    const char = word1[i];
    const indexInWord2 = word2.indexOf(char);
    if (indexInWord2 !== -1) {
      return { w1Index: i, w2Index: indexInWord2 };
    }
  }
  return null;
}

function pickIntersectingTerms(terms) {
  const MAX_VERTICAL_LENGTH = 9;

  for (let i = 0; i < 3000; i++) {
    const shuffled = terms.sort(() => 0.5 - Math.random());

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

function buildGrid(horizontal1, horizontal2, vertical) {
  const layout = {};
  const centerX = 7;
  const centerY = 7;

  const usedHorizontalRows = new Set();

  const inter1 = findIntersection(vertical, horizontal1);
  if (!inter1) return null;

  const vertStartY = centerY - inter1.w1Index;

  for (let i = 0; i < vertical.length; i++) {
    const y = vertStartY + i;
    layout[`${centerX},${y}`] = vertical[i];
  }

  const horiz1Y = centerY;
  const horiz1StartX = centerX - inter1.w2Index;

  for (let i = 0; i < horizontal1.length; i++) {
    const x = horiz1StartX + i;
    const key = `${x},${horiz1Y}`;
    const existing = layout[key];
    if (existing && existing !== horizontal1[i]) return null;
    layout[key] = horizontal1[i];
  }

  usedHorizontalRows.add(horiz1Y);

  const inter2 = findIntersection(vertical, horizontal2);
  if (!inter2) return null;

  const horiz2Y = vertStartY + inter2.w1Index;
  for (const row of usedHorizontalRows) {
    const MIN_SPACING = 1;
    if (Math.abs(row - horiz2Y) <= MIN_SPACING && row !== horiz2Y) {
      return null;
    }
  }

  const horiz2StartX = centerX - inter2.w2Index;

  if (usedHorizontalRows.has(horiz2Y)) return null;

  for (let i = 0; i < horizontal2.length; i++) {
    const x = horiz2StartX + i;
    const key = `${x},${horiz2Y}`;
    const existing = layout[key];
    if (existing && existing !== horizontal2[i]) return null;
    layout[key] = horizontal2[i];
  }

  usedHorizontalRows.add(horiz2Y);
  return layout;
}

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

  const inputs = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      const key = `${x},${y}`;

      if (layout[key]) {
        const char = layout[key];

        if (/[a-z]/i.test(char)) {
          const input = document.createElement('input');
          input.setAttribute('maxlength', 1);
          input.dataset.answer = char.toLowerCase();
          input.className = 'input-cell';
          input.dataset.x = x;
          input.dataset.y = y;
          inputs.push(input);
          cell.appendChild(input);
        } else {
          cell.textContent = char;
          if (/\d/.test(char)) {
            cell.classList.add('digit-cell');
          } else {
            cell.classList.add('non-alpha-cell');
          }
        }
      }

      container.appendChild(cell);
    }
  }

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    input.addEventListener('input', () => {
      if (input.value && i + 1 < inputs.length) {
        inputs[i + 1].focus();
      }
    });
  }
}

function displayClues(terms) {
  document.getElementById('clue-1').textContent = 'Act I: ' + terms[0].clue;
  document.getElementById('clue-2').textContent = 'Act II: ' + terms[1].clue;
  document.getElementById('clue-3').textContent = 'Act III: ' + terms[2].clue;
}

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
