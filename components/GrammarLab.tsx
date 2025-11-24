
import React, { useState } from 'react';
import { GoogleGenAI, Schema, Type } from '@google/genai';
import { GRAMMAR_TOPICS } from '../constants';
import { BookOpen, CheckCircle, XCircle, Lightbulb, GraduationCap, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface GrammarLesson {
  title: string;
  explanation: string;
  examples: string[];
  quiz: QuizQuestion[];
}

const GrammarLab: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  
  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);

  const generateLesson = async (selectedTopic: string) => {
    if (!selectedTopic.trim()) return;
    setLoading(true);
    setLesson(null);
    setSelectedAnswers({});
    setShowResults(false);
    
    // Update input if clicked from preset
    setTopic(selectedTopic);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        explanation: { type: Type.STRING, description: "A clear, concise explanation of the grammar rule." },
        examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 sentences demonstrating the rule." },
        quiz: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options" },
                    correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
                    explanation: { type: Type.STRING, description: "Why this answer is correct." }
                }
            }
        }
      },
      required: ["title", "explanation", "examples", "quiz"]
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a comprehensive grammar lesson about "${selectedTopic}". Include a clear explanation, examples, and a quiz with 4 multiple-choice questions to test understanding.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });

      const text = response.text;
      if (text) {
        setLesson(JSON.parse(text) as GrammarLesson);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIndex: number, optionIndex: number) => {
    if (showResults) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({
        ...prev,
        [qIndex]: optionIndex
    }));
  };

  const calculateScore = () => {
    if (!lesson) return 0;
    let correct = 0;
    lesson.quiz.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctAnswer) correct++;
    });
    return correct;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20">
      {/* Header & Search */}
      <div className="bg-teal-700 rounded-3xl p-8 text-white mb-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 flex items-center">
                <GraduationCap className="mr-3 w-8 h-8" /> 
                Grammar Lab
            </h2>
            <p className="text-teal-100 mb-6 max-w-xl">Master English grammar with AI-generated lessons and interactive quizzes designed just for you.</p>
            
            <div className="flex gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="E.g. Present Perfect, Conditionals..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-teal-200 px-4"
                    onKeyDown={(e) => e.key === 'Enter' && generateLesson(topic)}
                />
                <button 
                    onClick={() => generateLesson(topic)}
                    disabled={loading || !topic.trim()}
                    className="bg-white text-teal-700 px-6 py-2 rounded-lg font-semibold hover:bg-teal-50 transition-colors disabled:opacity-50 flex items-center"
                >
                    {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : "Learn"}
                </button>
            </div>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl"></div>
      </div>

      {!lesson && !loading && (
          <div className="mb-12">
            <h3 className="text-slate-500 font-medium mb-4 text-sm uppercase tracking-wide">Popular Topics</h3>
            <div className="flex flex-wrap gap-3">
                {GRAMMAR_TOPICS.map(t => (
                    <button 
                        key={t}
                        onClick={() => generateLesson(t)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-all text-sm font-medium"
                    >
                        {t}
                    </button>
                ))}
            </div>
          </div>
      )}

      {loading && (
          <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Constructing lesson plan...</p>
          </div>
      )}

      {lesson && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Lesson Section */}
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                  <h1 className="text-3xl font-bold text-slate-800 mb-6">{lesson.title}</h1>
                  
                  <div className="prose prose-slate max-w-none mb-8">
                      <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.explanation}</p>
                  </div>

                  <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                      <h3 className="text-teal-800 font-bold mb-4 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2" /> Examples
                      </h3>
                      <ul className="space-y-3">
                          {lesson.examples.map((ex, i) => (
                              <li key={i} className="flex items-start text-teal-900">
                                  <span className="mr-3 font-bold text-teal-400">•</span>
                                  {ex}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>

              {/* Quiz Section */}
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">Knowledge Check</h2>
                      {showResults && (
                          <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                              Score: {calculateScore()}/{lesson.quiz.length}
                          </div>
                      )}
                  </div>

                  <div className="space-y-8">
                      {lesson.quiz.map((q, qIdx) => {
                          const isCorrect = selectedAnswers[qIdx] === q.correctAnswer;
                          const hasAnswered = selectedAnswers[qIdx] !== undefined;
                          
                          return (
                            <div key={qIdx} className={`p-6 rounded-xl border-l-4 transition-all ${showResults ? (isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500') : 'bg-slate-50 border-slate-200'}`}>
                                <h3 className="font-semibold text-slate-800 mb-4 text-lg">{qIdx + 1}. {q.question}</h3>
                                
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleOptionSelect(qIdx, oIdx)}
                                            disabled={showResults}
                                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between ${
                                                selectedAnswers[qIdx] === oIdx
                                                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-medium shadow-sm'
                                                    : 'border-slate-200 hover:bg-white text-slate-600'
                                            } ${showResults && oIdx === q.correctAnswer ? '!bg-green-100 !border-green-400 !text-green-800' : ''}`}
                                        >
                                            {opt}
                                            {showResults && selectedAnswers[qIdx] === oIdx && (
                                                isCorrect ? <CheckCircle className="w-5 h-5 text-green-600"/> : <XCircle className="w-5 h-5 text-red-500"/>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {showResults && !isCorrect && (
                                    <div className="mt-4 text-sm text-red-600 bg-red-100/50 p-3 rounded-lg flex items-start">
                                        <span className="font-bold mr-1">Explanation:</span> {q.explanation}
                                    </div>
                                )}
                                {showResults && isCorrect && (
                                    <div className="mt-4 text-sm text-green-700 bg-green-100/50 p-3 rounded-lg">
                                        <span className="font-bold mr-1">Correct!</span> {q.explanation}
                                    </div>
                                )}
                            </div>
                          );
                      })}
                  </div>

                  {!showResults ? (
                      <button 
                        onClick={() => setShowResults(true)}
                        disabled={Object.keys(selectedAnswers).length < lesson.quiz.length}
                        className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Check Answers
                      </button>
                  ) : (
                      <div className="mt-8 text-center">
                          <button 
                            onClick={() => setLesson(null)} 
                            className="text-teal-600 font-medium hover:underline flex items-center justify-center mx-auto"
                          >
                             <ChevronLeft className="w-4 h-4 mr-1"/> Choose another topic
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default GrammarLab;
