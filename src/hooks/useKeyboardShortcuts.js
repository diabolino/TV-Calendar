import { useEffect } from 'react';

// Hook pour gérer les raccourcis clavier
export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignorer si on est dans un input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Trouver le raccourci correspondant
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = s.shift ? event.shiftKey : true;
        const altMatch = s.alt ? event.altKey : true;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// Raccourcis prédéfinis
export const SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Rechercher une série' },
  DASHBOARD: { key: 'd', description: 'Aller au Dashboard' },
  CALENDAR: { key: 'c', description: 'Aller au Calendrier' },
  TO_WATCH: { key: 't', description: 'Aller à "À regarder"' },
  MY_SHOWS: { key: 's', description: 'Aller à "Mes Séries"' },
  REFRESH: { key: 'r', ctrl: true, description: 'Rafraîchir les données' },
  HELP: { key: '?', shift: true, description: 'Afficher l\'aide' },
  ESCAPE: { key: 'Escape', description: 'Fermer les modals' },
};
