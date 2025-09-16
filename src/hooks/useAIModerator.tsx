import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface ModerationResult {
  flagged: boolean;
  action: 'allow' | 'block' | 'warn';
  reason?: string;
  categories?: Record<string, boolean>;
}

export interface VoiceRecording {
  isRecording: boolean;
  audioLevel: number;
  transcript: string;
  lastModeration?: ModerationResult;
}

export const useAIModerator = (callId: string, userId: string) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording>({
    isRecording: false,
    audioLevel: 0,
    transcript: '',
  });
  
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Moderate text content
  const moderateText = useCallback(async (content: string): Promise<ModerationResult> => {
    if (!isEnabled || !content.trim()) {
      return { flagged: false, action: 'allow' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-moderation', {
        body: {
          content,
          type: 'text',
          context: { userId, callId, timestamp: Date.now() }
        }
      });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Text moderation failed:', error);
      toast({
        title: "Moderation Error", 
        description: "Content filtering temporarily unavailable",
        variant: "destructive"
      });
      return { flagged: false, action: 'allow' };
    }
  }, [isEnabled, userId, callId, toast]);

  // Start voice monitoring
  const startVoiceMonitoring = useCallback(async () => {
    if (!isEnabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;
      
      // Set up audio analysis for visual feedback
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Monitor audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        setVoiceRecording(prev => ({ ...prev, audioLevel: average / 255 }));
        
        if (voiceRecording.isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };

      // Set up recording for transcription
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      let audioChunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        
        // Convert to base64 for API
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data, error } = await supabase.functions.invoke('voice-transcription', {
              body: {
                audioData: base64Audio,
                format: 'webm',
                userId,
                callId
              }
            });

            if (error) throw error;

            setVoiceRecording(prev => ({
              ...prev,
              transcript: data.transcript,
              lastModeration: data.moderation
            }));

            // Handle moderation action
            if (data.moderation.action === 'block') {
              toast({
                title: "Content Blocked",
                description: data.moderation.reason || "Voice content violated community guidelines",
                variant: "destructive"
              });
            } else if (data.moderation.action === 'warn') {
              toast({
                title: "Content Warning",
                description: data.moderation.reason || "Please keep content appropriate",
              });
            }

          } catch (error) {
            console.error('Voice transcription failed:', error);
          }
        };
        
        reader.readAsDataURL(audioBlob);
      };

      setVoiceRecording(prev => ({ ...prev, isRecording: true }));
      updateAudioLevel();

      // Record in 5-second chunks for real-time processing
      const recordInChunks = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        if (mediaRecorderRef.current?.state === 'inactive' && voiceRecording.isRecording) {
          mediaRecorderRef.current.start();
          setTimeout(recordInChunks, 5000); // 5-second chunks
        }
      };

      mediaRecorderRef.current.start();
      setTimeout(recordInChunks, 5000);

    } catch (error) {
      console.error('Failed to start voice monitoring:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone for voice monitoring",
        variant: "destructive"
      });
    }
  }, [isEnabled, userId, callId, toast, voiceRecording.isRecording]);

  // Stop voice monitoring
  const stopVoiceMonitoring = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setVoiceRecording({
      isRecording: false,
      audioLevel: 0,
      transcript: '',
    });
  }, []);

  return {
    isEnabled,
    setIsEnabled,
    voiceRecording,
    moderateText,
    startVoiceMonitoring,
    stopVoiceMonitoring,
  };
};