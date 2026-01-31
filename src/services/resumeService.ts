// Resume parsing service - placeholder for actual PDF/DOC parsing
// This can be replaced with actual parsing libraries or API calls

export interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  rawText: string;
}

export interface ResumeQuestion {
  id: string;
  question: string;
  category: 'skills' | 'experience' | 'education' | 'project' | 'general';
  source: string; // What part of resume triggered this question
}

// Placeholder parsing function - in production, use pdf-parse, mammoth, or an API
export async function parseResume(file: File): Promise<ParsedResume> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      
      // Simple text extraction for demo - replace with actual parsing
      const parsed = extractResumeInfo(text);
      resolve(parsed);
    };
    
    // For demo purposes, we'll just read as text
    // In production, use proper PDF/DOC parsing
    reader.readAsText(file);
  });
}

function extractResumeInfo(text: string): ParsedResume {
  // Simple pattern matching for demo
  // Replace with NLP/ML-based extraction in production
  
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
  const phonePattern = /[\d\s-]{10,}/g;
  
  const emails = text.match(emailPattern);
  const phones = text.match(phonePattern);
  
  // Common skill keywords to look for
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 
    'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'HTML', 'CSS', 
    'Machine Learning', 'Data Analysis', 'Agile', 'Scrum',
    'Communication', 'Leadership', 'Problem Solving', 'Teamwork'
  ];
  
  const foundSkills = skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  return {
    name: null, // Would need more sophisticated parsing
    email: emails?.[0] || null,
    phone: phones?.[0] || null,
    skills: foundSkills.length > 0 ? foundSkills : ['General Programming', 'Communication'],
    experience: extractSection(text, ['experience', 'work history', 'employment']),
    education: extractSection(text, ['education', 'academic', 'degree']),
    projects: extractSection(text, ['project', 'portfolio']),
    rawText: text,
  };
}

function extractSection(text: string, keywords: string[]): string[] {
  // Simple section extraction - placeholder
  const lines = text.split('\n').filter(line => line.trim());
  const relevantLines: string[] = [];
  
  let inSection = false;
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (keywords.some(kw => lowerLine.includes(kw))) {
      inSection = true;
      continue;
    }
    
    if (inSection) {
      if (line.trim().length > 20 && line.trim().length < 200) {
        relevantLines.push(line.trim());
        if (relevantLines.length >= 3) break;
      }
    }
  }
  
  return relevantLines;
}

// Generate questions based on parsed resume
export function generateResumeQuestions(resume: ParsedResume, type: 'hr' | 'technical'): ResumeQuestion[] {
  const questions: ResumeQuestion[] = [];
  
  // Skill-based questions
  if (resume.skills.length > 0) {
    const skill = resume.skills[0];
    questions.push({
      id: `skill-${Date.now()}-1`,
      question: `I see you have ${skill} listed in your resume. Can you describe a project where you used ${skill}?`,
      category: 'skills',
      source: `Skill: ${skill}`,
    });
    
    if (resume.skills.length > 1) {
      const skill2 = resume.skills[1];
      questions.push({
        id: `skill-${Date.now()}-2`,
        question: `How would you rate your proficiency in ${skill2}? Can you give an example of how you've applied it?`,
        category: 'skills',
        source: `Skill: ${skill2}`,
      });
    }
  }
  
  // Experience-based questions
  if (resume.experience.length > 0) {
    questions.push({
      id: `exp-${Date.now()}`,
      question: 'Can you walk me through your most recent work experience and your key responsibilities?',
      category: 'experience',
      source: 'Experience section',
    });
  }
  
  // Education questions
  if (resume.education.length > 0) {
    questions.push({
      id: `edu-${Date.now()}`,
      question: 'How has your educational background prepared you for this role?',
      category: 'education',
      source: 'Education section',
    });
  }
  
  // Project questions
  if (resume.projects.length > 0) {
    questions.push({
      id: `proj-${Date.now()}`,
      question: 'Tell me about a challenging project you worked on. What were the main obstacles and how did you overcome them?',
      category: 'project',
      source: 'Projects section',
    });
  }
  
  // Type-specific questions
  if (type === 'technical') {
    questions.push({
      id: `tech-${Date.now()}`,
      question: 'Based on your technical experience, how do you approach debugging a complex issue in production?',
      category: 'general',
      source: 'Technical interview',
    });
  } else {
    questions.push({
      id: `hr-${Date.now()}`,
      question: 'Based on your experience, how do you handle conflicting priorities or deadlines?',
      category: 'general',
      source: 'HR interview',
    });
  }
  
  // Add general questions
  questions.push({
    id: `general-${Date.now()}`,
    question: 'What motivates you to apply for this position, and how does it align with your career goals?',
    category: 'general',
    source: 'General assessment',
  });
  
  return questions;
}

// Demo resume for testing without file upload
export function getDemoResume(): ParsedResume {
  return {
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 234 567 8900',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'Agile'],
    experience: [
      'Software Developer at Tech Company (2021-Present)',
      'Junior Developer at Startup Inc (2019-2021)',
    ],
    education: [
      'B.S. Computer Science, University (2019)',
    ],
    projects: [
      'E-commerce Platform - Full-stack application',
      'Task Management App - React & Node.js',
    ],
    rawText: 'Demo resume for testing purposes.',
  };
}
