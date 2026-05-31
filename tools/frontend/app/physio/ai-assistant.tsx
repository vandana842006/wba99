import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { theme } from '../../src/utils/theme';
import api from '../../src/utils/api';
import { useStore } from '../../src/store/useStore';
import { generatePaymentSectionHTML } from '../../src/utils/pdfPaymentSection';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const router = useRouter();
  const { currentUser } = useStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! 👋 I'm your AI Physiotherapy Assistant.\n\nI can help you with:\n• 🏥 Treatment planning & diagnosis support\n• 💪 Exercise prescriptions\n• 📊 Patient progress analysis\n• 🔍 Clinical decision support\n• 📚 Best practices & guidelines\n\nHow can I assist you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const response = await api.post('/ai/chat', {
        message: userMessage.content,
        role: currentUser?.role || 'physio',
        session_id: sessionId,
        context: `User: ${currentUser?.name || 'Physio'}`
      });
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const quickActions = [
    { icon: 'medical', label: 'Treatment Plan', prompt: 'Help me create a treatment plan for a patient with lower back pain' },
    { icon: 'fitness', label: 'Exercises', prompt: 'Suggest exercises for shoulder rehabilitation' },
    { icon: 'analytics', label: 'Analysis', prompt: 'What should I look for in a posture assessment?' },
    { icon: 'help-circle', label: 'Guidelines', prompt: 'What are the current guidelines for ACL rehabilitation?' },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
  };

  // Export chat as PDF
  const exportChatAsPDF = async () => {
    if (messages.length <= 1) {
      Alert.alert('No Chat', 'Start a conversation first to export it as PDF.');
      return;
    }

    try {
      const currentDate = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });

      const chatMessagesHtml = messages
        .filter(m => m.id !== 'welcome')
        .map(m => `
          <div class="message ${m.role}">
            <div class="message-header">
              <span class="role">${m.role === 'user' ? '👤 You' : '🤖 AI Assistant'}</span>
              <span class="time">${m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="message-content">${m.content.replace(/\n/g, '<br/>')}</div>
          </div>
        `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00BCD4; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #00BCD4; }
            .title { text-align: center; background: linear-gradient(135deg, #00BCD4, #0097A7); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .message { margin-bottom: 15px; padding: 15px; border-radius: 10px; }
            .message.user { background: #e3f2fd; border-left: 4px solid #2196F3; }
            .message.assistant { background: #f5f5f5; border-left: 4px solid #00BCD4; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .role { font-weight: bold; color: #333; }
            .time { color: #666; font-size: 12px; }
            .message-content { color: #444; white-space: pre-wrap; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WBA99</div>
            <div style="text-align: right; font-size: 12px; color: #666;">
              <p><strong>Physio:</strong> ${currentUser?.name || 'User'}</p>
              <p><strong>Date:</strong> ${currentDate}</p>
            </div>
          </div>
          
          <div class="title">
            <h1 style="margin: 0; font-size: 24px;">🤖 AI Consultation Report</h1>
            <p style="margin: 5px 0 0;">Clinical Decision Support Chat Export</p>
          </div>

          <div class="chat-container">
            ${chatMessagesHtml}
          </div>

          ${generatePaymentSectionHTML('#00BCD4')}

          <div class="footer">
            <p>Generated by WBA99 AI Assistant | © 2025 WBA99 Expert Analysis India</p>
            <p><em>This report is for clinical reference. AI suggestions should be verified by qualified professionals.</em></p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to export chat as PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="robot-happy" size={28} color={theme.colors.accent} />
            <Text style={styles.headerTitle}>AI Assistant</Text>
          </View>
          <TouchableOpacity onPress={exportChatAsPDF} style={styles.exportButton}>
            <Ionicons name="download" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => handleQuickAction(action.prompt)}
              >
                <Ionicons name={action.icon as any} size={18} color={theme.colors.accent} />
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name="robot-happy" size={24} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}>
                    {message.content}
                  </Text>
                  <Text style={styles.timestamp}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
            
            {loading && (
              <View style={styles.loadingContainer}>
                <View style={styles.avatarContainer}>
                  <MaterialCommunityIcons name="robot-happy" size={24} color="#fff" />
                </View>
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.typingText}>AI is thinking...</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything about physiotherapy..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  onlineText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
  },
  exportButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  quickActionsContainer: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.card,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
  },
  quickActionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  assistantMessageWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: theme.colors.textPrimary,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  typingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
});
