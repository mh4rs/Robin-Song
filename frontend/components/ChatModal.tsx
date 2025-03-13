import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  FlatList, 
  ScrollView
} from 'react-native';
import colors from 'frontend/assets/theme/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ChatQuestion from './ChatQuestion';
import SearchBar from './SearchBar';
import { getAuth, onAuthStateChanged } from "firebase/auth";
const auth = getAuth();
import { db, API_BASE_URL } from '../../database/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Animated } from 'react-native';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ChatListScreenProps {
  chats: { id: string; title: string; date: Date }[];
  onSelectChat: (chatId: string) => void;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose }) => {
  const scrollViewRef = useRef<ScrollView>(null); 
  const [chatListVisible, setChatListVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ 
    [key: string]: { id: string; content: string; sender: string; timestamp: Date }[] 
  }>({});
  const [chats, setChats] = useState<{ id: string; title: string; date: Date }[]>([]);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingDots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User authenticated:", user.uid);
        setUserId(user.uid);
      } else {
        console.log("Using default user ID");
        setUserId("FsDwDpHUD6XQU3egNNCOJLCTiNg1");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(typingDots, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isTyping]);  

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chats`);
        if (response.ok) {
          const data = await response.json();
          const formattedChats = data.map((chat: any) => ({
            id: chat.chatId,
            title: chat.title,
            date: new Date(chat.createdAt?._seconds * 1000 || Date.now())
          }));
          setChats(formattedChats);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };
    
    fetchChats();

    const q = query(collection(db, 'chats'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        date: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date(),
      }));
      setChats(fetchedChats);
    });
    
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (selectedChat) {
        const q = query(collection(db, 'chats', selectedChat, 'messages'), orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, snapshot => {
          const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            content: doc.data().content,
            sender: doc.data().sender === "AI" ? "AI" : "user",
            timestamp: doc.data().timestamp 
              ? doc.data().timestamp.toDate() 
              : new Date() 
        }));              

            console.log(`Fetched messages for thread ${selectedChat}:`, fetchedMessages);
            setChatMessages(prev => ({ ...prev, [selectedChat]: fetchedMessages }));
        });

        return () => {
            console.log("Unsubscribing from previous chat listener");
            unsubscribe();
        };
    }
  }, [selectedChat]);

  const sendMessage = async (threadID: string, message: string) => {
    console.log(`Sending message to ChatGPT under thread: ${threadID}`);

    if (!threadID) {
        console.log("sendMessage aborted: Missing thread ID.");
        return;
    }

    setMessage(''); 
    setIsTyping(true); 

    try {
        setChatMessages(prev => ({
            ...prev,
            [threadID]: prev[threadID]?.filter(msg => msg.id !== 'typing-indicator') || [],
        }));

        setChatMessages(prev => ({
            ...prev,
            [threadID]: [...(prev[threadID] || []), { id: 'typing-indicator', content: '...', sender: 'AI', timestamp: new Date() }]
        }));

        const response = await fetch(`${API_BASE_URL}/chats/${threadID}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message, 
                system_prompt: "You are a birdwatching assistant answering with enthusiasm! Answer questions that are only related to birds with engaging, helpful responses. In your response, do not mention the fact that you are able to help—just answer the question with the constraints given. If a question is outside bird-related topics, respond politely, mentioning that you only answer bird-related questions. You are answering these bird-related questions as if you were the bird identified. Keep responses strictly 1-2 sentences long.",
                max_tokens: 50 
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ChatGPT API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("ChatGPT Response received:", data);

        setIsTyping(false); 

        setChatMessages(prev => {
            const existingMessages = prev[threadID] || [];

            if (existingMessages.some(msg => msg.content === data.botMessage)) {
                console.log("Duplicate response detected, skipping append.");
                return prev;
            }

            return {
                ...prev,
                [threadID]: existingMessages.filter(msg => msg.id !== 'typing-indicator').concat({
                    id: data.botMessageId || new Date().toISOString(),
                    content: data.botMessage,
                    sender: "AI",
                    timestamp: new Date()
                })
            };
        });

    } catch (error) {
        console.error('Error sending message:', error);
        setIsTyping(false); 
        setChatMessages(prev => ({
            ...prev,
            [threadID]: prev[threadID]?.filter(msg => msg.id !== 'typing-indicator') || []
        }));
    }
  };


  const startNewChat = async (message: string) => {
    try {
        console.log("Creating a new chat with message:", message);
        const chatTitle = message.substring(0, 30);

        const existingChat = chats.find(chat => chat.title === chatTitle);
        if (existingChat) {
            console.log("Chat with this title already exists, selecting existing chat:", existingChat.id);
            setSelectedChat(existingChat.id);
            await sendMessage(existingChat.id, message);
            return existingChat.id;
        }

        const response = await fetch(`${API_BASE_URL}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: chatTitle }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create chat: ${response.status}`);
        }

        const data = await response.json();
        const threadID = data.chatId;

        console.log("New chat created with ID:", threadID);

        setChats(prev => {
            if (!prev.some(chat => chat.id === threadID)) {
                return [{ id: threadID, title: chatTitle, date: new Date() }, ...prev];
            }
            return prev;
        });

        setSelectedChat(threadID);
        await sendMessage(threadID, message);
        return threadID;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
};

const handleSendMessage = async () => {
    if (!message.trim()) {
        console.log("No message entered.");
        return;
    }

    let threadID = selectedChat;

    if (!threadID) {
        console.log("No chat selected, starting a new chat.");
        const newThreadID = await startNewChat(message);
        if (!newThreadID) {
            console.error("Failed to create a new chat.");
            return;
        }
        threadID = newThreadID;
    } else {
        await sendMessage(threadID, message);
    }
  };

  const TypingIndicator = () => {
      return (
          <View style={[styles.chatBubble, styles.aiBubble, { alignSelf: 'flex-start', flexDirection: 'row' }]}>
              <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
              <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
              <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
          </View>
      );
  };
  
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.background}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {chatListVisible ? (
                <ChatListScreen chats={chats} onSelectChat={setSelectedChat} onClose={() => setChatListVisible(false)} onSetChats={setChats} selectedChat={selectedChat} setSelectedChat={setSelectedChat} />
              ) : (
                <>
                  <View style={styles.topBarContainer}>
                  <TouchableOpacity style={styles.newChatContainer} onPress={() => {
                    setSelectedChat(null);
                    setChatListVisible(true);
                  }}>
                    <Text style={styles.newChatText}>{selectedChat ? chats.find(c => c.id === selectedChat)?.title : 'New Chat'}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                      <Ionicons name="close" size={30} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    ref={scrollViewRef}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 10, paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                        if (scrollViewRef.current) {
                            scrollViewRef.current.scrollToEnd({ animated: true });
                        }
                    }}
                    onLayout={() => {
                        if (scrollViewRef.current) {
                            scrollViewRef.current.scrollToEnd({ animated: true });
                        }
                    }}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled
                >
                    {selectedChat ? (
                        chatMessages[selectedChat]?.map((msg) => (
                            <View key={msg.id} style={[styles.chatBubble, msg.sender === "user" ? styles.userBubble : styles.aiBubble]}>
                                <View style={{ flexDirection: "column" }}>
                                    <Text style={styles.chatText}>{msg.content}</Text>
                                    <Text style={styles.chatTimestamp}>
                                        {msg.timestamp instanceof Date
                                            ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : "N/A"}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.homeScreen}>
                            <Text style={styles.heading}>Hi Jodi, I'm Robin! Tweet Tweet!</Text>
                            <Text style={styles.subHeading}>How can I help you?</Text>
                            <Text style={styles.suggestionsHeading}>Suggestions</Text>
                            <ChatQuestion title="What does a Robin eat?" onPress={() => startNewChat("What does a Robin eat?")} />
                            <ChatQuestion title="Tell me about a Robin's life cycle." onPress={() => startNewChat("Tell me about a Robin's life cycle.")} />
                            <ChatQuestion title="What is the most common region to find a Robin?" onPress={() => startNewChat("What is the most common region to find a Robin?")} />
                            <ChatQuestion title="What are some species similar to Robins?" onPress={() => startNewChat("What are some species similar to Robins?")} />
                        </View>
                    )}

                    {isTyping && (
                        <View style={[styles.chatBubble, styles.aiBubble, { alignSelf: 'flex-start', flexDirection: 'row' }]}>
                            <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
                            <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
                            <Animated.Text style={[styles.chatText, { opacity: typingDots }]}>.</Animated.Text>
                        </View>
                    )}
                </ScrollView>
                    <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Ask me about birds..."
                      placeholderTextColor={colors.accent}
                      value={message}
                      onChangeText={setMessage}
                      onSubmitEditing={handleSendMessage}
                      blurOnSubmit={false}
                    />
                      <TouchableOpacity style={styles.arrowButton} onPress={handleSendMessage}>
                        <Ionicons name="arrow-up" size={25} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const ChatListScreen: React.FC<{ 
  chats: { id: string; title: string; date: Date }[];
  onSelectChat: (title: string) => void; 
  onClose: () => void;
  onSetChats: React.Dispatch<React.SetStateAction<{ id: string; title: string; date: Date }[]>>; 
  selectedChat: string | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<string | null>>; 
}> = ({ chats, onSelectChat, onClose, onSetChats, selectedChat, setSelectedChat }) => {
  const [search, setSearch] = useState("");

  const handleSearch = (query: string) => {
    setSearch(query);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, { method: "DELETE" });
      if (response.ok) {
        onSetChats((prevChats: { id: string; title: string; date: Date }[]) => prevChats.filter((chat: { id: string; title: string; date: Date }) => chat.id !== chatId));
        if (selectedChat === chatId) {
          setSelectedChat(null);
        }
        Alert.alert("Chat Deleted", "The chat has been successfully deleted.");        
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const groupChatsByDate = (chats: { id: string; title: string; date: Date }[]) => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(today.getDate() - 30)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 31);

    const groupedChats: { [key: string]: { id: string; title: string; date: Date }[] } = {
      Today: [],
      'Past Week': [],
      'Past Month': [],
      'Older than 30 Days': []
    };

    chats.forEach(chat => {
      const chatDate = chat.date;
      if (chatDate.toDateString() === today.toDateString()) {
        groupedChats['Today'].push(chat);
      } else if (chatDate >= oneWeekAgo) {
        groupedChats['Past Week'].push(chat);
      } else if (chatDate >= oneMonthAgo) {
        groupedChats['Past Month'].push(chat);
      } else if (chatDate < thirtyDaysAgo) {
        groupedChats['Older than 30 Days'].push(chat);
      }
    });

    return groupedChats;
  };

  const filteredChats = chats.filter(chat => chat.title.toLowerCase().includes(search.toLowerCase()));

  const groupedChats = groupChatsByDate(filteredChats);

  return (
    <View style={{ padding: 20 }}>
      <View style={styles.chatListTopBar}>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={colors.primary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: 'bold', fontFamily: 'Radio Canada' }}>All Chats</Text>
        
        <TouchableOpacity onPress={() => {
          setSelectedChat(null); 
          onClose(); 
        }}>
          <MaterialCommunityIcons name="square-edit-outline" size={25} color={colors.primary}/>
        </TouchableOpacity>
      </View>

      <SearchBar label='Search for a chat' search={search} setSearch={setSearch} onSearch={handleSearch} />
      
      <ScrollView style={{height: '100%'}}>
        {Object.keys(groupedChats).map((section) =>
          groupedChats[section].length > 0 && (
            <View key={section}>
              <Text style={styles.chatSectionLabel}>{section}</Text>
              <FlatList
                data={groupedChats[section].sort((a, b) => b.date.getTime() - a.date.getTime())}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.chatItem}>
                  <TouchableOpacity style={styles.chatDescription} onPress={() => {
                    setSelectedChat(item.id); 
                    onClose(); 
                  }}>
                  <MaterialCommunityIcons name="chat-processing-outline" size={25} color={colors.secondary} style={{marginRight: 6}}/>
                  <Text style={styles.chatItemText} numberOfLines={1} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                    <Text style={styles.chatItemDate}>{item.date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteChat(item.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={25} color={colors.secondary}/>
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={false}
              />
            </View>
          )
        )}

        <TouchableOpacity style={styles.newChatButton} onPress={() => {
          setSelectedChat(null);
          onClose(); 
        }}>
          <MaterialCommunityIcons name="plus" size={25} color={colors.offwhite} style={{marginRight: 10}}/>
          <Text style={styles.newChatButtonText}>Start New Chat</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '100%',
    height: '92%',
    backgroundColor: colors.chatGPTBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
  },
  topBarContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  newChatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  newChatText: {
    fontFamily: 'Radio Canada',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  closeText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBlock: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heading: {
    fontFamily: 'Caprasimo',
    fontSize: 20,
    color: colors.secondary,
    marginBottom: 5,
    textAlign: 'left',
  },
  subHeading: {
    fontFamily: 'Radio Canada',
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  suggestionsHeading: {
    fontFamily: 'Radio Canada',
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 10,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    height: 50,
    backgroundColor: colors.chatGPTCardBackground,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 20,
  },
  inputField: {
    fontFamily: 'Radio Canada',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  arrowButton: {
    width: 30,
    height: 30,
    backgroundColor: colors.accent,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatListTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chatSectionLabel: {
    marginTop: 24,
    marginBottom: 4, 
    fontSize: 16,
    fontFamily: 'Radio Canada',
    fontWeight: 'bold',
    color: colors.primary,
  },
  chatItem: { 
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1, 
    borderBottomColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatDescription: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatItemText: { 
    fontSize: 16,
    fontFamily: 'Radio Canada',
    fontWeight: '500',
    color: colors.black,
    marginRight: 12,
    flexShrink: 1,  
    maxWidth: "80%", 
  },  
  chatItemDate: {
    fontSize: 12,
    fontFamily: 'Radio Canada',
    color: colors.secondary,
  },
  newChatButton: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: colors.accent,
    borderRadius: 25,
    padding: 8,
    marginVertical: 24,
    alignItems: 'center',
  },
  newChatButtonText: {
    fontFamily: 'Radio Canada',
    fontSize: 16,
    fontWeight: 500,
    color: colors.offwhite,
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: "flex-end",
  },
  
  aiBubble: {
    backgroundColor: colors.secondary,
    alignSelf: "flex-start",
  },
  chatText: {
    fontFamily: "Radio Canada",
    fontSize: 14,
    color: colors.white,
  },
  homeScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },  
  chatTimestamp: {
    fontSize: 10,
    color: colors.accent,
    marginTop: 2,
    alignSelf: "flex-end",
  },  
});

export default ChatModal;
