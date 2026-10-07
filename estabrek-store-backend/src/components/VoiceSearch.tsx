"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

const MicIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface VoiceSearchProps {
  onResult: (text: string) => void;
  onClose?: () => void;
  language?: string;
  placeholder?: string;
  className?: string;
}

export function VoiceSearchModal({
  onResult,
  onClose,
  language = "ar-SA",
  placeholder = "تحدث الآن...",
  className = "",
}: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [volume, setVolume] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("المتصفح لا يدعم البحث الصوتي");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      
      setTranscript(text);
      
      if (result.isFinal) {
        onResult(text);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      switch (event.error) {
        case "not-allowed":
          setError("يرجى السماح بالوصول للميكروفون");
          break;
        case "no-speech":
          setError("لم يتم اكتشاف أي صوت");
          break;
        case "network":
          setError("خطأ في الشبكة");
          break;
        default:
          setError("حدث خطأ أثناء التعرف على الصوت");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [language, onResult]);

  // Volume visualization
  const startVolumeVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setVolume(average / 255);
        
        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }, []);

  const stopVolumeVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setVolume(0);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setTranscript("");
    setIsListening(true);
    
    recognitionRef.current.start();
    startVolumeVisualization();
  }, [startVolumeVisualization]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    stopVolumeVisualization();
    setIsListening(false);
  }, [stopVolumeVisualization]);

  // Auto-start on mount
  useEffect(() => {
    if (isSupported) {
      startListening();
    }
    
    return () => {
      stopListening();
    };
  }, [isSupported, startListening, stopListening]);

  return (
    <div className={`voice-search-modal ${className}`}>
      <div className="voice-search-overlay" onClick={onClose} />
      <div className="voice-search-content">
        {/* Close Button */}
        {onClose && (
          <button className="voice-search-close" onClick={onClose}>
            <CloseIcon />
          </button>
        )}

        {/* Visualization */}
        <div className="voice-visualization">
          <div className="voice-rings">
            <div className="ring ring-1" style={{ transform: `scale(${1 + volume * 0.5})` }} />
            <div className="ring ring-2" style={{ transform: `scale(${1 + volume * 0.3})` }} />
            <div className="ring ring-3" style={{ transform: `scale(${1 + volume * 0.1})` }} />
          </div>
          
          <button
            className={`voice-button ${isListening ? "listening" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
          >
            {isListening ? <StopIcon /> : <MicIcon />}
          </button>
        </div>

        {/* Status */}
        <div className="voice-status">
          {error ? (
            <p className="voice-error">{error}</p>
          ) : isListening ? (
            <p className="voice-listening">{placeholder}</p>
          ) : (
            <p className="voice-hint">اضغط للتحدث</p>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="voice-transcript">
            <p>{transcript}</p>
          </div>
        )}

        {/* Language Indicator */}
        <div className="voice-language">
          🌐 العربية
        </div>
      </div>
    </div>
  );
}

// Voice Search Trigger Button
interface VoiceSearchTriggerProps {
  onClick: () => void;
  className?: string;
}

export function VoiceSearchTrigger({ onClick, className = "" }: VoiceSearchTriggerProps) {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  if (!isSupported) return null;

  return (
    <button
      className={`voice-search-trigger ${className}`}
      onClick={onClick}
      title="البحث الصوتي"
    >
      <MicIcon />
    </button>
  );
}

// Inline Voice Search (for search bar)
interface InlineVoiceSearchProps {
  onResult: (text: string) => void;
  className?: string;
}

export function InlineVoiceSearch({ onResult, className = "" }: InlineVoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "ar-SA";

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  if (!isSupported) return null;

  return (
    <button
      className={`inline-voice-search ${isListening ? "listening" : ""} ${className}`}
      onClick={toggleListening}
      title={isListening ? "إيقاف" : "البحث الصوتي"}
    >
      <MicIcon />
      {isListening && <span className="pulse-ring" />}
    </button>
  );
}
