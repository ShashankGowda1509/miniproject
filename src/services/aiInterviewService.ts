// AI Interview Service - Modular design for easy backend integration
// This module provides placeholder AI responses that can be replaced with real AI APIs

export type InterviewType = 'hr' | 'technical';

export interface InterviewQuestion {
  id: string;
  question: string;
  type: InterviewType;
  difficulty: 'easy' | 'medium' | 'hard';
  hint?: string;
  sampleAnswer?: string;
}

export interface FeedbackResponse {
  grammarCorrection: string | null;
  improvedVersion: string;
  feedback: string;
  suggestions: string[];
}

// Sample HR questions
const hrQuestions: InterviewQuestion[] = [
  {
    id: 'hr-1',
    question: 'Tell me about yourself and your background.',
    type: 'hr',
    difficulty: 'easy',
    hint: 'Focus on your professional journey and key achievements.',
    sampleAnswer: 'I am a software developer with 3 years of experience. I specialize in web development and have worked on various projects involving React and Node.js. I am passionate about creating user-friendly applications.',
  },
  {
    id: 'hr-2',
    question: 'Why are you interested in this position?',
    type: 'hr',
    difficulty: 'easy',
    hint: 'Connect your skills and interests to the role.',
    sampleAnswer: 'I am excited about this position because it aligns with my skills in frontend development and offers opportunities for growth. I admire the company\'s focus on innovation.',
  },
  {
    id: 'hr-3',
    question: 'What are your greatest strengths?',
    type: 'hr',
    difficulty: 'medium',
    hint: 'Give specific examples that demonstrate your strengths.',
    sampleAnswer: 'My greatest strength is problem-solving. I enjoy breaking down complex problems into manageable parts. For example, I once optimized a database query that reduced load time by 50%.',
  },
  {
    id: 'hr-4',
    question: 'Where do you see yourself in 5 years?',
    type: 'hr',
    difficulty: 'medium',
    hint: 'Show ambition while being realistic about growth.',
    sampleAnswer: 'In 5 years, I see myself as a senior developer leading a team. I want to grow technically while also developing leadership skills.',
  },
  {
    id: 'hr-5',
    question: 'Describe a challenging situation you faced and how you handled it.',
    type: 'hr',
    difficulty: 'hard',
    hint: 'Use the STAR method: Situation, Task, Action, Result.',
    sampleAnswer: 'In my previous role, we had a tight deadline for a major feature. I organized the team, prioritized tasks, and we delivered on time by working efficiently and communicating clearly.',
  },
];

// Sample Technical questions
const technicalQuestions: InterviewQuestion[] = [
  {
    id: 'tech-1',
    question: 'Explain the difference between let, const, and var in JavaScript.',
    type: 'technical',
    difficulty: 'easy',
    hint: 'Think about scope and mutability.',
    sampleAnswer: 'var is function-scoped and can be redeclared. let is block-scoped and can be reassigned but not redeclared. const is block-scoped and cannot be reassigned after initialization.',
  },
  {
    id: 'tech-2',
    question: 'What is the virtual DOM and how does React use it?',
    type: 'technical',
    difficulty: 'medium',
    hint: 'Think about performance optimization.',
    sampleAnswer: 'The virtual DOM is a lightweight copy of the actual DOM. React uses it to batch updates and minimize direct DOM manipulation. When state changes, React compares the virtual DOM with the real DOM and only updates what has changed.',
  },
  {
    id: 'tech-3',
    question: 'Explain the concept of closures in JavaScript.',
    type: 'technical',
    difficulty: 'medium',
    hint: 'Think about function scope and variable access.',
    sampleAnswer: 'A closure is a function that has access to variables from its outer scope, even after the outer function has returned. This allows for data privacy and creating factory functions.',
  },
  {
    id: 'tech-4',
    question: 'What are the SOLID principles in software development?',
    type: 'technical',
    difficulty: 'hard',
    hint: 'Each letter represents a principle of object-oriented design.',
    sampleAnswer: 'SOLID stands for: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. These principles help create maintainable and scalable code.',
  },
  {
    id: 'tech-5',
    question: 'How would you optimize a slow database query?',
    type: 'technical',
    difficulty: 'hard',
    hint: 'Think about indexing, query structure, and data retrieval.',
    sampleAnswer: 'I would first analyze the query with EXPLAIN. Then consider adding indexes, optimizing JOIN operations, limiting data retrieved, and possibly caching results.',
  },
];

// Get questions based on type
export function getQuestions(type: InterviewType): InterviewQuestion[] {
  return type === 'hr' ? hrQuestions : technicalQuestions;
}

// Get a random question
export function getRandomQuestion(type: InterviewType): InterviewQuestion {
  const questions = getQuestions(type);
  return questions[Math.floor(Math.random() * questions.length)];
}

// Simple grammar checking (placeholder - replace with real API)
function checkGrammar(text: string): string | null {
  // Basic grammar patterns to detect
  const commonErrors: [RegExp, string][] = [
    [/\bi\b/g, 'I'], // lowercase 'i'
    [/\bdont\b/gi, "don't"],
    [/\bcant\b/gi, "can't"],
    [/\bwont\b/gi, "won't"],
    [/\bim\b/gi, "I'm"],
    [/\bive\b/gi, "I've"],
    [/\btheres\b/gi, "there's"],
    [/\bits\b(?!\s+(?:own|self))/gi, "it's"], // "its" -> "it's" unless possessive
  ];

  let corrected = text;
  let hasCorrections = false;

  for (const [pattern, replacement] of commonErrors) {
    if (pattern.test(corrected)) {
      hasCorrections = true;
      corrected = corrected.replace(pattern, replacement);
    }
  }

  return hasCorrections ? corrected : null;
}

// Generate improved version of the answer
function improveAnswer(text: string): string {
  // Add structure and polish (placeholder)
  let improved = text.trim();
  
  // Ensure proper capitalization
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  
  // Ensure proper ending punctuation
  if (!/[.!?]$/.test(improved)) {
    improved += '.';
  }
  
  return improved;
}

// Generate feedback for an answer (placeholder - replace with real AI API)
export function generateFeedback(answer: string, question: InterviewQuestion): FeedbackResponse {
  const grammarCorrection = checkGrammar(answer);
  const improvedVersion = improveAnswer(answer);
  
  // Generate basic feedback based on answer length and content
  let feedback = '';
  const suggestions: string[] = [];
  
  const wordCount = answer.split(/\s+/).length;
  
  if (wordCount < 10) {
    feedback = 'Your answer is quite brief. Consider providing more details and examples.';
    suggestions.push('Try to elaborate with specific examples from your experience.');
    suggestions.push('Use the STAR method for behavioral questions.');
  } else if (wordCount < 30) {
    feedback = 'Good start! Your answer covers the basics but could use more depth.';
    suggestions.push('Consider adding a concrete example.');
    suggestions.push('Explain the impact or result of your actions.');
  } else {
    feedback = 'Good answer length. Make sure your points are clear and well-structured.';
    suggestions.push('Ensure your answer directly addresses the question.');
    suggestions.push('Practice maintaining a confident tone.');
  }
  
  return {
    grammarCorrection,
    improvedVersion,
    feedback,
    suggestions,
  };
}

// Generate AI interviewer response
export function generateInterviewerResponse(
  userAnswer: string,
  currentQuestion: InterviewQuestion,
  feedback: FeedbackResponse
): string {
  if (userAnswer.toLowerCase().includes("don't know") || 
      userAnswer.toLowerCase().includes("not sure") ||
      userAnswer.trim().length < 5) {
    return `I understand. Let me give you a hint: ${currentQuestion.hint || 'Think about your relevant experiences and skills.'} Would you like to try answering again, or should I share a sample answer?`;
  }
  
  return `Thank you for your answer. ${feedback.feedback} ${feedback.suggestions.length > 0 ? 'Here\'s a suggestion: ' + feedback.suggestions[0] : ''} Let's move on to the next question.`;
}
