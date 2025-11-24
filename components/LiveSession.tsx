import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ChatMessage, TopicPreset } from '../types';
import { AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../services/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import { Mic, MicOff, PhoneOff, Loader2, MessageSquare } from 'lucide-react';

interface LiveSessionProps {
  topic: TopicPreset;
  customTopic?: string;
  onEndSession: (transcript: ChatMessage[]) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ topic, customTopic, onEndSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<ChatMessage[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | undefined>(undefined);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Refs for audio processing
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mountedRef = useRef(true);
  
  // Scroll ref
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcripts]);

  useEffect(() => {
    mountedRef.current = true;
    startSession();
    return () => {
      mountedRef.current = false;
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupSession = () => {
    // Stop microphone first
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    if (sessionRef.current) {
       try { sessionRef.current.close(); } catch (e) { console.log('Session close error', e)}
       sessionRef.current = null;
    }

    // Close Audio Contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }

    // Stop all sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    try {
      setError(null);
      
      // Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
          // Clean up if unmounted during await
          stream.getTracks().forEach(t => t.stop());
          inputCtx.close();
          outputCtx.close();
          return;
      }
      setMediaStream(stream);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = customTopic 
        ? `You are an English tutor. The user wants to talk about: "${customTopic}". Engage them, correct major mistakes gently, and keep the conversation flowing.`
        : topic.systemPrompt;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            if (!mountedRef.current || inputCtx.state === 'closed') return;
            setIsConnected(true);
            
            // Setup Input Streaming
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted || !mountedRef.current) return; 
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then((session) => {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch(err) {
                      // Session might be closed
                  }
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             if (!mountedRef.current) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAiSpeaking(true);
              const outputCtx = outputAudioContextRef.current;
              if (!outputCtx || outputCtx.state === 'closed') return;

              // Sync Playback
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                outputCtx,
                AUDIO_SAMPLE_RATE_OUTPUT,
                1
              );

              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Transcripts
            const outputTx = message.serverContent?.outputTranscription?.text;
            const inputTx = message.serverContent?.inputTranscription?.text;
            
            if (message.serverContent?.turnComplete) {
                 setIsAiSpeaking(false);
            }
            
            if (inputTx) {
                setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user') {
                        return [...prev.slice(0, -1), { ...last, text: last.text + inputTx }];
                    }
                    return [...prev, { role: 'user', text: inputTx, timestamp: Date.now() }];
                });
            }
            if (outputTx) {
                 setTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model') {
                        return [...prev.slice(0, -1), { ...last, text: last.text + outputTx }];
                    }
                    return [...prev, { role: 'model', text: outputTx, timestamp: Date.now() }];
                });
            }
          },
          onclose: () => {
            if (mountedRef.current) setIsConnected(false);
          },
          onerror: (e) => {
            console.error(e);
            if (mountedRef.current) {
                setError("Connection error occurred. Please check your API key and permissions.");
                setIsConnected(false);
            }
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Failed to start session", err);
      if (mountedRef.current) setError("Failed to access microphone or connect to AI service.");
    }
  };

  const handleEndClick = () => {
    cleanupSession();
    setIsConnected(false);
    onEndSession(transcripts);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                {isConnected ? <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"/> : <Loader2 className="w-4 h-4 animate-spin"/>}
            </div>
            <div>
                <h2 className="font-semibold text-gray-800">{customTopic || topic.title}</h2>
                <p className="text-xs text-gray-500">{isConnected ? 'Live Session Active' : 'Connecting...'}</p>
            </div>
        </div>
        <button 
            onClick={handleEndClick}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
        >
            <PhoneOff size={16} />
            End Call
        </button>
      </div>

      {/* Visualizer & Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 rounded-2xl p-8 relative overflow-hidden">
        {/* Transcript Overlay */}
        <div 
            ref={chatContainerRef}
            className="absolute top-0 left-0 right-0 bottom-32 overflow-y-auto p-6 space-y-4 scrollbar-hide mask-linear-fade"
            style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
        >
            {transcripts.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {transcripts.length === 0 && (
                <div className="text-center text-slate-500 mt-20">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50"/>
                    <p>Start speaking to begin the conversation...</p>
                </div>
            )}
        </div>

        {/* Active Visualization Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent">
             <div className="w-full max-w-md mx-auto mb-6">
                <AudioVisualizer 
                    stream={mediaStream} 
                    isActive={isConnected} 
                    isSpeaking={isAiSpeaking}
                />
             </div>

             {/* Controls */}
             <div className="flex justify-center gap-6">
                <button 
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                    {isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
                </button>
             </div>
             <p className="text-center text-slate-400 text-xs mt-4">
                {isMuted ? 'Microphone Muted' : isAiSpeaking ? 'AI is speaking...' : 'Listening...'}
             </p>
        </div>
      </div>
      
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm shadow-lg whitespace-nowrap">
            {error}
        </div>
      )}
    </div>
  );
};

export default LiveSession;