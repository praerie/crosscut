
async function loadWords() {
  const res = await fetch('data/terms.json');
  const terms = await res.json();
  return terms;
}

function pickIntersectingTerms(terms) {
  for (let i = 0; i < 3000; i++) {
    const shuffled = terms.sort(() => 0.5 - Math.random());
    const [a, b, c] = shuffled;

    const ab = findIntersection(a.term, b.term);
    const ac = findIntersection(a.term, c.term);
    const bc = findIntersection(b.term, c.term);

    if (ab && (ac || bc)) return [a, b, c];
  }

  // fallback
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

function buildGrid(w1, w2, w3) {
  const sorted = [w1, w2, w3].sort((a, b) => b.length - a.length);
  const word2 = sorted[0]; // horizontal
  const word1 = sorted[1]; // vertical
  const word3 = sorted[2]; // third to intersect

  const layout = {};
  const centerX = 7;
  const centerY = 7;

  const inter12 = findIntersection(word1, word2);
  if (!inter12) return null;

  // place word1 vertically
  for (let i = 0; i < word1.length; i++) {
    const y = centerY - inter12.w1Index + i;
    layout[`${centerX},${y}`] = word1[i];
  }

  // place word2 horizontally
  for (let i = 0; i < word2.length; i++) {
    const x = centerX - inter12.w2Index + i;
    const y = centerY;
    const key = `${x},${y}`;
    if (layout[key] && layout[key] !== word2[i]) return null;
    layout[key] = word2[i];
  }

  const inter13 = findIntersection(word1, word3);
  const inter23 = findIntersection(word2, word3);
  let connected = false;

  if (inter13) {
    // word3 placed horizontally, intersecting vertical word1
    const yOfShared = centerY - inter12.w1Index + inter13.w1Index;
    let finalY = yOfShared;

    if (Math.abs(finalY - centerY) <= 1) {
      finalY = finalY < centerY ? centerY - 2 : centerY + 2;
    }

    const xStart = centerX - inter13.w2Index;

    for (let i = 0; i < word3.length; i++) {
      const x = xStart + i;
      const y = finalY;
      const key = `${x},${y}`;
      if (layout[key] && layout[key] !== word3[i]) return null;
      layout[key] = word3[i];
      if (i === inter13.w2Index) connected = true;
    }

  } else if (inter23) {
    // word3 placed vertically, intersecting horizontal word2
    const xOfShared = centerX - inter12.w2Index + inter23.w1Index;
    let finalX = xOfShared;

    if (Math.abs(finalX - centerX) <= 1) {
      finalX = finalX < centerX ? centerX - 2 : centerX + 2;
    }

    const yStart = centerY - inter23.w2Index;

    for (let i = 0; i < word3.length; i++) {
      const x = finalX;
      const y = yStart + i;
      const key = `${x},${y}`;
      if (layout[key] && layout[key] !== word3[i]) return null;
      layout[key] = word3[i];
      if (i === inter23.w2Index) connected = true;
    }
  }

  if (!connected) return null;
  return layout;
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
      cell.className = 'letter-cell';
      const key = `${x},${y}`;
      if (layout[key]) {
        cell.textContent = layout[key];
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
