declare module 'react-native-voice' {
  interface VoiceError {
    error?: {
      message?: string;
    };
  }

  interface VoiceResult {
    value?: string[];
  }

  const Voice: {
    start: (locale: string) => Promise<void>;
    stop: () => Promise<void>;
    cancel: () => Promise<void>;
    destroy: () => void;
    isAvailable: () => Promise<boolean>;
    
    onSpeechStart: (() => void) | null;
    onSpeechRecognized: (() => void) | null;
    onSpeechEnd: (() => void) | null;
    onSpeechError: ((error: VoiceError) => void) | null;
    onSpeechResults: ((result: VoiceResult) => void) | null;
    onSpeechPartialResults: ((result: VoiceResult) => void) | null;
  };

  export default Voice;
}
