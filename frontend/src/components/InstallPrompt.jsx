import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      const hasDismissed = localStorage.getItem('guardx_pwa_dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('guardx_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-[#15BCDF] text-white p-4 rounded-xl shadow-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Install GuardX App</h3>
            <p className="text-white/80 text-sm">Add to your home screen for quick access and notifications.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleDismiss}
            className="p-2 text-white/80 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleInstallClick}
            className="flex-1 sm:flex-none bg-white text-[#15BCDF] px-6 py-2 rounded-full font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            Install
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
