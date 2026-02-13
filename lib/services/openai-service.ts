import axios, { AxiosInstance } from 'axios';

/**
 * واجهة نتيجة تحليل OpenAI
 */
export interface OpenAIAnalysisResult {
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  suggestedAction: string;
  explanation: string;
}

/**
 * خدمة OpenAI للتحليل الذكي للأوامر الصوتية
 */
export class OpenAIService {
  private apiKey: string;
  private axiosInstance: AxiosInstance;
  private model = 'gpt-3.5-turbo';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * تحليل الأمر الصوتي باستخدام OpenAI
   */
  async analyzeCommand(text: string): Promise<OpenAIAnalysisResult> {
    try {
      const systemPrompt = `أنت مساعد ذكي متخصص في فهم الأوامر الصوتية باللغة العربية لنظام إدارة المبيعات والفواتير.
      
تحليل الأمر التالي وتحديد:
1. النية (intent): ما يريده المستخدم (مثل: عرض_المبيعات، عرض_الفواتير، إنشاء_عرض_سعر، إلخ)
2. الثقة (confidence): من 0 إلى 1
3. المعاملات (parameters): البيانات المستخرجة من الأمر
4. الإجراء المقترح (suggestedAction): ما يجب فعله
5. شرح الأمر (explanation): شرح مختصر بالعربية

يجب أن تكون الإجابة بصيغة JSON فقط.`;

      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `حلل الأمر التالي: "${text}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.data.choices[0].message.content;
      
      // محاولة استخراج JSON من الرد
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('لم يتم الحصول على رد صحيح من OpenAI');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        intent: result.intent || 'unknown',
        confidence: result.confidence || 0.5,
        parameters: result.parameters || {},
        suggestedAction: result.suggestedAction || '',
        explanation: result.explanation || '',
      };
    } catch (error) {
      console.error('خطأ في تحليل الأمر:', error);
      throw error;
    }
  }

  /**
   * توليد رد ذكي بناءً على النتيجة
   */
  async generateResponse(
    command: string,
    result: any,
    context: string = ''
  ): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي متخصص في نظام إدارة المبيعات والفواتير. 
قم بتوليد رد ودود وواضح بالعربية يشرح نتيجة الأمر الصوتي للمستخدم.
الرد يجب أن يكون قصير ومختصر (جملة واحدة أو جملتين).`,
          },
          {
            role: 'user',
            content: `الأمر: "${command}"
النتيجة: ${JSON.stringify(result)}
السياق: ${context}

قم بتوليد رد ودود يشرح النتيجة:`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('خطأ في توليد الرد:', error);
      return 'تم معالجة الأمر بنجاح';
    }
  }

  /**
   * تصحيح النص المعترف عليه من الصوت
   */
  async correctText(text: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `أنت متخصص في تصحيح النصوص العربية. 
قم بتصحيح الأخطاء الإملائية واللغوية في النص دون تغيير المعنى.
أرجع النص المصحح فقط بدون شرح.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('خطأ في تصحيح النص:', error);
      return text; // إرجاع النص الأصلي في حالة الخطأ
    }
  }

  /**
   * استخراج المعاملات من الأمر
   */
  async extractParameters(text: string, commandType: string): Promise<Record<string, any>> {
    try {
      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `أنت متخصص في استخراج البيانات من الأوامر الصوتية بالعربية.
استخرج جميع المعاملات والبيانات ذات الصلة من الأمر.
أرجع النتيجة بصيغة JSON فقط.`,
          },
          {
            role: 'user',
            content: `نوع الأمر: ${commandType}
الأمر: "${text}"

استخرج المعاملات بصيغة JSON:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.error('خطأ في استخراج المعاملات:', error);
      return {};
    }
  }

  /**
   * التحقق من صحة الأمر
   */
  async validateCommand(text: string): Promise<{ isValid: boolean; reason: string }> {
    try {
      const response = await this.axiosInstance.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `أنت متخصص في التحقق من صحة الأوامر الصوتية.
تحقق مما إذا كان الأمر واضح وقابل للتنفيذ.
أرجع النتيجة بصيغة JSON: {"isValid": boolean, "reason": string}`,
          },
          {
            role: 'user',
            content: `تحقق من صحة الأمر التالي: "${text}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { isValid: true, reason: '' };
    } catch (error) {
      console.error('خطأ في التحقق من الأمر:', error);
      return { isValid: true, reason: '' };
    }
  }
}

// إنشاء نسخة واحدة من الخدمة
let openaiServiceInstance: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openaiServiceInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    openaiServiceInstance = new OpenAIService(apiKey);
  }
  return openaiServiceInstance;
}
