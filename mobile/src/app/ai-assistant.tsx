import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions,
  Modal, Animated, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/use-theme';
import { useAppTheme } from '../context/ThemeContext';
import {
  ArrowLeft, Send, Trash2, Plus, Sparkles, MessageSquare, Menu, X, ChevronRight, Clock, Bot, Mic, Square, Volume2, VolumeX
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

const { width, height } = Dimensions.get('window');

// Resolve Host IP for FastAPI AI microservice (similar to main API)
const getHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return ip;
    }
  }
  return '192.168.1.13'; // Fallback
};

const AI_API_BASE = `http://${getHostIp()}:18000/api/ai`;

// Custom fetch for AI API with a 30-second timeout
const aiFetch = async (endpoint: string, options: any = {}) => {
  const url = `${AI_API_BASE}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const token = await SecureStore.getItemAsync('auth_token') || await SecureStore.getItemAsync('auth_cached_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {}

  const config = {
    ...options,
    headers,
    signal: controller.signal as any,
  };
  if (options.bodyData) {
    config.body = JSON.stringify(options.bodyData);
  }

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export default function AIAssistantScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';

  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [speakingMsgId, setSpeakingMsgId] = useState<number | string | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const flatListRef = useRef<FlatList>(null);
  const drawerSlide = useRef(new Animated.Value(-width * 0.8)).current;

  // Typing indicator dots animations
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Initial Load: retrieve sessions and create/load last session
  useEffect(() => {
    loadSessions();
    return () => {
      Speech.stop();
    };
  }, []);

  // Monitor generating state for typing indicator animation
  useEffect(() => {
    if (generating) {
      const animateDot = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(600 - delay),
          ])
        );
      };

      const anim1 = animateDot(dot1, 0);
      const anim2 = animateDot(dot2, 150);
      const anim3 = animateDot(dot3, 300);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        dot1.setValue(0);
        dot2.setValue(0);
        dot3.setValue(0);
      };
    }
  }, [generating]);

  // Handle drawer animation
  useEffect(() => {
    Animated.timing(drawerSlide, {
      toValue: showHistory ? 0 : -width * 0.8,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showHistory]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const list = await aiFetch('/sessions');
      setSessions(list);

      // Restore last active session ID from AsyncStorage if it exists
      const savedSessionId = await AsyncStorage.getItem('@ai_last_session_id');
      const validSession = list.find((s: any) => s.id === savedSessionId);

      if (validSession) {
        setCurrentSessionId(validSession.id);
        loadMessages(validSession.id);
      } else if (list.length > 0) {
        setCurrentSessionId(list[0].id);
        loadMessages(list[0].id);
      } else {
        // Create a new session if none exists
        handleStartNewConversation(false);
      }
    } catch (err) {
      console.warn('Failed to load AI sessions:', err);
      // Create a default offline session ID to let user write locally
      const mockId = 'session_' + Date.now();
      setCurrentSessionId(mockId);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgList = await aiFetch(`/sessions/${sessionId}/messages`);
      setMessages(msgList);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.warn('Failed to load AI messages:', err);
    }
  };

  const handleStartNewConversation = async (showNotification = true) => {
    try {
      setLoading(true);
      const newSession = await aiFetch('/sessions', {
        method: 'POST',
        bodyData: { title: "Nouvelle discussion" }
      });
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      await AsyncStorage.setItem('@ai_last_session_id', newSession.id);
      setShowHistory(false);
      if (showNotification) {
        Alert.alert("Nouvelle discussion", "Posez votre première question à SenInnov !");
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible de créer une nouvelle discussion.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    await AsyncStorage.setItem('@ai_last_session_id', sessionId);
    await loadMessages(sessionId);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert(
      "Supprimer la conversation",
      "Êtes-vous sûr de vouloir supprimer cette discussion de votre historique ?",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
              const updated = sessions.filter(s => s.id !== sessionId);
              setSessions(updated);
              
              if (currentSessionId === sessionId) {
                if (updated.length > 0) {
                  handleSelectSession(updated[0].id);
                } else {
                  handleStartNewConversation(false);
                }
              }
            } catch (err) {
              Alert.alert("Erreur", "Impossible de supprimer la conversation.");
            }
          }
        }
      ]
    );
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      "Vider l'historique",
      "Êtes-vous sûr de vouloir effacer TOUTES les discussions ? Cette action est définitive.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await aiFetch('/sessions', { method: 'DELETE' });
              setSessions([]);
              setMessages([]);
              await AsyncStorage.removeItem('@ai_last_session_id');
              setShowHistory(false);
              handleStartNewConversation(false);
            } catch (err) {
              Alert.alert("Erreur", "Impossible de vider l'historique.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSessionId) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setGenerating(true);

    // Optimistically add User Message
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await aiFetch(`/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        bodyData: { content: userText }
      });

      setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? { ...tempUserMsg, id: response.id } : m));
      const newMessages = await aiFetch(`/sessions/${currentSessionId}/messages`);
      setMessages(newMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      Speech.stop();
      setSpeakingMsgId(null);
      const permission = await requestRecordingPermissionsAsync();
      if (permission.granted) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        Alert.alert('Permission requise', "L'accès au microphone est nécessaire.");
      }
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  };

  const cancelRecording = async () => {
    try {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
    } catch (err) {
      console.warn('Failed to cancel recording', err);
    }
  };

  const stopAndSendRecording = async () => {
    if (!currentSessionId) return;
    try {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      setRecordingDuration(0);
      
      if (uri) {
        setGenerating(true);
        const tempUserMsg = {
          id: Date.now(),
          sender: 'user',
          content: "🎤 Message audio envoyé...",
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        const token = (await SecureStore.getItemAsync('auth_token')) || (await SecureStore.getItemAsync('auth_cached_token'));

        const uploadResult = await FileSystem.uploadAsync(
          `${AI_API_BASE}/sessions/${currentSessionId}/voice`,
          uri,
          {
            fieldName: 'audio',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            mimeType: 'audio/m4a',
          }
        );

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          const resData = JSON.parse(uploadResult.body);
          await loadMessages(currentSessionId);
          if (resData?.content) {
            speakText(resData.content, resData.id);
          }
        } else {
          throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
        }
      }
    } catch (err) {
      console.warn('Failed to send recording', err);
      Alert.alert("Erreur", "Impossible d'envoyer la note vocale.");
      // Remove temp message on fail
      loadMessages(currentSessionId);
    } finally {
      setGenerating(false);
    }
  };

  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~]/g, '')
      .replace(/^[-•*]\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speakText = async (text: string, msgId?: number | string) => {
    try {
      await Speech.stop();
      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      if (msgId) setSpeakingMsgId(msgId);
      Speech.speak(clean, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 1.0,
        onDone: () => setSpeakingMsgId(null),
        onStopped: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
      });
    } catch (err) {
      console.warn('Speech error:', err);
      setSpeakingMsgId(null);
    }
  };

  const toggleSpeak = async (text: string, msgId: number | string) => {
    if (speakingMsgId === msgId) {
      await Speech.stop();
      setSpeakingMsgId(null);
    } else {
      speakText(text, msgId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Helper to render bold text
  const renderBold = (text: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={`bold-${index}`} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
      }
      return part;
    });
  };

  // Render message content with markdown link parsing
  const renderMessageContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = text.split(linkRegex);

    if (parts.length === 1) {
       return <Text style={[styles.messageText, { color: theme.text }]}>{renderBold(text)}</Text>;
    }

    const elements = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i]) {
        elements.push(<Text key={`text-${i}`} style={[styles.messageText, { color: theme.text }]}>{renderBold(parts[i])}</Text>);
      }
      if (i + 1 < parts.length && i + 2 < parts.length) {
        const linkText = parts[i + 1];
        const url = parts[i + 2];
        elements.push(
          <TouchableOpacity 
            key={`link-${i}`} 
            style={styles.aiLinkBtn} 
            onPress={() => router.push(url as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.aiLinkText}>{linkText}</Text>
            <ChevronRight size={16} color="#ffffff" />
          </TouchableOpacity>
        );
      }
    }

    return <View style={{ flexDirection: 'column' }}>{elements}</View>;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>SenInnov</Text>
          <View style={styles.statusIndicatorRow}>
            <View style={styles.onlineDot} />
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Assistant démarches</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={[styles.headerBtn, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} 
            onPress={() => setShowHistory(true)}
          >
            <Menu size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerBtn, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} 
            onPress={() => handleStartNewConversation(true)}
          >
            <Plus size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Message Flow */}
      {loading && messages.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.chatContent, { paddingBottom: 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={isDark ? ['#1e293b', '#0f172a'] : ['#eff6ff', '#e0f2fe']}
                style={styles.emptyCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Bot size={44} color="#2563eb" style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>SenInnov</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Bonjour ! Je suis votre conseiller virtuel pour vos démarches administratives au Sénégal.
                </Text>
                <View style={styles.suggestedContainer}>
                  <Text style={[styles.suggestedTitle, { color: theme.text }]}>Exemples de questions :</Text>
                  {[
                    "Comment obtenir un acte de naissance ?",
                    "Quels sont les délais de traitement ?",
                    "Combien coûte une copie d'acte de mariage ?",
                    "Que faire si ma demande est rejetée ?"
                  ].map((q, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.suggestedBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}
                      onPress={() => setInputMessage(q)}
                    >
                      <Text style={[styles.suggestedText, { color: theme.textSecondary }]} numberOfLines={1}>{q}</Text>
                      <ChevronRight size={14} color="#2563eb" />
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            const isSpeaking = speakingMsgId === item.id;
            return (
              <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAssistant]}>
                {!isUser && (
                  <View style={styles.aiAvatar}>
                    <Sparkles size={14} color="#ffffff" />
                  </View>
                )}
                <View style={[
                  styles.messageBubble,
                  isUser ? styles.bubbleUser : [styles.bubbleAssistant, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#cbd5e1' }],
                ]}>
                  {isUser ? (
                    <Text style={styles.messageTextUser}>{item.content}</Text>
                  ) : (
                    renderMessageContent(item.content)
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    {!isUser && (
                      <TouchableOpacity
                        onPress={() => toggleSpeak(item.content, item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10, backgroundColor: isSpeaking ? (isDark ? 'rgba(37,99,235,0.25)' : '#dbeafe') : 'transparent' }}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX size={13} color="#2563eb" />
                            <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: '600' }}>Arrêter</Text>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} color={theme.textSecondary} />
                            <Text style={{ fontSize: 10, color: theme.textSecondary }}>Écouter</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.messageTime, isUser ? styles.timeUser : { color: theme.textSecondary, marginLeft: 'auto' }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            generating ? (
              <View style={[styles.messageRow, styles.rowAssistant]}>
                <View style={styles.aiAvatar}>
                  <Sparkles size={14} color="#ffffff" />
                </View>
                <View style={[styles.bubbleAssistant, styles.typingBubble, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#cbd5e1' }]}>
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                  <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.backgroundElement, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }]}>
        {isRecording ? (
          <View style={[styles.recordingContainer, { backgroundColor: isDark ? '#1a2333' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.recordingDot, { opacity: Math.sin(Date.now() / 200) > 0 ? 1 : 0.5 }]} />
              <Text style={[styles.recordingText, { color: theme.text }]}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity onPress={cancelRecording} style={{ padding: 8 }}>
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={[styles.textInput, { color: theme.text, backgroundColor: isDark ? '#1a2333' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}
            placeholder="Écrivez votre message..."
            placeholderTextColor={theme.textSecondary}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            maxLength={1000}
          />
        )}
        
        {isRecording ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: '#ef4444' }]}
            onPress={stopAndSendRecording}
          >
            <Square size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          inputMessage.trim() ? (
            <TouchableOpacity
              style={[styles.sendBtn]}
              onPress={handleSendMessage}
              disabled={generating}
            >
              <Send size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(37, 99, 235, 0.5)' : '#bfdbfe',
                }
              ]}
              onPress={startRecording}
              disabled={generating}
              activeOpacity={0.8}
            >
              <Mic size={20} color="#2563eb" />
            </TouchableOpacity>
          )
        )}
      </View>

      {/* History Slide Drawer Modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="none"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity 
            style={styles.drawerBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowHistory(false)} 
          />
          <Animated.View style={[styles.drawerContent, { transform: [{ translateX: drawerSlide }], backgroundColor: theme.background, paddingTop: insets.top + 10 }]}>
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#2563eb" />
                <Text style={[styles.drawerTitle, { color: theme.text }]}>Historique</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.drawerNewBtn} 
              onPress={() => handleStartNewConversation(true)}
            >
              <Plus size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.drawerNewBtnText}>Nouvelle discussion</Text>
            </TouchableOpacity>

            {sessions.length > 0 && (
              <TouchableOpacity 
                style={styles.drawerClearBtn} 
                onPress={handleClearAllHistory}
              >
                <Trash2 size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.drawerClearBtnText}>Vider l'historique</Text>
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {sessions.map((s) => {
                const isActive = s.id === currentSessionId;
                return (
                  <View key={s.id} style={[styles.historyItemRow, isActive && { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 12 }}
                      onPress={() => handleSelectSession(s.id)}
                    >
                      <MessageSquare size={16} color={isActive ? '#2563eb' : theme.textSecondary} style={{ marginRight: 10 }} />
                      <Text style={[styles.historyItemTitle, { color: isActive ? '#2563eb' : theme.text }]} numberOfLines={1}>
                        {s.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => handleDeleteSession(s.id)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {sessions.length === 0 && (
                <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>Aucune discussion enregistrée.</Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  chatContent: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 10,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  suggestedContainer: {
    width: '100%',
    gap: 8,
  },
  suggestedTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestedBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestedText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    width: '100%',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageTextUser: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
    opacity: 0.6,
  },
  timeUser: {
    color: '#ffffff',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  aiLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  aiLinkText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginRight: 6,
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContent: {
    width: width * 0.75,
    height: '100%',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  drawerNewBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    marginBottom: 6,
  },
  drawerNewBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  drawerClearBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
  },
  drawerClearBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.06)',
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  historyDeleteBtn: {
    padding: 12,
  },
  emptyHistoryText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  recordingText: {
    fontSize: 15,
    fontWeight: '600',
  }
});
