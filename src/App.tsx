import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatContainer } from './components/chat/ChatContainer';
import { CompareContainer } from './components/compare/CompareContainer';
import { SettingsModal } from './components/settings/SettingsModal';
import { ShareView } from './components/share/ShareView';
import { useChatStore } from './stores/chatStore';
import { initializeModelConfigs } from './stores/modelStore';
import { ToastContainer, useToast } from './components/common/Toast';
import { PanelLeft } from 'lucide-react';
import './styles/index.css';

interface ShareData {
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; modelId?: string }[];
  createdAt: number;
}

function App() {
  const { 
    currentConversationId, 
    getCurrentConversation,
    createConversation,
    setCurrentConversation,
    conversations,
    isLoaded,
    loadConversations
  } = useChatStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [shareError, setShareError] = useState<string>('');
  const { toasts, removeToast } = useToast();
  
  const currentConversation = getCurrentConversation();
  const mode = currentConversation?.mode || 'single';

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    if (shareParam) {
      try {
        // UTF-8 safe base64 decoding
        const binaryStr = atob(shareParam);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        const decoded = JSON.parse(jsonStr);
        setShareData(decoded);
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('Share decode error:', e);
        setShareError('无效的分享链接');
      }
    }
  }, []);

  useEffect(() => {
    initializeModelConfigs();
    loadConversations();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (conversations.length === 0) {
      const newId = createConversation('single');
      setCurrentConversation(newId);
    } else if (!currentConversationId) {
      setCurrentConversation(conversations[0].id);
    }
  }, [isLoaded]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('应用错误:', event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleCloseShare = () => {
    setShareData(null);
    setShareError('');
    window.location.href = window.location.pathname;
  };

  if (shareData || shareError) {
    return (
      <ShareView 
        shareData={shareData} 
        error={shareError} 
        onClose={handleCloseShare} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {isSidebarVisible && (
        <Sidebar 
          className="w-64 flex-shrink-0" 
          onCollapse={() => setIsSidebarVisible(false)} 
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {!isSidebarVisible && (
          <button
            onClick={() => setIsSidebarVisible(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-800 text-white rounded-r-lg hover:bg-gray-700 transition-colors"
            title="展开侧边栏"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {currentConversationId ? (
          mode === 'single' ? (
            <ChatContainer
              conversationId={currentConversationId}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <CompareContainer
              conversationId={currentConversationId}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            选择一个对话或创建新对话
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
