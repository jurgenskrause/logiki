import fs from 'fs';

// 1. HorizontalClueList.tsx
let f1 = fs.readFileSync('src/client/components/game/clue/HorizontalClueList.tsx', 'utf-8');
f1 = f1.replace('interface HorizontalClueListProps {', 'interface HorizontalClueListProps {\n  isDesktop?: boolean;');
f1 = f1.replace("const isDesktop = useMediaQuery('(min-width: 768px)');", '');
f1 = f1.replace('scrollToClueId, onMoveClue }) => {', 'scrollToClueId, onMoveClue, isDesktop = false }) => {');
f1 = f1.replace(/<HorizontalClueUI /g, '<HorizontalClueUI isDesktop={isDesktop} ');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueList.tsx', f1);

// 2. VerticalClueList.tsx
let f2 = fs.readFileSync('src/client/components/game/clue/VerticalClueList.tsx', 'utf-8');
f2 = f2.replace('interface VerticalClueListProps {', 'interface VerticalClueListProps {\n  isDesktop?: boolean;');
f2 = f2.replace("const isDesktop = useMediaQuery('(min-width: 768px)');", '');
f2 = f2.replace('scrollToClueId, onMoveClue }) => {', 'scrollToClueId, onMoveClue, isDesktop = false }) => {');
f2 = f2.replace(/<VerticalClueUI /g, '<VerticalClueUI isDesktop={isDesktop} ');
fs.writeFileSync('src/client/components/game/clue/VerticalClueList.tsx', f2);

// 3. HorizontalClueUI.tsx
let f3 = fs.readFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', 'utf-8');
f3 = f3.replace('interface HorizontalClueProps {', 'interface HorizontalClueProps {\n  isDesktop?: boolean;');
f3 = f3.replace("const isDesktop = useMediaQuery('(min-width: 768px)');", '');
f3 = f3.replace('onDoubleTap, dragHandleProps }) => {', 'onDoubleTap, dragHandleProps, isDesktop = false }) => {');
fs.writeFileSync('src/client/components/game/clue/HorizontalClueUI.tsx', f3);

// 4. VerticalClueUI.tsx
let f4 = fs.readFileSync('src/client/components/game/clue/VerticalClueUI.tsx', 'utf-8');
f4 = f4.replace('interface VerticalClueProps {', 'interface VerticalClueProps {\n  isDesktop?: boolean;');
f4 = f4.replace("const isDesktop = useMediaQuery('(min-width: 768px)');", '');
f4 = f4.replace('onDoubleTap, dragHandleProps }) => {', 'onDoubleTap, dragHandleProps, isDesktop = false }) => {');
fs.writeFileSync('src/client/components/game/clue/VerticalClueUI.tsx', f4);

// 5. GamePage.tsx
let f5 = fs.readFileSync('src/client/components/game/GamePage.tsx', 'utf-8');
f5 = f5.replace(/<HorizontalClueList /g, '<HorizontalClueList isDesktop={isDesktop} ');
f5 = f5.replace(/<VerticalClueList /g, '<VerticalClueList isDesktop={isDesktop} ');
fs.writeFileSync('src/client/components/game/GamePage.tsx', f5);
