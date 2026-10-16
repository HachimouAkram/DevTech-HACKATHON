import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, RotateCcw, Sparkles, Bot, Trash2 } from 'lucide-react';
import { useToast } from '../Toast';

export default function Chatbot({ user }) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const hostname = window.location.hostname;
  const AI_API_BASE = `http://${hostname}:8000/api/ai`;

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && user && !sessionId) {
      initSession();
    }
  }, [isOpen, user, sessionId]);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async function initSession() {
    try {
      const storedSess = localStorage.getItem(`teranga_chat_session_${user.id}`);
      if (storedSess) {
        setSessionId(storedSess);
        // Load messages for existing session
        await loadMessages(storedSess);
      } else {
        // Create new session
        const response = await fetch(`${AI_API_BASE}/sessions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ title: 'Discussion Assistant' })
        });
        if (!response.ok) throw new Error('Impossible de créer une session chat');
        const data = await response.json();
        setSessionId(data.id);
        localStorage.setItem(`teranga_chat_session_${user.id}`, data.id);
        // Welcome message based on role/permissions
        const isStaff = user?.permissions?.some(p => ['GERER_COMMUNE', 'GERER_CENTRE', 'GERER_ACTIVITES'].includes(p)) || user?.role === 'ADMIN';
        const userName = user?.nom_complet?.split(' ')[0] || 'Agent';
        const welcomeText = isStaff 
          ? `Bonjour **${userName}**, je suis votre assistant. Qu'est-ce que je peux faire pour vous aider ?`
          : `Bonjour **${userName}** ! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?`;
        setMessages([
          {
            sender: 'assistant',
            content: welcomeText
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur d'initialisation du chatbot", 'error');
    }
  }

  async function loadMessages(sessId) {
    try {
      const response = await fetch(`${AI_API_BASE}/sessions/${sessId}/messages`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const formatted = data.map(m => ({
            sender: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          }));
          setMessages(formatted);
        } else {
          const isStaff = user?.permissions?.some(p => ['GERER_COMMUNE', 'GERER_CENTRE', 'GERER_ACTIVITES'].includes(p)) || user?.role === 'ADMIN';
          const userName = user?.nom_complet?.split(' ')[0] || 'Agent';
          const welcomeText = isStaff 
            ? `Bonjour **${userName}**, je suis votre assistant. Qu'est-ce que je peux faire pour vous aider ?`
            : `Bonjour **${userName}** ! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?`;
          setMessages([
            {
              sender: 'assistant',
              content: welcomeText
            }
          ]);
        }
      } else {
        // Session might be deleted or expired
        localStorage.removeItem(`teranga_chat_session_${user.id}`);
        setSessionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }


  const handleClearHistory = async () => {
    if (!sessionId) return;
    if (!window.confirm("Voulez-vous réinitialiser cette discussion ?")) return;
    
    try {
      setLoading(true);
      await fetch(`${AI_API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      localStorage.removeItem(`teranga_chat_session_${user.id}`);
      setSessionId(null);
      setMessages([]);
      showToast("Discussion réinitialisée", "success");
      await initSession();
    } catch (err) {
      console.error(err);
      showToast("Impossible de supprimer l'historique", "error");
    } finally {
      setLoading(false);
    }
  };

  const getPageContext = () => {
    // Gather details about what the user is currently seeing on screen
    const path = window.location.pathname;
    let pageName = "Inconnu";
    
    if (path === '/dashboard') pageName = "Accueil du Tableau de bord";
    else if (path.includes('rapports')) pageName = "Rapports & Statistiques";
    else if (path.includes('pointage')) pageName = "Pointage & Présence";
    else if (path.includes('demandes')) pageName = "Gestion des Demandes";
    else if (path.includes('services')) pageName = "Gestion des Services et Activités";
    else if (path.includes('profil')) pageName = "Mon Profil";

    // Attempt to extract some visible summary text from the page (e.g. key performance indicators)
    const kpiElements = document.querySelectorAll('.kpi-number, .kpi-card h3, .presence-card, .custom-table');
    let stats = {};
    if (kpiElements.length > 0) {
      kpiElements.forEach((el, index) => {
        if (index < 6) {
          const parent = el.parentElement;
          const label = parent ? (parent.querySelector('.kpi-label, p') ? (parent.querySelector('.kpi-label, p').innerText) : `kpi_${index}`) : `stat_${index}`;
          stats[label.trim()] = el.innerText.trim();
        }
      });
    }

    return {
      page: path,
      pageName: pageName,
      role: user?.role || 'Non spécifié',
      permissions: user?.permissions || [],
      stats: stats,
      additional_info: `L'agent consulte la page "${pageName}" (${path}).`
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', content: userText }]);
    setLoading(true);

    try {
      const context = getPageContext();
      const response = await fetch(`${AI_API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          content: userText,
          context: context
        })
      });

      if (!response.ok) throw new Error("Le serveur AI n'a pas répondu correctement.");
      const data = await response.json();
      
      setMessages(prev => [...prev, { sender: 'assistant', content: data.content }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'assistant', content: "Désolé, j'ai rencontré un problème pour me connecter à mon serveur. Veuillez réessayer plus tard." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let renderedLine = line;
      
      // Bold markdown **text**
      renderedLine = renderedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Bullet list items
      if (renderedLine.trim().startsWith('* ') || renderedLine.trim().startsWith('- ')) {
        const cleanContent = renderedLine.replace(/^[\s*-]+/, '').trim();
        return (
          <li key={idx} dangerouslySetInnerHTML={{ __html: cleanContent }} style={{ marginLeft: '1.25rem', listStyleType: 'disc', marginBottom: '0.25rem' }} />
        );
      }
      
      return (
        <p key={idx} dangerouslySetInnerHTML={{ __html: renderedLine }} style={{ margin: '0.4rem 0', lineHeight: 1.4 }} />
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary, #0c9d5d) 0%, #064e3b 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(12, 157, 93, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(90deg) scale(0.9)' : 'scale(1)'
        }}
        className="chat-fab-button"
        title="Assistant IA Teranga"
      >
        {isOpen ? <X size={24} /> : (
          <div style={{ position: 'relative' }}>
            <MessageSquare size={24} />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px #10b981'
            }}></span>
          </div>
        )}
      </button>

      {/* Slide-out / Pop-up Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '6.5rem',
            right: '2rem',
            width: '380px',
            height: '520px',
            maxHeight: 'calc(100vh - 9rem)',
            borderRadius: '20px',
            background: 'var(--bg-secondary, #ffffff)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
            animation: 'slideUpChat 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="chatbot-panel"
        >
          {/* Header styling */}
          <div
            style={{
              padding: '1.25rem',
              background: 'linear-gradient(135deg, var(--primary, #0c9d5d) 0%, #064e3b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Teranga IA <Sparkles size={12} style={{ color: '#fbbf24' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  Assistant en ligne
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleClearHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Effacer l'historique"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages display container */}
          <div
            style={{
              flexGrow: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--bg-primary, #f8fafc)'
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.sender === 'user' ? 'var(--primary, #0c9d5d)' : 'var(--bg-secondary, #ffffff)',
                    color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary, #1e293b)',
                    fontSize: '0.88rem',
                    boxShadow: msg.sender === 'user' ? '0 3px 10px rgba(12,157,93,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color, rgba(0,0,0,0.06))'
                  }}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '82%', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--bg-secondary, #ffffff)',
                  border: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <span className="dot-loader" style={{ animationDelay: '0s' }}></span>
                  <span className="dot-loader" style={{ animationDelay: '0.2s' }}></span>
                  <span className="dot-loader" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary, #ffffff)',
              borderTop: '1px solid var(--border-color, rgba(0,0,0,0.08))',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Écrivez un message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flexGrow: 1,
                height: '40px',
                padding: '0 1rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '20px',
                outline: 'none',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.88rem'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: input.trim() ? 'var(--primary, #0c9d5d)' : 'var(--border-color, #e2e8f0)',
                color: '#ffffff',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Styled inline elements for slide animation and loading dots */}
      <style>{`
        @keyframes slideUpChat {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dot-loader {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-secondary, #64748b);
          display: inline-block;
          animation: dotPulse 1.2s infinite ease-in-out;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
