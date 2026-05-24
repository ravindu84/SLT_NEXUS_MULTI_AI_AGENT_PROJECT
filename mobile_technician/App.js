import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Dimensions,
  Animated,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Send, Mic, Sparkles, Shield, Cpu, Zap, Activity, Info, Menu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarScene from './components/AvatarScene';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'http://13.61.4.78:8000';

const AGENTS = [
  { id: 'liya', name: 'LIYA', color: '#0052cc', icon: Zap },
  { id: 'spark', name: 'Spark', color: '#ffab00', icon: Sparkles },
  { id: 'insight', name: 'Insight', color: '#00c853', icon: Activity },
  { id: 'guardian', name: 'Guardian', color: '#d32f2f', icon: Shield },
];

export default function App() {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! I am LIYA, your SLT-MOBITEL AI assistant. How can I help you today?', sender: 'bot', agent: 'liya' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('liya');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Technician Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [lang, setLang] = useState('en');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSpeaking || loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSpeaking, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const currentInput = input;
    const userMessage = { id: Date.now().toString(), text: currentInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentInput,
          session_id: `tech-${pin}`,
          lang: lang
        })
      });
      
      const data = await response.json();

      const botMessage = { 
        id: (Date.now() + 1).toString(), 
        text: data.response || "Sorry, I couldn't process that.", 
        sender: 'bot',
        agent: data.agent_label?.toLowerCase() || 'oracle'
      };
      setMessages(prev => [...prev, botMessage]);
      setLoading(false);
      
      // Use Expo Speech for TTS
      Speech.speak(botMessage.text, {
        language: lang === 'si' ? 'si-LK' : lang === 'ta' ? 'ta-LK' : 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    } catch (error) {
      console.error(error);
      const errorMessage = { 
        id: (Date.now() + 1).toString(), 
        text: "Network error connecting to NEXUS backend.", 
        sender: 'bot',
        agent: 'oracle'
      };
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageWrapper,
      item.sender === 'user' ? styles.userWrapper : styles.botWrapper
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble
      ]}>
        {item.sender === 'bot' && (
          <Text style={styles.agentTag}>{item.agent.toUpperCase()}</Text>
        )}
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    </View>
  );

  const handleLogin = () => {
    if (pin.length > 2) {
      setIsLoggedIn(true);
      setMessages([
        { id: '1', text: `Authentication successful for Service ID ${pin}. I am LIYA. How can I assist you with your field operations today? DP diagnostics, fault tickets, or signal checks?`, sender: 'bot', agent: 'liya' }
      ]);
    } else {
      alert("Please enter a valid Service ID (minimum 3 characters).");
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#0a0e1a', '#1a1f35', '#0a0e1a']} style={StyleSheet.absoluteFill} />
        
        <View style={styles.loginContainer}>
          <View style={styles.loginLogo}>
            <Cpu size={48} color="#2684ff" />
          </View>
          <Text style={styles.loginTitle}>NEXUS FIELD OPS</Text>
          <Text style={styles.loginSubtitle}>Technician Access Portal</Text>
          
          <View style={styles.loginCard}>
            <Text style={styles.inputLabel}>Enter Service ID</Text>
            <TextInput 
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              autoCapitalize="characters"
              placeholder="EMP123"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity 
              style={[styles.loginBtn, pin.length > 2 ? styles.loginBtnActive : {}]} 
              onPress={handleLogin}
              disabled={pin.length <= 2}
            >
              <Text style={styles.loginBtnText}>AUTHENTICATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0e1a', '#1a1f35', '#0a0e1a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity><Menu size={24} color="white" /></TouchableOpacity>
        <View style={styles.logoRow}>
          <Cpu size={20} color="#2684ff" />
          <Text style={styles.headerTitle}>NEXUS FIELD OPS</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {['en', 'si', 'ta'].map(l => (
            <TouchableOpacity 
              key={l} 
              onPress={() => setLang(l)}
              style={{
                backgroundColor: lang === l ? '#2684ff' : 'rgba(255,255,255,0.1)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{l.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Immersive Avatar Section */}
      <View style={styles.avatarSection}>
        <Animated.View style={[
          styles.avatarGlow,
          { transform: [{ scale: pulseAnim }] }
        ]}>
          <LinearGradient
            colors={['rgba(38, 132, 255, 0.3)', 'transparent']}
            style={styles.glowCircle}
          />
        </Animated.View>
        
        <View style={styles.avatarContainer}>
          <AvatarScene isSpeaking={isSpeaking} audioLevel={isSpeaking ? 1.0 : 0} />
        </View>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, (loading || isSpeaking) && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {loading ? 'THINKING...' : isSpeaking ? 'SPEAKING...' : 'ONLINE'}
          </Text>
        </View>
      </View>

      {/* Agent Selector */}
      <View style={styles.agentScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agentScroll}>
          {AGENTS.map((agent) => (
            <TouchableOpacity 
              key={agent.id}
              onPress={() => setSelectedAgent(agent.id)}
              style={[
                styles.agentChip,
                selectedAgent === agent.id && { borderColor: agent.color, backgroundColor: `${agent.color}22` }
              ]}
            >
              <agent.icon size={14} color={selectedAgent === agent.id ? agent.color : '#64748b'} />
              <Text style={[
                styles.agentChipText,
                selectedAgent === agent.id && { color: 'white' }
              ]}>{agent.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Area */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Controls */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomSection}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.micButton} onPress={() => alert('Voice Recording (STT) requires a custom Expo Dev Client or Native Eject. Please use the text input for this preview.')}>
            <Mic size={24} color="#64748b" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="How can LIYA help you?"
            placeholderTextColor="#64748b"
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  avatarSection: {
    height: height * 0.25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1f35',
    borderWidth: 2,
    borderColor: 'rgba(38, 132, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0e1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    zIndex: 1,
  },
  glowCircle: {
    flex: 1,
    borderRadius: 100,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#00c853',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  agentScrollContainer: {
    marginTop: 10,
    height: 40,
  },
  agentScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1a1f35',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  agentChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  chatList: {
    padding: 20,
    paddingTop: 10,
  },
  messageWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  userWrapper: {
    alignItems: 'flex-end',
  },
  botWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#0052cc',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'rgba(26, 31, 53, 0.8)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  agentTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2684ff',
    marginBottom: 4,
    letterSpacing: 1,
  },
  messageText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f35',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 12,
    fontSize: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#0052cc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1a1f35',
    opacity: 0.5,
  },
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(38, 132, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(38, 132, 255, 0.3)',
    marginBottom: 20,
  },
  loginTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  loginSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(26, 31, 53, 0.8)',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pinInput: {
    backgroundColor: '#0a0e1a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: 'white',
    fontSize: 24,
    padding: 15,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 10,
  },
  loginBtn: {
    backgroundColor: '#1a1f35',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loginBtnActive: {
    backgroundColor: '#2684ff',
    borderColor: '#2684ff',
  },
  loginBtnText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

