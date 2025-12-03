import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { SpeechAnalysis } from '../types';
import { getApiKey } from '../services/audioUtils';
import { Mic, MicOff, Send, Loader2, Star, TrendingUp, AlertCircle, Volume2, RefreshCw } from 'lucide-react';

const SpeechPractice: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        setTranscript(prev => prev + finalTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError('Speech recognition error. Please try again.');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const visualizeAudio = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  };

  const startRecording = async () => {
    try {
      setError(null);
      setAnalysis(null);
      setTranscript('');
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start audio visualization
      visualizeAudio(stream);

      // Start media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);

      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Stop audio visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const submitForAnalysis = async () => {
    if (!transcript.trim()) {
      setError('No speech detected. Please try recording again.');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('API Key not found. Please check your settings.');
      return;
    }

    setLoading(true);
    setError(null);

    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: 'Overall score from 1-10' },
        pronunciation: { type: Type.STRING, description: 'Assessment of pronunciation quality' },
        grammar: { type: Type.STRING, description: 'Grammar analysis' },
        vocabulary: { type: Type.STRING, description: 'Vocabulary usage assessment' },
        fluency: { type: Type.STRING, description: 'Fluency and coherence evaluation' },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific areas to improve' },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What was done well' },
        transcription: { type: Type.STRING, description: 'Cleaned up transcription of the speech' }
      },
      required: ['score', 'pronunciation', 'grammar', 'vocabulary', 'fluency', 'improvements', 'strengths', 'transcription']
    };

    const prompt = `Analyze this English speech transcription and provide detailed feedback on pronunciation, grammar, vocabulary, and fluency. 
    Give a score from 1-10, list strengths and areas for improvement, and provide a cleaned-up version of the transcription.
    
    Transcription: "${transcript}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });

      const text = response.text;
      if (text) {
        const result = JSON.parse(text) as SpeechAnalysis;
        setAnalysis(result);
      }
    } catch (err) {
      console.error('Error analyzing speech:', err);
      setError('Failed to analyze speech. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setAnalysis(null);
    setError(null);
    setAudioLevel(0);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 text-white mb-8 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Volume2 className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold">Speech Practice</h2>
        </div>
        <p className="text-rose-100">
          Speak freely about any topic. When you're done, submit for AI analysis and get personalized improvement feedback.
        </p>
      </div>

      {/* Recording Section */}
      {!analysis && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <div className="flex flex-col items-center">
            {/* Audio Visualizer */}
            <div className="mb-6 w-full max-w-md">
              <div className="h-24 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden relative border border-slate-200">
                {isRecording ? (
                  <div className="flex items-center gap-1 h-full px-4">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-rose-500 to-pink-400 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(10, audioLevel * 100 * (0.5 + Math.random() * 0.5))}%`,
                          opacity: 0.7 + audioLevel * 0.3
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">
                    {transcript ? 'Recording stopped' : 'Click the microphone to start'}
                  </div>
                )}
              </div>
            </div>

            {/* Recording Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg mb-4 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>

            <p className="text-slate-600 text-sm mb-6">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </p>

            {/* Transcript Display */}
            {transcript && (
              <div className="w-full bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Your Speech:
                </h3>
                <p className="text-slate-600 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {transcript && !isRecording && (
                <>
                  <button
                    onClick={submitForAnalysis}
                    disabled={loading}
                    className="bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit for Analysis
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-slate-800">Your Performance</h3>
              <div className="flex items-center bg-white px-6 py-3 rounded-full shadow-sm border border-amber-200">
                <Star className="w-6 h-6 text-amber-500 mr-2 fill-amber-500" />
                <span className="text-2xl font-bold text-amber-600">{analysis.score}/10</span>
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                </div>
                Pronunciation
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{analysis.pronunciation}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                Grammar
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{analysis.grammar}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                  <Star className="w-4 h-4 text-purple-600" />
                </div>
                Vocabulary
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{analysis.vocabulary}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-2">
                  <Mic className="w-4 h-4 text-teal-600" />
                </div>
                Fluency
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed">{analysis.fluency}</p>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <h4 className="font-semibold text-green-800 mb-4 text-lg">✓ Strengths</h4>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="text-green-700 text-sm flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <h4 className="font-semibold text-orange-800 mb-4 text-lg">⚡ Areas to Improve</h4>
              <ul className="space-y-2">
                {analysis.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-orange-700 text-sm flex items-start">
                    <span className="mr-2 mt-1">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cleaned Transcription */}
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-3">📝 Corrected Transcription</h4>
            <p className="text-slate-600 leading-relaxed italic border-l-4 border-blue-200 pl-4">
              "{analysis.transcription}"
            </p>
          </div>

          {/* Try Again Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={reset}
              className="bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition-all shadow-md flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechPractice;
