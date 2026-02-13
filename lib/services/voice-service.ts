import Voice from 'react-native-voice';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface VoiceServiceOptions {
  language?: string;
  onPartialResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export class VoiceService {
  private isListening = false;
  private recognizedText = '';
  private onPartialResult?: (text: string) => void;
  private onError?: (error: string) => void;

  constructor(options?: VoiceServiceOptions) {
    this.onPartialResult = options?.onPartialResult;
    this.onError = options?.onError;
    this.setupVoiceListeners();
  }

  private setupVoiceListeners() {
    Voice.onSpeechStart = () => {
      this.isListening = true;
      this.recognizedText = '';
    };

    Voice.onSpeechRecognized = () => {
      // Speech recognized
    };

    Voice.onSpeechEnd = () => {
      this.isListening = false;
    };

    Voice.onSpeechError = (error: any) => {
      this.isListening = false;
      const errorMessage = error?.error?.message || 'خطأ في التعرف على الصوت';
      this.onError?.(errorMessage);
    };

    Voice.onSpeechResults = (result: any) => {
      if (result.value && result.value.length > 0) {
        this.recognizedText = result.value[0];
        this.onPartialResult?.(this.recognizedText);
      }
    };

    Voice.onSpeechPartialResults = (result: any) => {
      if (result.value && result.value.length > 0) {
        this.recognizedText = result.value[0];
        this.onPartialResult?.(this.recognizedText);
      }
    };
  }

  /**
   * بدء الاستماع للأوامر الصوتية
   * @param language رمز اللغة (مثال: ar-SA للعربية)
   * @returns النص المعترف به
   */
  async startListening(language: string = 'ar-SA'): Promise<string> {
    try {
      if (this.isListening) {
        return this.recognizedText;
      }

      this.recognizedText = '';
      
      // تحديد اللغة بناءً على المنصة
      const locale = Platform.OS === 'ios' ? language : language;
      
      await Voice.start(locale);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.stopListening().then(() => {
            resolve(this.recognizedText);
          });
        }, 5000); // توقف الاستماع بعد 5 ثوان

        // إذا تم التعرف على النص قبل انتهاء الوقت
        const originalOnPartialResult = this.onPartialResult;
        this.onPartialResult = (text: string) => {
          originalOnPartialResult?.(text);
          if (text.length > 0) {
            clearTimeout(timeout);
            this.stopListening().then(() => {
              resolve(text);
            });
          }
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في بدء الاستماع';
      this.onError?.(errorMessage);
      throw error;
    }
  }

  /**
   * إيقاف الاستماع
   */
  async stopListening(): Promise<void> {
    try {
      if (this.isListening) {
        await Voice.stop();
      }
      this.isListening = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في إيقاف الاستماع';
      this.onError?.(errorMessage);
    }
  }

  /**
   * التحدث بنص معين
   * @param text النص المراد التحدث به
   * @param language رمز اللغة
   */
  async speak(text: string, language: string = 'ar'): Promise<void> {
    try {
      // إيقاف أي تحدث سابق
      await Speech.stop();

      // التحدث بالنص
      await Speech.speak(text, {
        language: language,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          // تم الانتهاء من التحدث
        },
        onError: (error) => {
          this.onError?.(`خطأ في التحدث: ${error}`);
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في التحدث';
      this.onError?.(errorMessage);
    }
  }

  /**
   * إيقاف التحدث الحالي
   */
  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في إيقاف التحدث';
      this.onError?.(errorMessage);
    }
  }

  /**
   * الحصول على حالة الاستماع
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * الحصول على النص المعترف به
   */
  getRecognizedText(): string {
    return this.recognizedText;
  }

  /**
   * تنظيف الموارد
   */
  async destroy(): Promise<void> {
    try {
      await this.stopListening();
      await this.stopSpeaking();
      Voice.destroy();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في تنظيف الموارد';
      this.onError?.(errorMessage);
    }
  }
}

// إنشاء نسخة واحدة من الخدمة
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(options?: VoiceServiceOptions): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService(options);
  }
  return voiceServiceInstance;
}
