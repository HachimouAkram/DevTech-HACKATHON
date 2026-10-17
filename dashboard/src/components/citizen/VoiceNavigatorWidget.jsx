import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, X, Check, ArrowDown, ArrowUp } from 'lucide-react';

export default function VoiceNavigatorWidget({ enabled, onToggle }) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setFeedback('Parlez maintenant (ex: "Accueil", "Mes demandes", "Rendez-vous", "Profil")...');
    };

    recognition.onresult = (event) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);

      if (event.results[0].isFinal) {
        processCommand(current.toLowerCase());
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setFeedback('Microphone non autorisé.');
      } else {
        setFeedback('Commande non reconnue.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const speak = (text, onEnd) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      if (onEnd) utterance.onend = onEnd;
      window.speechSynthesis.speak(utterance);
    } else if (onEnd) {
      onEnd();
    }
  };

  const processCommand = (cmd) => {
    const text = cmd.trim();

    if (text.includes('accueil') || text.includes('tableau de bord') || text.includes('home')) {
      speak('Navigation vers l\'accueil', () => navigate('/citoyen'));
      setFeedback('Navigation vers Accueil');
    } else if (text.includes('mes demande') || text.includes('demande') || text.includes('dossier') || text.includes('historique')) {
      speak('Affichage de vos demandes', () => navigate('/citoyen/demandes'));
      setFeedback('Navigation vers Mes demandes');
    } else if (text.includes('rendez-vous') || text.includes('rendez vous') || text.includes('rdv') || text.includes('planning')) {
      speak('Affichage de vos rendez-vous', () => navigate('/citoyen/rendez-vous'));
      setFeedback('Navigation vers Rendez-vous');
    } else if (text.includes('profil') || text.includes('compte') || text.includes('paramètre') || text.includes('reglage')) {
      speak('Ouverture de votre profil et paramètres', () => navigate('/citoyen/profil'));
      setFeedback('Navigation vers Profil & Paramètres');
    } else if (text.includes('nouvelle') || text.includes('créer') || text.includes('commencer')) {
      speak('Création d\'une nouvelle demande', () => navigate('/citoyen/demande/nouvelle'));
      setFeedback('Navigation vers Nouvelle Demande');
    } else if (text.includes('acte') || text.includes('télécharger') || text.includes('pdf')) {
      speak('Affichage de vos actes téléchargés', () => navigate('/citoyen/actes'));
      setFeedback('Navigation vers Mes Actes');
    } else if (text.includes('descendre') || text.includes('bas')) {
      speak('Défilement vers le bas');
      window.scrollBy({ top: 500, behavior: 'smooth' });
      setFeedback('Défilement vers le bas');
    } else if (text.includes('monter') || text.includes('haut')) {
      speak('Défilement vers le haut');
      window.scrollBy({ top: -500, behavior: 'smooth' });
      setFeedback('Défilement vers le haut');
    } else {
      speak('Commande non reconnue. Dites Accueil, Demandes, Rendez-vous ou Profil.');
      setFeedback('Commande non reconnue.');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  if (!enabled) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '96px',
      right: '24px',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px'
    }}>
      {/* Feedback Popover */}
      {(isListening || feedback) && (
        <div style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '12px 16px',
          maxWidth: '280px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', color: '#60a5fa', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assistant Vocal
            </span>
            <button
              onClick={() => { setFeedback(''); setTranscript(''); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
          {transcript && (
            <div style={{ fontStyle: 'italic', color: '#f8fafc', fontWeight: '500' }}>
              "{transcript}"
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: isListening ? '#34d399' : '#cbd5e1' }}>
            {feedback}
          </div>
        </div>
      )}

      {/* Main Microphone Button */}
      <button
        type="button"
        onClick={toggleListening}
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '27px',
          backgroundColor: isListening ? '#ef4444' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 6px 20px rgba(37, 99, 235, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          transform: isListening ? 'scale(1.08)' : 'scale(1)'
        }}
        title={isListening ? 'Arrêter l\'écoute' : 'Activer la navigation vocale'}
      >
        <Mic size={24} />
      </button>
    </div>
  );
}
