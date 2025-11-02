import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ReportView from './components/ReportView';
import FlashcardView from './components/FlashcardView';
import { MicrophoneIcon, BookOpenIcon } from './components/icons';
import LiveConversation from './components/LiveConversation';

import { Source, ChatMessage, MessageSender, Flashcard } from './types';
// import { geminiService } from './services/geminiService';
import { geminiService } from './services/ollamaService';


export enum View {
  CHAT,
  REPORT,
  FLASHCARDS,
}

const App: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [reports, setReports] = useState<Record<string, string>>({});
  const [flashcards, setFlashcards] = useState<Record<string, Flashcard[]>>({});
  const [activeView, setActiveView] = useState<View>(View.CHAT);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const selectedSource = useMemo(
    () => sources.find(s => s.id === selectedSourceId),
    [sources, selectedSourceId]
  );

  const currentChatHistory = useMemo(
    () => (selectedSourceId ? chatHistories[selectedSourceId] || [] : []),
    [chatHistories, selectedSourceId]
  );

  const currentReport = useMemo(
    () => (selectedSourceId ? reports[selectedSourceId] || '' : ''),
    [reports, selectedSourceId]
  );

  const currentFlashcards = useMemo(
    () => (selectedSourceId ? flashcards[selectedSourceId] || [] : []),
    [flashcards, selectedSourceId]
  );


  const handleAddSource = (title: string, content: string) => {
    const newSource: Source = { id: `source-${Date.now()}`, title, content };
    setSources(prev => [...prev, newSource]);
    setSelectedSourceId(newSource.id);
    setActiveView(View.CHAT);
  };

  const handleSendMessage = async (message: string, useThinkingMode: boolean) => {
    if (!selectedSource) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: message,
      sender: MessageSender.USER,
    };

    setChatHistories(prev => ({
      ...prev,
      [selectedSource.id]: [...(prev[selectedSource.id] || []), userMessage]
    }));

    setIsLoading(true);

    const botResponseText = await geminiService.askQuestion(message, selectedSource.content, useThinkingMode);

    const botMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      text: botResponseText,
      sender: MessageSender.BOT
    };

    setChatHistories(prev => ({
      ...prev,
      [selectedSource.id]: [...(prev[selectedSource.id] || []), botMessage]
    }));
    setIsLoading(false);
  };

  const handleGenerateReport = async () => {
    if (!selectedSource) return;
    setIsLoading(true);
    setActiveView(View.REPORT);
    const reportText = await geminiService.generateReport(selectedSource.content);
    setReports(prev => ({ ...prev, [selectedSource.id]: reportText }));
    setIsLoading(false);
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedSource) return;
    setIsLoading(true);
    setActiveView(View.FLASHCARDS);
    const generatedFlashcards = await geminiService.generateFlashcards(selectedSource.content);
    setFlashcards(prev => ({ ...prev, [selectedSource.id]: generatedFlashcards }));
    setIsLoading(false);
  };

  const handleSelectView = (view: View) => {
    setActiveView(view);
  };

  const renderMainContent = () => {
    if (!selectedSource) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
          <BookOpenIcon className="w-24 h-24 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-400">Select or Add a Source</h2>
          <p>Get started by adding a new source document from the sidebar.</p>
        </div>
      );
    }

    switch (activeView) {
      case View.REPORT:
        return isLoading && !currentReport ? <div className="p-8">Generating report...</div> : <ReportView report={currentReport} />;
      case View.FLASHCARDS:
        return isLoading && currentFlashcards.length === 0 ? <div className="p-8">Generating flashcards...</div> : <FlashcardView flashcards={currentFlashcards} />;
      case View.CHAT:
      default:
        return <ChatView
          messages={currentChatHistory}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onGenerateReport={handleGenerateReport}
          onGenerateFlashcards={handleGenerateFlashcards}
          sourceTitle={selectedSource.title}
        />;
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col md:flex-row overflow-hidden">
      <div className={`fixed top-0 left-0 h-full z-30 transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          sources={sources}
          selectedSourceId={selectedSourceId}
          onSelectSource={(id) => {
            setSelectedSourceId(id);
            setActiveView(View.CHAT);
            if (window.innerWidth < 768) setIsSidebarVisible(false);
          }}
          onAddSource={handleAddSource}
        />
      </div>

      <main className="flex-1 flex flex-col bg-gray-800">
        <header className="md:hidden flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
          <button onClick={() => setIsSidebarVisible(!isSidebarVisible)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {selectedSource && (
            <div className='flex items-center space-x-2'>
              <button onClick={() => setActiveView(View.CHAT)} className={`px-3 py-1 text-sm rounded-md ${activeView === View.CHAT ? 'bg-blue-600' : 'bg-gray-700'}`}>Chat</button>
              <button onClick={() => setActiveView(View.REPORT)} className={`px-3 py-1 text-sm rounded-md ${activeView === View.REPORT ? 'bg-blue-600' : 'bg-gray-700'}`}>Report</button>
              <button onClick={() => setActiveView(View.FLASHCARDS)} className={`px-3 py-1 text-sm rounded-md ${activeView === View.FLASHCARDS ? 'bg-blue-600' : 'bg-gray-700'}`}>Flashcards</button>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">
          {renderMainContent()}
        </div>
      </main>
      <button
        onClick={() => setIsLiveMode(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg z-40"
        aria-label="Start live conversation"
      >
        <MicrophoneIcon className="w-8 h-8" />
      </button>

      {isLiveMode && <LiveConversation onClose={() => setIsLiveMode(false)} />}
    </div>
  );
};

export default App;
