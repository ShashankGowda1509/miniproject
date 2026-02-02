import { useState, useEffect, useRef } from 'react';

interface UseSpeechRecognitionProps {
  onResult: (text: string) => void;
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

export function useSpeechRecognition({
  onResult,
  continuous = true,
  interimResults = true,
  lang = 'en-US',
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart if no speech detected
        recognition.stop();
        if (isListening) {
          setTimeout(() => recognition.start(), 100);
        }
      }
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart recognition if it stops unexpectedly
        setTimeout(() => recognition.start(), 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, interimResults, lang]);

  const startListening = () => {
    if (!recognitionRef.current) {
      console.warn('⚠️ Speech recognition not available');
      return;
    }
    
    if (isListening) {
      console.log('⚠️ Speech recognition already running');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('🎤 Speech recognition started');
    } catch (error: any) {
      // Handle "already started" error gracefully
      if (error.message && error.message.includes('already started')) {
        console.log('🎤 Speech recognition already active');
        setIsListening(true);
      } else {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
      console.log('🎤 Speech recognition stopped');
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
}