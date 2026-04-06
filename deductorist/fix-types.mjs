import fs from 'fs';

function relaxTypes(filename) {
  let f = fs.readFileSync(filename, 'utf8');
  
  f = f.replace('highlightedClue?: string | null;', 'highlightedClue?: any;');
  f = f.replace('scrollToClueId?: (clueId: string) => void;', 'scrollToClueId?: any;');
  
  // Relax the UI bindings
  f = f.replace('isHighlighted={highlightedClue === item.id}', 'isHighlighted={highlightedClue === item.id || highlightedClue?.id === item.id || highlightedClue === item}');
  
  f = f.replace('onDoubleTap={() => scrollToClueId?.(item.id)}', 'onDoubleTap={() => { if (typeof scrollToClueId === "function") scrollToClueId(item.id); }}');
  f = f.replace('onDoubleTap={() => scrollToClueId?.(item.id)}', 'onDoubleTap={() => { if (typeof scrollToClueId === "function") scrollToClueId(item.id); }}');

  fs.writeFileSync(filename, f);
}

relaxTypes('src/client/components/game/clue/HorizontalClueList.tsx');
relaxTypes('src/client/components/game/clue/VerticalClueList.tsx');
