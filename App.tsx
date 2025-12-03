
import React, { useState, useEffect } from 'react';
import { AppMode, ChatMessage, TopicPreset } from './types';
import { TOPIC_PRESETS } from './constants';
import LiveSession from './components/LiveSession';
import FeedbackReport from './components/FeedbackReport';
import VocabBuilder from './components/VocabBuilder';
import GrammarLab from './components/GrammarLab';
import SpeechPractice from './components/SpeechPractice';
import { getApiKey } from './services/audioUtils';
import { MessageCircle, Book, Sparkles, ArrowRight, GraduationCap, AlertCircle, Volume2 } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedTopic, setSelectedTopic] = useState<TopicPreset | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [sessionTranscripts, setSessionTranscripts] = useState<ChatMessage[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Check for API Key on mount
  useEffect(() => {
    const key = getApiKey();
    setHasApiKey(!!key);
  }, []);

  const startConversation = (topic: TopicPreset) => {
    setSelectedTopic(topic);
    setCustomTopic('');
    setMode(AppMode.CONVERSATION);
  };

  const startCustomConversation = () => {
    if (!customTopic.trim()) return;
    setSelectedTopic(null); // Custom
    setMode(AppMode.CONVERSATION);
  };

  // Extended flow handling
  const [showFeedback, setShowFeedback] = useState(false);

  const onEndSessionWrapper = (transcripts: ChatMessage[]) => {
      setSessionTranscripts(transcripts);
      setMode(AppMode.HOME); // Reset mode base
      setShowFeedback(true); // Enable feedback overlay/view
  };

  if (!hasApiKey) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2 text-center">Setup Required</h1>
                <p className="text-slate-600 mb-6 text-sm text-center">
                    The application could not detect an API Key.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 mb-6 text-xs font-mono text-slate-700 space-y-2 border border-slate-200">
                    <p className="font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1">Missing Environment Variables:</p>
                    <div className="flex justify-between opacity-50">
                        <span>NEXT_PUBLIC_API_KEY</span>
                        <span>undefined</span>
                    </div>
                    <div className="flex justify-between opacity-50">
                        <span>VITE_API_KEY</span>
                        <span>undefined</span>
                    </div>
                    <div className="flex justify-between opacity-50">
                        <span>REACT_APP_API_KEY</span>
                        <span>undefined</span>
                    </div>
                </div>
                <div className="space-y-4 text-sm text-slate-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="font-semibold text-blue-800">How to fix on Vercel:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-blue-700">
                        <li>Go to <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
                        <li>Add a new variable named <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono text-xs">NEXT_PUBLIC_API_KEY</code>.</li>
                        <li>Paste your Gemini API Key as the value.</li>
                        <li><strong>Important:</strong> Redeploy your project for changes to take effect.</li>
                    </ol>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full mt-6 bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                    I've Redeployed, Refresh Page
                </button>
            </div>
        </div>
      );
  }

  if (showFeedback) {
      return <FeedbackReport transcripts={sessionTranscripts} onBack={() => setShowFeedback(false)} />;
  }

  const renderHome = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="text-center mb-16">
        <div className="inline-block p-3 bg-blue-50 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Speak English with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Confidence</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Your AI-powered language partner. Practice real-time conversations, get instant feedback, and expand your vocabulary naturally.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {/* Conversation Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all lg:col-span-1">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                <MessageCircle size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Conversation</h2>
            <p className="text-slate-500 mb-6 text-sm">Real-time voice chat practice with instant feedback.</p>
            
            <div className="space-y-3 mb-6">
                {TOPIC_PRESETS.slice(0, 3).map(topic => (
                    <button 
                        key={topic.id}
                        onClick={() => startConversation(topic)}
                        className="w-full flex items-center p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                    >
                        <span className="text-xl mr-3">{topic.icon}</span>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-semibold text-slate-700 truncate text-sm">{topic.title}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Custom topic..." 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                    />
                    <button 
                        onClick={startCustomConversation}
                        disabled={!customTopic.trim()}
                        className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        Go
                    </button>
                </div>
            </div>
        </div>

        {/* Speech Practice Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-6">
                <Volume2 size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Speech Practice</h2>
            <p className="text-slate-500 mb-6 text-sm">Speak freely and get detailed AI feedback on your performance.</p>
            
            <div className="flex-1 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-rose-100">
                <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                     <Volume2 className="w-8 h-8 text-rose-500" />
                </div>
                <p className="text-rose-800 font-medium mb-1">Practice Speaking</p>
                <p className="text-rose-600 text-xs mb-6">Get Instant Feedback</p>
                <button 
                    onClick={() => setMode(AppMode.SPEECH_PRACTICE)}
                    className="w-full bg-white border border-rose-200 text-rose-700 px-6 py-2 rounded-lg font-medium hover:bg-rose-600 hover:text-white transition-all shadow-sm text-sm"
                >
                    Start Practice
                </button>
            </div>
        </div>

        {/* Grammar Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-6">
                <GraduationCap size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Grammar Lab</h2>
            <p className="text-slate-500 mb-6 text-sm">Interactive lessons and quizzes to master complex rules.</p>
            
            <div className="flex-1 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-teal-100">
                <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                     <GraduationCap className="w-8 h-8 text-teal-500" />
                </div>
                <p className="text-teal-800 font-medium mb-1">Master the Rules</p>
                <p className="text-teal-600 text-xs mb-6">Tenses, Prepositions & More</p>
                <button 
                    onClick={() => setMode(AppMode.GRAMMAR)}
                    className="w-full bg-white border border-teal-200 text-teal-700 px-6 py-2 rounded-lg font-medium hover:bg-teal-600 hover:text-white transition-all shadow-sm text-sm"
                >
                    Start Lesson
                </button>
            </div>
        </div>

        {/* Vocab Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                <Book size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Vocabulary</h2>
            <p className="text-slate-500 mb-6 text-sm">Generate tailored word lists for specific scenarios.</p>
            
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-purple-100">
                <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                     <Book className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-purple-800 font-medium mb-1">Expand Your Lexicon</p>
                <p className="text-purple-600 text-xs mb-6">Context-based Learning</p>
                <button 
                    onClick={() => setMode(AppMode.VOCAB)}
                    className="w-full bg-white border border-purple-200 text-purple-700 px-6 py-2 rounded-lg font-medium hover:bg-purple-600 hover:text-white transition-all shadow-sm text-sm"
                >
                    Build Vocab
                </button>
            </div>
        </div>
      </div>
      
      <footer className="text-center text-slate-400 text-sm">
        <p>© 2025 LinguaFlow AI. Powered by Gemini 2.5.</p>
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Simple Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setMode(AppMode.HOME); setShowFeedback(false); }}>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">L</div>
                <span className="font-bold text-slate-800 text-lg">LinguaFlow</span>
            </div>
            {mode !== AppMode.HOME && (
                <button onClick={() => setMode(AppMode.HOME)} className="text-sm text-slate-500 hover:text-slate-800 font-medium">
                    Exit Session
                </button>
            )}
        </div>
      </nav>

      <main>
        {mode === AppMode.HOME && renderHome()}
        {mode === AppMode.CONVERSATION && (
            <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-4rem)]">
                <LiveSession 
                    topic={selectedTopic || TOPIC_PRESETS[0]} 
                    customTopic={customTopic || (selectedTopic ? undefined : 'General Chat')} 
                    onEndSession={onEndSessionWrapper} 
                />
            </div>
        )}
        {mode === AppMode.VOCAB && <VocabBuilder />}
        {mode === AppMode.GRAMMAR && <GrammarLab />}
        {mode === AppMode.SPEECH_PRACTICE && <SpeechPractice />}
      </main>
    </div>
  );
};

export default App;
