
async function loadWords() {
  const res = await fetch('data/terms.json');
  const terms = await res.json();
  return terms;
}

function pickIntersectingTerms(terms) {
  for (let i = 0; i < 3000; i++) {
    const shuffled = terms.sort(() => 0.5 - Math.random());
    const [a, b, c] = shuffled;

    const permutations = [
      [a.term, b.term, c.term],
      [a.term, c.term, b.term],
      [b.term, a.term, c.term],
      [b.term, c.term, a.term],
      [c.term, a.term, b.term],
      [c.term, b.term, a.term]
    ];

    for (const [h, v, iWord] of permutations) {
      const layout = buildGrid(h, v, iWord);
      if (layout) return [{ term: h, clue: terms.find(t => t.term === h).clue },
                          { term: v, clue: terms.find(t => t.term === v).clue },
                          { term: iWord, clue: terms.find(t => t.term === iWord).clue }];
    }
  }

  return [
    { term: "*****", clue: "placeholder 1" },
    { term: "*****", clue: "placeholder 2" },
    { term: "*****", clue: "placeholder 3" }
  ];
}

function displayClues(terms) {
  document.getElementById('clue-1').textContent = 'Act I: ' + terms[0].clue;
  document.getElementById('clue-2').textContent = 'Act II: ' + terms[1].clue;
  document.getElementById('clue-3').textContent = 'Act III: ' + terms[2].clue;
}

function findIntersection(word1, word2) {
  // loop through each character in the first word
  for (let i = 0; i < word1.length; i++) {
    const char = word1[i]; // get the current character from word1
    const indexInWord2 = word2.indexOf(char); // check if that character exists in word2

    // if the character is found in word2 (index is not -1)
    if (indexInWord2 !== -1) {
      // then return the indices where the match occurs in both words
      return { w1Index: i, w2Index: indexInWord2 };
    }
  }

  // if no matching character is found, return null
  return null;
}

function findNonAlphaChars(term) {
    pass
}

function buildGrid(horizontal, vertical, intersecting) {
  const layout = {};
  const centerX = 7;
  const centerY = 7;

  const interHV = findIntersection(vertical, horizontal);
  if (!interHV) return null;

  const vertStartY = centerY - interHV.w1Index;
  const horizStartX = centerX - interHV.w2Index;

  const usedRows = new Set();
  const usedCols = new Set();

  // Place vertical
  for (let i = 0; i < vertical.length; i++) {
    const y = vertStartY + i;
    layout[`${centerX},${y}`] = vertical[i];
    usedCols.add(centerX);
  }

  // Place horizontal
  for (let i = 0; i < horizontal.length; i++) {
    const x = horizStartX + i;
    const y = centerY;
    const key = `${x},${y}`;
    if (layout[key] && layout[key] !== horizontal[i]) return null;
    layout[key] = horizontal[i];
    usedRows.add(centerY);
  }

  // Try intersecting with vertical
  const interIV = findIntersection(vertical, intersecting);
  if (interIV) {
    const sharedY = vertStartY + interIV.w1Index;
    let yStart = sharedY;
    const xStart = centerX - interIV.w2Index;

    if (Array.from(usedRows).some(y => Math.abs(y - yStart) <= 1)) {
      yStart = yStart < centerY ? centerY - 2 : centerY + 2;
    }

    let connected = false;
    for (let i = 0; i < intersecting.length; i++) {
      const x = xStart + i;
      const y = yStart;
      const key = `${x},${y}`;
      if (layout[key] && layout[key] !== intersecting[i]) return null;
      layout[key] = intersecting[i];
      if (i === interIV.w2Index) connected = true;
    }
    if (connected) return layout;
  }

  // Try intersecting with horizontal
  const interIH = findIntersection(horizontal, intersecting);
  if (interIH) {
    const sharedX = horizStartX + interIH.w1Index;
    let xStart = sharedX;
    const yStart = centerY - interIH.w2Index;

    if (Array.from(usedCols).some(x => Math.abs(x - xStart) <= 1)) {
      xStart = xStart < centerX ? centerX - 2 : centerX + 2;
    }

    let connected = false;
    for (let i = 0; i < intersecting.length; i++) {
      const x = xStart;
      const y = yStart + i;
      const key = `${x},${y}`;
      if (layout[key] && layout[key] !== intersecting[i]) return null;
      layout[key] = intersecting[i];
      if (i === interIH.w2Index) connected = true;
    }
    if (connected) return layout;
  }

  return null;
}

function renderGrid(layout) {
  const container = document.getElementById('crossword-container');
  container.innerHTML = '';

  const coords = Object.keys(layout).map(key => key.split(',').map(Number));
  const xs = coords.map(([x, _]) => x);
  const ys = coords.map(([_, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${height}, 1fr)`;

  // render crossword grid 
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = document.createElement('div');
      
      const key = `${x},${y}`;
      if (layout[key]) {
        cell.textContent = layout[key];
        cell.className = 'letter-cell';
      }
      container.appendChild(cell);
    }
  }
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
