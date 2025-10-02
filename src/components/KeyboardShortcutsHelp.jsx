import React from 'react';
import { Keyboard, X } from 'lucide-react';

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Rechercher une série' },
    { keys: ['D'], description: 'Aller au Dashboard' },
    { keys: ['C'], description: 'Aller au Calendrier' },
    { keys: ['T'], description: 'Aller à "À regarder"' },
    { keys: ['S'], description: 'Aller à "Mes Séries"' },
    { keys: ['Ctrl', 'R'], description: 'Rafraîchir les données' },
    { keys: ['Shift', '?'], description: 'Afficher cette aide' },
    { keys: ['Echap'], description: 'Fermer les modals' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-300 dark:border-white/20" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Raccourcis Clavier</h2>
                <p className="text-purple-100 text-sm">Gagnez du temps avec ces raccourcis</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-300 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500/50 transition-all"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-2">
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-gray-400">+</span>}
                      <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-white/20 rounded-lg font-mono text-sm font-bold shadow-sm">
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Astuce :</strong> Les raccourcis ne fonctionnent pas lorsque vous êtes dans un champ de saisie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
