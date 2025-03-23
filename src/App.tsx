import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Shield, Send, Bot, User, Loader2, Paperclip, X, Clock, Menu, Plus } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  type: 'user' | 'bot';
  content: string;
  attachment?: {
    type: 'image' | 'file';
    name: string;
    url: string;
  };
  timestamp?: number;
}

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

async function getGeminiResponse(question: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Check if the question is cybersecurity-related using a separate prompt
    const categoryCheckPrompt = `Determine if this question is related to cybersecurity. Only respond with "true" if it's cybersecurity-related, or "false" if it's not: "${question}"`;
    const categoryCheck = await model.generateContent(categoryCheckPrompt);
    const isCyberSecurityRelated = (await categoryCheck.response.text()).toLowerCase().includes('true');

    if (!isCyberSecurityRelated) {
      return "I apologize, but I can only assist with cybersecurity-related questions. Please feel free to ask any questions about cybersecurity, and I'll be happy to help.";
    }

    // If cybersecurity-related, proceed with the main prompt
    const prompt = `You are a cybersecurity expert AI assistant. Please provide a detailed, professional response to this cybersecurity question: ${question}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch {
    console.error('Error getting Gemini response:');
    return "I apologize, but I'm currently experiencing technical difficulties. Please try again later.";
  }
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Message['attachment']>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchHistory, setSearchHistory] = useState<{ question: string; timestamp: number }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.getElementById('menu-button');
      
      if (sidebar && menuButton && 
          !sidebar.contains(event.target as Node) && 
          !menuButton.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const url = URL.createObjectURL(file);
    
    setAttachment({
      type: isImage ? 'image' : 'file',
      name: file.name,
      url
    });
  };

  const handleRemoveAttachment = () => {
    if (attachment?.url) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleHistoryClick = (question: string) => {
    setInput(question);
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setAttachment(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsSidebarOpen(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const timestamp = Date.now();
    const userMessage: Message = {
      type: 'user',
      content: input,
      attachment,
      timestamp
    };
    setMessages(prev => [...prev, userMessage]);
    setSearchHistory(prev => [{
      question: input,
      timestamp
    }, ...prev]);
    setInput('');
    setAttachment(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);

    try {
      const response = await getGeminiResponse(input);
      const botResponse: Message = {
        type: 'bot',
        content: response,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorMessage: Message = {
        type: 'bot',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error getting Gemini response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button
            id="menu-button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Shield className="w-8 h-8 text-cyan-500" />
          <h1 className="text-xl font-bold">Cyber Shield AI</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Sidebar */}
        <aside
          id="sidebar"
          className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            transition-transform duration-300 ease-in-out
            fixed
            w-80 h-[calc(100vh-64px)]
            bg-gray-800 border-r border-gray-700
            z-50
            overflow-y-auto
          `}
        >
          <div className="p-4">
            <button
              onClick={handleNewChat}
              className="w-full mb-4 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-gray-900 py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Chat</span>
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Search History
              </h2>
            </div>
            <div className="space-y-2">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(item.question)}
                  className="w-full text-left p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{item.question}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(item.timestamp)}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Chat Container */}
        <main className="flex-1 p-4 flex flex-col h-[calc(100vh-64px)]">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-gray-900" />
                  </div>
                )}
                <div
                  className={`rounded-lg p-4 max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-cyan-600'
                      : 'bg-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-line">{message.content}</div>
                  {message.attachment && (
                    <div className="mt-2">
                      {message.attachment.type === 'image' ? (
                        <img
                          src={message.attachment.url}
                          alt={message.attachment.name}
                          className="max-w-full rounded-lg"
                        />
                      ) : (
                        <a
                          href={message.attachment.url}
                          download={message.attachment.name}
                          className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
                        >
                          <Paperclip className="w-4 h-4" />
                          {message.attachment.name}
                        </a>
                      )}
                    </div>
                  )}
                  {message.timestamp && (
                    <div className="mt-2 text-xs text-gray-400">
                      {formatDate(message.timestamp)}
                    </div>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-900" />
                </div>
                <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {attachment && (
              <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg">
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                    <Paperclip className="w-6 h-6" />
                  </div>
                )}
                <span className="flex-1 truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-800 text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a cybersecurity question..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 text-gray-100"
                disabled={isLoading}
              />
              <button
                type="submit"
                className={`bg-cyan-500 text-gray-900 px-4 py-2 rounded-lg transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-400'
                }`}
                disabled={isLoading}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </form>
        </main>
      </div>
    </div>
  );
}

export default App;