import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { parseResume, generateResumeQuestions, getDemoResume, ParsedResume, ResumeQuestion } from '@/services/resumeService';
import { generateFeedback } from '@/services/aiInterviewService';
import TranscriptPanel, { TranscriptItem } from '@/components/TranscriptPanel';
import VoiceWave from '@/components/VoiceWave';
import { Upload, FileText, Play, Mic, MicOff, Square, RotateCcw, Volume2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResumeInterview() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [interviewType, setInterviewType] = useState<'hr' | 'technical'>('hr');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [questions, setQuestions] = useState<ResumeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ improved: string; suggestions: string[] } | null>(null);

  const speechRecognition = useSpeechRecognition({
    onResult: handleUserAnswer,
    continuous: false,
  });

  const speechSynthesis = useSpeechSynthesis({ rate: 0.9 });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setIsUploading(true);

    try {
      const parsed = await parseResume(file);
      setParsedResume(parsed);
    } catch (error) {
      console.error('Error parsing resume:', error);
      // Use demo resume as fallback
      setParsedResume(getDemoResume());
    } finally {
      setIsUploading(false);
    }
  }, []);

  const useDemoResume = () => {
    setParsedResume(getDemoResume());
    setResumeFile(null);
  };

  function handleUserAnswer(answer: string) {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Add user's answer to transcript
    const userItem: TranscriptItem = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: answer,
      timestamp: new Date(),
    };
    
    // Generate feedback using the generic interview service
    const feedback = generateFeedback(answer, {
      id: currentQuestion.id,
      question: currentQuestion.question,
      type: interviewType,
      difficulty: 'medium',
    });
    
    if (feedback.grammarCorrection) {
      userItem.grammarCorrection = feedback.grammarCorrection;
    }

    setTranscript(prev => [...prev, userItem]);
    setLastFeedback({
      improved: feedback.improvedVersion,
      suggestions: feedback.suggestions,
    });

    // AI response
    const aiResponse = `Thank you for your answer. ${feedback.feedback} Let's continue.`;
    
    setTimeout(() => {
      const aiItem: TranscriptItem = {
        id: `ai-${Date.now()}`,
        speaker: 'ai',
        text: aiResponse,
        timestamp: new Date(),
      };
      setTranscript(prev => [...prev, aiItem]);
      speechSynthesis.speak(aiResponse);
    }, 500);
  }

  function startSession() {
    if (!parsedResume) return;

    setIsSessionActive(true);
    setTranscript([]);
    setLastFeedback(null);
    setCurrentQuestionIndex(0);
    
    // Generate questions from resume
    const generatedQuestions = generateResumeQuestions(parsedResume, interviewType);
    setQuestions(generatedQuestions);
    
    // Start with greeting
    const greeting = `Welcome! I've reviewed your resume. I can see you have experience with ${parsedResume.skills.slice(0, 3).join(', ')}. Let's begin the ${interviewType === 'hr' ? 'HR' : 'Technical'} interview.`;
    
    const greetingItem: TranscriptItem = {
      id: 'ai-greeting',
      speaker: 'ai',
      text: greeting,
      timestamp: new Date(),
    };
    
    setTranscript([greetingItem]);
    speechSynthesis.speak(greeting);
    
    // Ask first question
    setTimeout(() => {
      if (generatedQuestions[0]) {
        const questionItem: TranscriptItem = {
          id: `ai-q-0`,
          speaker: 'ai',
          text: generatedQuestions[0].question,
          timestamp: new Date(),
        };
        setTranscript(prev => [...prev, questionItem]);
        speechSynthesis.speak(generatedQuestions[0].question);
      }
    }, 4000);
  }

  function endSession() {
    setIsSessionActive(false);
    speechRecognition.stopListening();
    speechSynthesis.stop();
  }

  function nextQuestion() {
    setLastFeedback(null);
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      // End of questions
      const endMessage = "We've covered all the questions based on your resume. Thank you for your responses!";
      const endItem: TranscriptItem = {
        id: 'ai-end',
        speaker: 'ai',
        text: endMessage,
        timestamp: new Date(),
      };
      setTranscript(prev => [...prev, endItem]);
      speechSynthesis.speak(endMessage);
      return;
    }
    
    setCurrentQuestionIndex(nextIndex);
    const question = questions[nextIndex];
    
    const questionItem: TranscriptItem = {
      id: `ai-q-${nextIndex}`,
      speaker: 'ai',
      text: question.question,
      timestamp: new Date(),
    };
    setTranscript(prev => [...prev, questionItem]);
    speechSynthesis.speak(question.question);
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Main Area */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Resume Upload Section */}
        {!isSessionActive && (
          <>
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Upload Your Resume</CardTitle>
                <CardDescription>
                  Upload your resume and we'll generate personalized interview questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer flex flex-col items-center gap-4"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Click to upload resume</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOC, DOCX, or TXT (Max 5MB)
                      </p>
                    </div>
                  </label>
                </div>

                {resumeFile && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 truncate">{resumeFile.name}</span>
                    {isUploading && <span className="text-sm text-muted-foreground">Processing...</span>}
                    {parsedResume && <CheckCircle className="h-5 w-5 text-success" />}
                  </div>
                )}

                <div className="text-center">
                  <span className="text-muted-foreground text-sm">or</span>
                </div>

                <Button variant="outline" className="w-full" onClick={useDemoResume}>
                  Use Demo Resume
                </Button>
              </CardContent>
            </Card>

            {/* Parsed Resume Display */}
            {parsedResume && (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Resume Analyzed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Skills Detected:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parsedResume.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {parsedResume.experience.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Experience:</p>
                      <ul className="mt-2 text-sm space-y-1">
                        {parsedResume.experience.map((exp, i) => (
                          <li key={i}>• {exp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Tabs value={interviewType} onValueChange={(v) => setInterviewType(v as 'hr' | 'technical')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="hr">HR Interview</TabsTrigger>
                      <TabsTrigger value="technical">Technical Interview</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <Button className="w-full btn-gradient" size="lg" onClick={startSession}>
                    <Play className="mr-2 h-5 w-5" />
                    Start Resume-Based Interview
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Active Session */}
        {isSessionActive && currentQuestion && (
          <>
            {/* Current Question */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardTitle>
                  <span className="px-2 py-1 text-xs rounded-full bg-accent/10 text-accent">
                    {currentQuestion.category}
                  </span>
                </div>
                <CardDescription>
                  Based on: {currentQuestion.source}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{currentQuestion.question}</p>
              </CardContent>
            </Card>

            {/* Voice Controls */}
            <Card className="card-elevated">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="h-16 flex items-center justify-center">
                    <VoiceWave isActive={speechRecognition.isListening || speechSynthesis.isSpeaking} />
                  </div>
                  
                  <p className="text-muted-foreground text-sm">
                    {speechSynthesis.isSpeaking && (
                      <span className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-accent animate-pulse" />
                        AI is speaking...
                      </span>
                    )}
                    {speechRecognition.isListening && (
                      <span className="flex items-center gap-2 text-primary">
                        <Mic className="h-4 w-4 animate-pulse" />
                        Listening... Speak now
                      </span>
                    )}
                    {!speechSynthesis.isSpeaking && !speechRecognition.isListening && (
                      'Click the microphone to answer'
                    )}
                  </p>

                  {speechRecognition.transcript && (
                    <div className="w-full p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">You're saying:</p>
                      <p className="text-foreground">{speechRecognition.transcript}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      size="lg"
                      variant={speechRecognition.isListening ? "destructive" : "default"}
                      className={cn(
                        "w-16 h-16 rounded-full",
                        !speechRecognition.isListening && "btn-gradient"
                      )}
                      onClick={speechRecognition.isListening ? speechRecognition.stopListening : speechRecognition.startListening}
                      disabled={speechSynthesis.isSpeaking}
                    >
                      {speechRecognition.isListening ? (
                        <MicOff className="h-6 w-6" />
                      ) : (
                        <Mic className="h-6 w-6" />
                      )}
                    </Button>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={nextQuestion}
                      disabled={speechRecognition.isListening || speechSynthesis.isSpeaking}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Next Question
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={endSession}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      End Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Card */}
            {lastFeedback && (
              <Card className="card-elevated border-l-4 border-l-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">AI Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Improved Version:</p>
                    <p className="text-sm bg-accent/10 p-3 rounded-lg">{lastFeedback.improved}</p>
                  </div>
                  {lastFeedback.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Suggestions:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {lastFeedback.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Transcript Sidebar */}
      <div className="lg:w-80 xl:w-96">
        <TranscriptPanel items={transcript} className="h-[calc(100vh-12rem)]" />
      </div>
    </div>
  );
}
