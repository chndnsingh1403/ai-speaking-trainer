import React, { useState } from 'react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { VocabItem } from '../types';
import { getApiKey } from '../services/audioUtils';
import { Search, Plus, RefreshCw, AlertCircle } from 'lucide-react';

const VocabBuilder: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateVocab = async () => {
    if (!topic.trim()) return;
    
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("API Key missing. Please check your settings.");
      return;
    }

    setLoading(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    example: { type: Type.STRING },
                }
            }
        }
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate 6 advanced English vocabulary words related to the topic: "${topic}". Provide definition and a usage example for each.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        if (data.items) setVocabList(data.items);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to generate vocabulary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white mb-8 shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Vocabulary Builder</h2>
        <p className="text-indigo-100 mb-6">Enter a context (e.g., 'Job Interview', 'Fine Dining', 'Technology') and get tailored words.</p>
        
        <div className="flex gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
            <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-indigo-200 px-4"
                onKeyDown={(e) => e.key === 'Enter' && generateVocab()}
            />
            <button 
                onClick={generateVocab}
                disabled={loading}
                className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center"
            >
                {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}
                <span className="ml-2 hidden sm:inline">Generate</span>
            </button>
        </div>
        {error && (
            <div className="mt-4 bg-red-500/20 text-red-100 p-3 rounded-lg flex items-center text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
            </div>
        )}
      </div>

      {vocabList.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vocabList.map((v, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-slate-800">{v.word}</h3>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded font-medium">Noun/Verb</span>
                      </div>
                      <p className="text-slate-600 text-sm mb-3 leading-relaxed">{v.definition}</p>
                      <div className="bg-slate-50 p-3 rounded-lg text-slate-500 text-xs italic border-l-2 border-indigo-200">
                          "{v.example}"
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          !loading && (
            <div className="text-center py-20 opacity-50">
                <Plus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-400">No vocabulary generated yet.</p>
            </div>
          )
      )}
    </div>
  );
};

export default VocabBuilder;