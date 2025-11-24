
export enum AppMode {
  HOME = 'HOME',
  CONVERSATION = 'CONVERSATION',
  VOCAB = 'VOCAB',
  GRAMMAR = 'GRAMMAR',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface VocabItem {
  word: string;
  definition: string;
  example: string;
}

export interface ConversationFeedback {
  score: number; // 1-10
  strengths: string[];
  improvements: string[];
  suggestedVocab: VocabItem[];
  summary: string;
}

export interface TopicPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  systemPrompt: string;
}
