import fs from 'fs';

function addProp(filename) {
  let f = fs.readFileSync(filename, 'utf8');
  
  // Add to Interface
  f = f.replace('scrollToClueId?: any;', 'scrollToClueId?: any;\n  onClueDoubleTap?: any;');
  
  // Add to FC definition (replacing onMoveClue, with onMoveClue, onClueDoubleTap,)
  f = f.replace('scrollToClueId, onMoveClue,', 'scrollToClueId, onMoveClue, onClueDoubleTap,');
  
  // Add to onDoubleTap prop injection
  f = f.replace(/onDoubleTap=\{[\s\S]*?\}/g, 'onDoubleTap={() => { if (typeof onClueDoubleTap === "function") onClueDoubleTap(item); }}');

  fs.writeFileSync(filename, f);
}

addProp('src/client/components/game/clue/HorizontalClueList.tsx');
addProp('src/client/components/game/clue/VerticalClueList.tsx');
