import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bot, X, Send, RotateCcw, ExternalLink,
  ArrowRight, ShieldCheck, FileText, Calendar, CheckCircle2,
  Volume2, VolumeX, MessageSquare, ChevronRight
} from 'lucide-react';

// Base de connaissances juridiques sénégalaises locales (Code de la Famille & Décrets d'application)
const LEGAL_KNOWLEDGE = [
  {
    keywords: ['naissance', 'juddu', 'enfant', 'bebe', 'accouchement', 'maternite', 'declarer', 'extrait'],
    title: "Extrait et Déclaration de Naissance",
    content: `**Régime légal de la déclaration de naissance au Sénégal :**\n\n• **Délai légal :** La déclaration doit être faite obligatoirement dans un délai de **1 mois** en commune urbaine (Dakar, Thiès, Kaolack...) et **3 mois** en zone rurale.\n• **Pièces à fournir :** Certificat d'accouchement de la maternité et CNI des parents.\n• **Frais officiels :** La déclaration est **gratuite**. Les extraits numériques certifiés sont délivrés rapidement via SenInnov.`,
    actions: [
      { label: "Demander un acte de naissance", url: "/citoyen/demande/nouvelle" },
      { label: "Mes actes disponibles", url: "/citoyen/actes" }
    ]
  },
  {
    keywords: ['mariage', 'sey', 'epoux', 'epouse', 'celebre', 'regime', 'monogamie', 'polygamie', 'dot'],
    title: "Certificat de Mariage & Régimes",
    content: `**Réglementation du mariage selon le Code de la Famille :**\n\n• **Mariage célébré à la mairie :** Enregistré immédiatement sur les registres officiels.\n• **Mariage constaté (religieux / coutumier) :** Doit être déclaré à l'officier d'état civil dans les **6 mois** suivant la célébration.\n• **Options :** Monogamie ou polygamie (2, 3 ou 4 épouses) et régime des biens (séparation ou communauté).`,
    actions: [
      { label: "Demander un certificat de mariage", url: "/citoyen/demande/nouvelle" },
      { label: "Prendre un rendez-vous mairie", url: "/citoyen/rendez-vous" }
    ]
  },
  {
    keywords: ['deces', 'mort', 'dee', 'inhumation', 'enterrement', 'heredite', 'succession'],
    title: "Déclaration de Décès & Permis d'inhumer",
    content: `**Démarches suite à un décès :**\n\n• **Délai :** Déclaration obligatoire dans un délai légal de **1 mois** auprès de la mairie du lieu de décès.\n• **Pièces indispensables :** Certificat médical de constatation de décès et pièce d'identité du défunt et du déclarant.\n• **Permis d'inhumer :** Délivré sans frais pour permettre l'inhumation.`,
    actions: [
      { label: "Déclarer un décès", url: "/citoyen/demande/nouvelle" }
    ]
  },
  {
    keywords: ['prix', 'cout', 'tarif', 'combien', 'frais', 'wave', 'orange money', 'gratuit', 'payer'],
    title: "Tarifs Officiels & Modalités de Paiement",
    content: `**Tarifs réglementaires officiels :**\n\n• **Déclaration initiale :** **0 FCFA (Gratuit)**.\n• **Extraits d'actes d'état civil :** 200 à 500 FCFA selon la délibération communale (droits de timbre).\n• **Paiement mobile instantané :** Wave, Orange Money et Carte Bancaire directement intégrés et sécurisés.\n• *Si une démarche est gratuite (0 FCFA), l'étape de paiement est automatiquement sautée.*`,
    actions: [
      { label: "Faire une demande d'acte", url: "/citoyen/demande/nouvelle" }
    ]
  },
  {
    keywords: ['wolof', 'kayit', 'juddu', 'naka', 'waxtu', 'faay', 'sama', 'lan'],
    title: "Ndimbal ci Kàllaama Wolof",
    content: `**Dalal ak jamm ! Mën nga ma laaj lépp lu jëm ci kayit yi :**\n\n• **Juddu :** Naka ngay amé kayitu juddu te dëggu ci waxtu wi.\n• **Sëy :** Kayitu sëy ak li koy laaj.\n• **Dee :** Kayitu dee ak ndigalul suul.\n• **Peyma :** Feye ci Wave walla Orange Money ci anam bu gaaw te wóor.`,
    actions: [
      { label: "Tambali sa dëpp", url: "/citoyen/demande/nouvelle" }
    ]
  }
];

export default function CitizenAiFloatingWidget({ user }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const messagesEndRef = useRef(null);

  const citizenName = user?.nom_complet ? user.nom_complet.split(' ')[0] : 'Citoyen';

  // Initialisation des messages
  useEffect(() => {
    const saved = localStorage.getItem(`seninnov_citizen_widget_${user?.id || 'guest'}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch (e) { /* ignore */ }
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour **${citizenName}** 👋 Je suis votre **Assistant IA Citoyen SenInnov**.\n\nJe réponds à toutes vos questions sur les démarches d'état civil (extraits de naissance, mariage, décès, délais légaux, tarifs Wave/OM et rendez-vous).\n\n*Vous pouvez aussi me poser des questions en Wolof !*`,
        actions: [
          { label: "Extrait de naissance", query: "Comment obtenir un extrait de naissance ?" },
          { label: "Tarifs officiels", query: "Quels sont les tarifs des actes ?" },
          { label: "Prendre RDV", url: "/citoyen/rendez-vous" }
        ]
      }
    ]);
  }, [user]);

  // Sauvegarde des messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`seninnov_citizen_widget_${user?.id || 'guest'}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Moteur de recherche de connaissances juridiques
  const queryLegalEngine = (queryText) => {
    const q = queryText.toLowerCase();
    for (const item of LEGAL_KNOWLEDGE) {
      if (item.keywords.some(k => q.includes(k))) {
        return {
          content: `### ${item.title}\n\n${item.content}`,
          actions: item.actions
        };
      }
    }
    return {
      content: `### Assistance Administrative SenInnov\n\nPour vos démarches d'état civil au Sénégal :\n\n• **Dépôt en ligne :** Cliquez sur **"Nouvelle Demande"**, choisissez votre centre et remplissez les pièces demandées.\n• **Suivi en direct :** Rendez-vous dans **"Mes Démarches"** pour voir l'état d'instruction de votre dossier.\n• **Téléchargement sécurisé :** Dès signature officielle, votre acte certifié avec cachet 2D-Doc est accessible dans **"Mes Actes PDF"**.\n\n*Avez-vous une question précise sur un acte de naissance, mariage ou décès ?*`,
      actions: [
        { label: "Nouvelle démarche", url: "/citoyen/demande/nouvelle" },
        { label: "Suivre mes demandes", url: "/citoyen/demandes" }
      ]
    };
  };

  const handleSend = async (queryOverride) => {
    const textToSend = (queryOverride || input).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const hostname = window.location.hostname;
      const res = await fetch(`http://${hostname}:8000/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: {
            user_id: user?.id,
            nom: user?.nom_complet,
            role: 'citoyen'
          }
        }),
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.response || data.message || data.reply;
        const botMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          actions: queryLegalEngine(textToSend).actions
        };
        setMessages([...nextMessages, botMessage]);
        return;
      }
    } catch (e) {
      // Repli sur le moteur expert local en cas d'indisponibilité
    } finally {
      setLoading(false);
    }

    setTimeout(() => {
      const expertResult = queryLegalEngine(textToSend);
      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: expertResult.content,
        actions: expertResult.actions
      };
      setMessages([...nextMessages, botMessage]);
      setLoading(false);
    }, 400);
  };

  const handleResetChat = () => {
    localStorage.removeItem(`seninnov_citizen_widget_${user?.id || 'guest'}`);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `Discussion réinitialisée. Bonjour **${citizenName}**, que puis-je faire pour vous aider ?`,
        actions: [
          { label: "Extrait de naissance", query: "Comment obtenir un extrait de naissance ?" },
          { label: "Tarifs officiels", query: "Quels sont les tarifs des actes ?" }
        ]
      }
    ]);
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (speechActive) {
      window.speechSynthesis.cancel();
      setSpeechActive(false);
      return;
    }
    const clean = text.replace(/[*_#•]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;
    utterance.onend = () => setSpeechActive(false);
    utterance.onerror = () => setSpeechActive(false);
    setSpeechActive(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* ── BOUTON FLOTTANT ASSISTANT IA CITOYEN ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Assistant IA Citoyen SenInnov"
        className="citizen-ai-fab"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255,255,255,0.25)',
          boxShadow: '0 10px 28px rgba(37,99,235,0.42)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(90deg) scale(0.95)' : 'scale(1)'
        }}
      >
        {isOpen ? (
          <X size={26} />
        ) : (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={26} />
            {/* Pastille pulsante verte "en ligne" */}
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #ffffff',
              boxShadow: '0 0 10px #10b981'
            }} />
          </div>
        )}
      </button>

      {/* ── FENÊTRE FLOTTANTE DE CHAT CITOYEN ── */}
      {isOpen && (
        <div
          className="citizen-ai-card"
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '570px',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '24px',
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            color: 'var(--c-text-primary, #0f172a)',
            border: '1px solid var(--c-border, #e2e8f0)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            animation: 'slideUpWidget 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header moderne avec badges */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                <Bot size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Assistant IA Citoyen</span>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    padding: '1px 6px',
                    borderRadius: '999px'
                  }}>24h/24</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
                  <span>Français & Wolof</span>
                </div>
              </div>
            </div>

            {/* Actions du header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Plein écran / Page dédiée */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/citoyen/assistant-ia');
                }}
                title="Ouvrir en plein écran"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ExternalLink size={16} />
              </button>

              {/* Réinitialiser */}
              <button
                type="button"
                onClick={handleResetChat}
                title="Effacer la discussion"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RotateCcw size={15} />
              </button>

              {/* Fermer */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fermer"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── ZONE DE DISCUSSION / MESSAGES ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'var(--c-bg-subtle, #f8fafc)'
          }}>
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                    maxWidth: '88%'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: isAssistant ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                    backgroundColor: isAssistant ? 'var(--c-bg-card, #ffffff)' : '#2563eb',
                    color: isAssistant ? 'var(--c-text-primary, #0f172a)' : '#ffffff',
                    border: isAssistant ? '1px solid var(--c-border, #e2e8f0)' : 'none',
                    boxShadow: isAssistant ? '0 2px 8px rgba(0,0,0,0.04)' : '0 4px 12px rgba(37,99,235,0.25)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}

                    {/* Bouton lecture vocale si assistant */}
                    {isAssistant && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => speakText(msg.content)}
                          title="Écouter la réponse"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--c-text-muted, #64748b)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: '600'
                          }}
                        >
                          {speechActive ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} />}
                          <span>Écouter</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions directes proposées par l'assistant */}
                  {isAssistant && msg.actions && msg.actions.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '8px'
                    }}>
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => {
                            if (act.url) {
                              setIsOpen(false);
                              navigate(act.url);
                            } else if (act.query) {
                              handleSend(act.query);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--c-bg-card, #ffffff)',
                            border: '1px solid var(--c-border, #cbd5e1)',
                            color: '#2563eb',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                          }}
                        >
                          <span>{act.label}</span>
                          <ArrowRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Animation de chargement */}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '12px 18px',
                borderRadius: '18px 18px 18px 4px',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                border: '1px solid var(--c-border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="dot-loader" style={{ animationDelay: '0s' }} />
                <span className="dot-loader" style={{ animationDelay: '0.2s' }} />
                <span className="dot-loader" style={{ animationDelay: '0.4s' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)', marginLeft: '4px' }}>
                  L'IA formule votre réponse juridique...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── CHIPS DE SUGGESTIONS RAPIDES ── */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '8px 12px',
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderTop: '1px solid var(--c-border, #e2e8f0)',
            scrollbarWidth: 'none'
          }}>
            {[
              "Extrait de naissance",
              "Tarifs et paiements",
              "Certificat de mariage",
              "Prendre RDV",
              "Wakhtane ci Wolof"
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  color: 'var(--c-text-secondary, #475569)',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* ── ZONE DE SAISIE ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--c-border, #e2e8f0)',
              backgroundColor: 'var(--c-bg-card, #ffffff)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question (FR ou Wolof)..."
              disabled={loading}
              style={{
                flex: 1,
                height: '42px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-input, #ffffff)',
                color: 'var(--c-text-primary, #0f172a)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: input.trim() && !loading ? '#2563eb' : 'var(--c-bg-subtle, #e2e8f0)',
                color: input.trim() && !loading ? '#ffffff' : 'var(--c-text-muted, #94a3b8)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes slideUpWidget {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dot-loader {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563eb;
          display: inline-block;
          animation: dotBounce 1.2s infinite ease-in-out;
        }
        @keyframes dotBounce {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
