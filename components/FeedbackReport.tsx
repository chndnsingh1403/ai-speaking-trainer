import React, { useEffect, useState } from 'react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ChatMessage, ConversationFeedback, VocabItem } from '../types';
import { getApiKey } from '../services/audioUtils';
import { Star, BookOpen, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface FeedbackReportProps {
  transcripts: ChatMessage[];
  onBack: () => void;
}

const FeedbackReport: React.FC<FeedbackReportProps> = ({ transcripts, onBack }) => {
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateFeedback = async () => {
      if (transcripts.length < 2) {
        // Not enough data
        setLoading(false);
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        setError("API Key not found.");
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const conversationText = transcripts
        .map(t => `${t.role}: ${t.text}`)
        .join('\n');

      const prompt = `Analyze this conversation between an English learner (user) and a tutor (model). 
      Provide structured feedback including a score (1-10), strengths, areas for improvement, suggested vocabulary they could have used, and a brief summary.`;

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Score from 1 to 10 based on fluency and grammar" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          suggestedVocab: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
                example: { type: Type.STRING }
              }
            }
          }
        },
        required: ["score", "strengths", "improvements", "summary", "suggestedVocab"]
      };

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
              { role: 'user', parts: [{ text: prompt }] },
              { role: 'user', parts: [{ text: conversationText }] } // Provide context
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          }
        });

        const text = response.text;
        if (text) {
          setFeedback(JSON.parse(text) as ConversationFeedback);
        }
      } catch (error) {
        console.error("Error generating feedback", error);
        setError("Failed to generate feedback.");
      } finally {
        setLoading(false);
      }
    };

    generateFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 animate-pulse">Analyzing your conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-flex items-center mb-4">
             <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>
        <div>
            <button onClick={onBack} className="text-blue-600 hover:underline">Return Home</button>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">Conversation was too short for analysis.</p>
        <button onClick={onBack} className="text-blue-600 hover:underline">Return Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Session Analysis</h2>
            <div className="flex items-center bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
                <Star className="w-5 h-5 text-yellow-500 mr-2 fill-yellow-500" />
                <span className="font-bold text-yellow-700">{feedback.score}/10 Fluency Score</span>
            </div>
        </div>
        <p className="text-slate-600 mb-6 italic border-l-4 border-blue-200 pl-4">
            "{feedback.summary}"
        </p>

        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                <h3 className="font-semibold text-green-800 flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 mr-2" /> Strengths
                </h3>
                <ul className="space-y-2">
                    {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-green-700 text-sm flex items-start">
                            <span className="mr-2">•</span> {s}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                <h3 className="font-semibold text-orange-800 flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 mr-2" /> Areas to Improve
                </h3>
                <ul className="space-y-2">
                    {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-orange-700 text-sm flex items-start">
                            <span className="mr-2">•</span> {s}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-blue-600" /> Vocabulary Expansion
        </h3>
        <p className="text-slate-500 text-sm mb-4">Words you could have used to sound more native:</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feedback.suggestedVocab.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors">
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{item.word}</h4>
                    <p className="text-slate-600 text-sm mb-2">{item.definition}</p>
                    <p className="text-xs text-slate-500 italic">"{item.example}"</p>
                </div>
            ))}
        </div>
      </div>

      <div className="flex justify-center pt-6">
        <button 
            onClick={onBack}
            className="group flex items-center bg-slate-900 text-white px-6 py-3 rounded-full font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
        >
            Start New Session
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default FeedbackReport;