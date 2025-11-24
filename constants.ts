
import { TopicPreset } from './types';

export const TOPIC_PRESETS: TopicPreset[] = [
  {
    id: 'daily-life',
    title: 'Casual Chat',
    description: 'Talk about hobbies, weather, and daily routines.',
    icon: '☕',
    systemPrompt: 'You are a friendly neighbor. Engage in a casual, easy-going conversation about daily life. Keep sentences relatively short and encourage the user to speak.',
  },
  {
    id: 'business',
    title: 'Business English',
    description: 'Practice for meetings, interviews, and professional settings.',
    icon: '💼',
    systemPrompt: 'You are a professional colleague. Discuss a business project, a mock interview, or workplace dynamics. Use professional vocabulary but ensure the user understands.',
  },
  {
    id: 'travel',
    title: 'Travel & Tourism',
    description: 'Ordering food, asking for directions, and airport scenarios.',
    icon: '✈️',
    systemPrompt: 'You are a travel guide or a local local. The user is a tourist. Help them practice asking for directions, ordering food, or booking tickets.',
  },
  {
    id: 'debate',
    title: 'Debate Buddy',
    description: 'discuss opinions on technology, environment, or society.',
    icon: '⚖️',
    systemPrompt: 'You are a polite debate partner. Challenge the users opinions on a chosen topic (like AI, environment, or remote work) to help them practice argumentation and complex sentence structures.',
  },
];

export const GRAMMAR_TOPICS = [
  "Present Perfect Tense",
  "Conditionals (If clauses)",
  "Active vs Passive Voice",
  "Prepositions of Time (in, on, at)",
  "Gerunds vs Infinitives",
  "Modal Verbs (can, could, should)",
  "Articles (A, An, The)",
  "Phrasal Verbs"
];

export const AUDIO_SAMPLE_RATE_INPUT = 16000;
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;
