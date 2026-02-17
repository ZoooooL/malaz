import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { CommandType, ParsedCommand, CommandParser } from '@/lib/services/command-parser';
import { VoiceService, getVoiceService } from '@/lib/services/voice-service';
import { OdooService, OdooResponse, getOdooService } from '@/lib/services/odoo-service';
import { OpenAIService, getOpenAIService } from '@/lib/services/openai-service';
import { getRuntimeConfig } from '@/lib/config/runtime-config';

/**
 * حالة الأمر الفردي
 */
export interface CommandState {
  id: string;
  originalText: string;
  parsedCommand: ParsedCommand;
  result?: OdooResponse;
  isLoading: boolean;
  error?: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'success' | 'error';
}

/**
 * حالة السياق الرئيسية
 */
export interface VoiceCommandContextState {
  commands: CommandState[];
  isListening: boolean;
  currentCommand?: CommandState;
  error?: string;
  isInitializing?: boolean;
  voiceService?: VoiceService;
  odooService?: OdooService;
  openaiService?: OpenAIService;
}

/**
 * أنواع الإجراءات
 */
type VoiceCommandAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'ADD_COMMAND'; payload: CommandState }
  | { type: 'UPDATE_COMMAND'; payload: Partial<CommandState> & { id: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'INITIALIZE_SERVICES'; payload: { voiceService: VoiceService; odooService: OdooService; openaiService?: OpenAIService } }
  | { type: 'CLEAR_COMMANDS' };

/**
 * دالة التقليل
 */
function voiceCommandReducer(
  state: VoiceCommandContextState,
  action: VoiceCommandAction
): VoiceCommandContextState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true, error: undefined };

    case 'STOP_LISTENING':
      return { ...state, isListening: false };

    case 'ADD_COMMAND': {
      const newCommands = [action.payload, ...state.commands];
      return {
        ...state,
        commands: newCommands,
        currentCommand: action.payload,
        error: undefined,
      };
    }

    case 'UPDATE_COMMAND': {
      const updatedCommands = state.commands.map(cmd =>
        cmd.id === action.payload.id ? { ...cmd, ...action.payload } : cmd
      );
      return {
        ...state,
        commands: updatedCommands,
        currentCommand:
          state.currentCommand?.id === action.payload.id
            ? { ...state.currentCommand, ...action.payload }
            : state.currentCommand,
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: undefined };

    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };

    case 'INITIALIZE_SERVICES':
      return {
        ...state,
        voiceService: action.payload.voiceService,
        odooService: action.payload.odooService,
        openaiService: action.payload.openaiService,
        error: undefined,
      };

    case 'CLEAR_COMMANDS':
      return { ...state, commands: [], currentCommand: undefined };

    default:
      return state;
  }
}

/**
 * السياق
 */
const VoiceCommandContext = createContext<{
  state: VoiceCommandContextState;
  dispatch: React.Dispatch<VoiceCommandAction>;
  executeCommand: (text: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearCommands: () => void;
  speakResult: (text: string) => Promise<void>;
} | undefined>(undefined);

/**
 * موفر السياق
 */
export function VoiceCommandProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(voiceCommandReducer, {
    commands: [],
    isListening: false,
    isInitializing: true,
  });

  useEffect(() => {
    const initializeServices = async () => {
      try {
        const voiceService = getVoiceService();
        const odooService = getOdooService();

        const runtimeConfig = getRuntimeConfig();

        if (!runtimeConfig.odooServerUrl) {
          throw new Error('يرجى ضبط عنوان خادم Odoo قبل الاستخدام');
        }

        await odooService.initialize({
          serverUrl: runtimeConfig.odooServerUrl,
          database: runtimeConfig.odooDatabase,
          username: runtimeConfig.odooUsername,
          password: runtimeConfig.odooApiKey,
          apiKey: runtimeConfig.odooApiKey,
        });

        try {
          await odooService.login();
        } catch {
          // فشل تسجيل الدخول لا يمنع تشغيل التطبيق، قد ينجح عند استدعاء لاحق.
        }

        let openaiService: OpenAIService | undefined;
        try {
          openaiService = getOpenAIService();
        } catch {
          openaiService = undefined;
        }

        dispatch({
          type: 'INITIALIZE_SERVICES',
          payload: { voiceService, odooService, openaiService },
        });
        dispatch({ type: 'SET_INITIALIZING', payload: false });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'فشل تهيئة الخدمات',
        });
        dispatch({ type: 'SET_INITIALIZING', payload: false });
      }
    };

    void initializeServices();
  }, []);

  /**
   * التحدث برد
   */
  const speakResult = useCallback(
    async (text: string) => {
      if (state.voiceService) {
        await state.voiceService.speak(text, 'ar');
      }
    },
    [state.voiceService]
  );

  /**
   * تنفيذ أمر صوتي
   */
  const executeCommand = useCallback(
    async (text: string) => {
      if (!state.odooService) {
        dispatch({ type: 'SET_ERROR', payload: 'خدمة Odoo غير مهيأة' });
        return;
      }

      const normalizedText = state.openaiService
        ? await state.openaiService.correctText(text).catch(() => text)
        : text;

      const commandId = `cmd_${Date.now()}`;
      const parsedCommand = CommandParser.parseCommand(normalizedText);

      // إضافة الأمر إلى السجل
      dispatch({
        type: 'ADD_COMMAND',
        payload: {
          id: commandId,
          originalText: normalizedText,
          parsedCommand,
          isLoading: true,
          timestamp: Date.now(),
          status: 'executing',
        },
      });

      try {
        let result: OdooResponse;

        // تنفيذ الأمر بناءً على النوع
        switch (parsedCommand.type) {
          case CommandType.SALES_TODAY:
            result = await state.odooService.getSalesToday();
            break;

          case CommandType.SALES_THIS_MONTH:
            result = await state.odooService.getSalesThisMonth();
            break;

          case CommandType.UNPAID_INVOICES:
            result = await state.odooService.getUnpaidInvoices();
            break;

          case CommandType.LOW_STOCK:
            result = await state.odooService.getLowStockProducts();
            break;

          case CommandType.TOP_CUSTOMERS:
            result = await state.odooService.getTopCustomers(
              parsedCommand.parameters.period || 'month'
            );
            break;

          case CommandType.CUSTOMER_INFO:
            if (parsedCommand.parameters.customerName) {
              result = await state.odooService.searchCustomer(
                parsedCommand.parameters.customerName
              );
            } else {
              result = { success: false, error: 'لم يتم تحديد اسم العميل' };
            }
            break;

          default:
            result = {
              success: false,
              error: CommandParser.getErrorMessage(parsedCommand.type),
            };
        }

        // تحديث الأمر بالنتيجة
        dispatch({
          type: 'UPDATE_COMMAND',
          payload: {
            id: commandId,
            result,
            isLoading: false,
            status: result.success ? 'success' : 'error',
            error: result.error,
          },
        });

        // تشغيل رد صوتي
        if (result.success) {
          const fallbackMessage = `تم تنفيذ الأمر بنجاح. ${
            result.data?.count ? `عدد النتائج: ${result.data.count}` : ''
          }`;
          const message = state.openaiService
            ? await state.openaiService.generateResponse(normalizedText, result).catch(() => fallbackMessage)
            : fallbackMessage;

          await speakResult(message);
        } else {
          await speakResult(`حدث خطأ: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        dispatch({
          type: 'UPDATE_COMMAND',
          payload: {
            id: commandId,
            isLoading: false,
            status: 'error',
            error: errorMessage,
          },
        });
        await speakResult(`حدث خطأ: ${errorMessage}`);
      }
    },
    [state.odooService, state.openaiService, speakResult]
  );

  /**
   * بدء الاستماع
   */
  const startListening = useCallback(async () => {
    if (state.isInitializing) {
      dispatch({ type: 'SET_ERROR', payload: 'جاري تهيئة الخدمات، حاول بعد ثوانٍ قليلة' });
      return;
    }

    if (!state.voiceService) {
      dispatch({ type: 'SET_ERROR', payload: 'خدمة الصوت غير مهيأة' });
      return;
    }

    dispatch({ type: 'START_LISTENING' });

    try {
      const text = await state.voiceService.startListening('ar-SA');
      dispatch({ type: 'STOP_LISTENING' });

      if (text) {
        await executeCommand(text);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في الاستماع';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'STOP_LISTENING' });
    }
  }, [state.voiceService, executeCommand]);

  /**
   * إيقاف الاستماع
   */
  const stopListening = useCallback(async () => {
    if (state.voiceService) {
      await state.voiceService.stopListening();
    }
    dispatch({ type: 'STOP_LISTENING' });
  }, [state.voiceService]);

  /**
   * تنظيف السجل
   */
  const clearCommands = useCallback(() => {
    dispatch({ type: 'CLEAR_COMMANDS' });
  }, []);

  return (
    <VoiceCommandContext.Provider
      value={{
        state,
        dispatch,
        executeCommand,
        startListening,
        stopListening,
        clearCommands,
        speakResult,
      }}
    >
      {children}
    </VoiceCommandContext.Provider>
  );
}

/**
 * Hook لاستخدام السياق
 */
export function useVoiceCommand() {
  const context = useContext(VoiceCommandContext);
  if (!context) {
    throw new Error('useVoiceCommand يجب أن يكون داخل VoiceCommandProvider');
  }
  return context;
}
