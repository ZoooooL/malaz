import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { CommandType, ParsedCommand, CommandParser } from '@/lib/services/command-parser';
import { VoiceService } from '@/lib/services/voice-service';
import { OdooService, OdooResponse } from '@/lib/services/odoo-service';
import { OpenAIService } from '@/lib/services/openai-service';

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

    case 'INITIALIZE_SERVICES':
      return {
        ...state,
        voiceService: action.payload.voiceService,
        odooService: action.payload.odooService,
        openaiService: action.payload.openaiService,
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
  });

  /**
   * تنفيذ أمر صوتي
   */
  const executeCommand = useCallback(
    async (text: string) => {
      if (!state.odooService) {
        dispatch({ type: 'SET_ERROR', payload: 'خدمة Odoo غير مهيأة' });
        return;
      }

      const commandId = `cmd_${Date.now()}`;
      const parsedCommand = CommandParser.parseCommand(text);

      // إضافة الأمر إلى السجل
      dispatch({
        type: 'ADD_COMMAND',
        payload: {
          id: commandId,
          originalText: text,
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
          const message = `تم تنفيذ الأمر بنجاح. ${
            result.data?.count ? `عدد النتائج: ${result.data.count}` : ''
          }`;
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
    [state.odooService]
  );

  /**
   * بدء الاستماع
   */
  const startListening = useCallback(async () => {
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
