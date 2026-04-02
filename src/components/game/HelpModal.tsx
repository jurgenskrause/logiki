import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <span className="material-icons text-blue-500">help_outline</span>
            How to Play
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar text-slate-700 dark:text-slate-300">
          
          <section className="space-y-2">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="material-icons text-indigo-500 text-base">flag</span>
              Objective
            </h4>
            <p className="text-sm leading-relaxed">
              Logiki is a deductive logic puzzle. Your goal is to figure out the exact position of every item on the grid using the provided logical clues. Every column represents a single "house" or space, and items in the same column belong together.
            </p>
          </section>

          <section className="space-y-4">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="material-icons text-emerald-500 text-base">touch_app</span>
              Controls
            </h4>

            {/* Desktop Controls (hidden on mobile) */}
            <div className="hidden md:block bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-3">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">Desktop Interaction</p>
              <ul className="text-sm space-y-3">
                <li className="flex items-start gap-2">
                  <span className="material-icons text-red-400 text-lg shrink-0">close</span>
                  <div>
                    <strong>Eliminate a choice:</strong> Left-click on an item in a cell to rule it out.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-emerald-400 text-lg shrink-0">check</span>
                  <div>
                    <strong>Solve a cell:</strong> Right-click on an item to confirm it belongs in that column.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-blue-400 text-lg shrink-0">info</span>
                  <div>
                    <strong>Explain Clue:</strong> Hover over a clue to read its rule in the top bar.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-amber-400 text-lg shrink-0">delete_sweep</span>
                  <div>
                    <strong>Bin Clue:</strong> Right-click a clue when you're done with it to move it out of the way. Double tap to see an expanded explanation.
                  </div>
                </li>
              </ul>
            </div>

            {/* Mobile Controls (hidden on desktop) */}
            <div className="block md:hidden bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-3">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">Mobile Interaction</p>
              <ul className="text-sm space-y-3">
                <li className="flex items-start gap-2">
                  <span className="material-icons text-red-400 text-lg shrink-0">close</span>
                  <div>
                    <strong>Eliminate a choice:</strong> Short tap on an item in a cell.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-emerald-400 text-lg shrink-0">check</span>
                  <div>
                    <strong>Solve a cell:</strong> Long press on an item in a cell to confirm it.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-amber-400 text-lg shrink-0">delete_sweep</span>
                  <div>
                    <strong>Bin Clue:</strong> Long press a clue to discard it to the bin.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-icons text-blue-400 text-lg shrink-0">info</span>
                  <div>
                    <strong>Explain Clue:</strong> Double tap a clue to see an expanded explanation of the rule.
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-2 pt-2">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="material-icons text-amber-500 text-base">lightbulb</span>
              Hints & Undo
            </h4>
            <p className="text-sm leading-relaxed">
              If you get stuck, use the <span className="material-icons text-[14px] align-middle px-1">lightbulb</span> <strong>Hint</strong> button. The first tap reveals the logical reasoning in the top bar. A second tap will automatically apply that deduction for you. You can always use the undo/redo buttons if you make a mistake.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm shadow-indigo-500/20"
          >
            Got it, let's play!
          </button>
        </div>
      </div>
    </div>
  );
};
