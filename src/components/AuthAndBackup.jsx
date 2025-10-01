// src/components/AuthAndBackup.jsx
import React, { useState, useRef } from 'react';
import { Cloud, CloudOff, Download, Upload, LogIn, LogOut, User } from 'lucide-react';

const AuthAndBackup = ({ 
  user, 
  onSignIn, 
  onSignOut, 
  onSync, 
  onExport, 
  onImport,
  isSyncing 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
    e.target.value = ''; // Reset pour permettre le même fichier
  };

  return (
    <div className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          user 
            ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50' 
            : 'bg-white/5 hover:bg-white/10 border border-white/10'
        }`}
      >
        {user ? (
          <>
            <Cloud className="w-5 h-5" />
            <span className="hidden md:inline">
              {user.email?.split('@')[0]}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-5 h-5" />
            <span className="hidden md:inline">Hors ligne</span>
          </>
        )}
      </button>

      {/* Menu déroulant */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                user ? 'bg-green-600/20 text-green-400' : 'bg-white/10 text-gray-400'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {user ? (
                  <>
                    <p className="font-semibold truncate">{user.email}</p>
                    <p className="text-xs text-gray-400">Sync cloud active</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Non connecté</p>
                    <p className="text-xs text-gray-400">Mode hors ligne</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions Firebase */}
          <div className="p-2 border-b border-white/10">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              Cloud Sync
            </p>
            
            {user ? (
              // Utilisateur connecté - Afficher Sync et Déconnexion
              <>
                <button
                  onClick={() => { onSync(); setShowMenu(false); }}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 text-left"
                >
                  <Cloud className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
                  <div className="flex-1">
                    <p className="font-semibold">Synchroniser</p>
                    <p className="text-xs text-gray-400">
                      {isSyncing ? 'Sync en cours...' : 'Sauvegarder sur le cloud'}
                    </p>
                  </div>
                </button>
            
                <button
                  onClick={() => { onSignOut(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-semibold">Déconnexion</p>
                    <p className="text-xs text-gray-400">Passer en mode local</p>
                  </div>
                </button>
              </>
            ) : (
              // Utilisateur NON connecté - Afficher formulaire de connexion
              <>
                {showEmailForm ? (
                  <div className="p-3 space-y-3">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Mot de passe"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (emailInput && passwordInput) {
                            onSignIn(emailInput, passwordInput, false);
                            setShowEmailForm(false);
                            setEmailInput('');
                            setPasswordInput('');
                            setShowMenu(false);
                          }
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition-all"
                      >
                        Connexion
                      </button>
                      <button
                        onClick={() => {
                          if (emailInput && passwordInput) {
                            onSignIn(emailInput, passwordInput, true);
                            setShowEmailForm(false);
                            setEmailInput('');
                            setPasswordInput('');
                            setShowMenu(false);
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-all"
                      >
                        Inscription
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowEmailForm(false);
                        setEmailInput('');
                        setPasswordInput('');
                      }}
                      className="w-full text-gray-400 hover:text-white text-sm transition-all"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-left"
                  >
                    <LogIn className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-semibold">Se connecter</p>
                      <p className="text-xs text-gray-400">Sync entre machines</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Actions Export/Import */}
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              Backup Manuel
            </p>

            <button
              onClick={() => { onExport(); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-left"
            >
              <Download className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold">Exporter</p>
                <p className="text-xs text-gray-400">Télécharger un backup JSON</p>
              </div>
            </button>

            <button
              onClick={() => { handleImportClick(); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-left"
            >
              <Upload className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold">Importer</p>
                <p className="text-xs text-gray-400">Restaurer depuis un backup</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-white/5 text-xs text-gray-400">
            💡 Les données sont automatiquement sauvegardées localement
          </div>
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default AuthAndBackup;