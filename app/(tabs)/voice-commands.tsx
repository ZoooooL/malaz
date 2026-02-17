import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useVoiceCommand } from '@/lib/context/voice-command-context';
import { CommandParser } from '@/lib/services/command-parser';
import { useColors } from '@/hooks/use-colors';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * شاشة الأوامر الصوتية
 */
export default function VoiceCommandsScreen() {
  const colors = useColors();
  const { state, startListening, stopListening, clearCommands } = useVoiceCommand();
  const [isRecording, setIsRecording] = useState(false);

  /**
   * معالج بدء التسجيل
   */
  const handleStartRecording = async () => {
    setIsRecording(true);
    try {
      await startListening();
    } finally {
      setIsRecording(false);
    }
  };

  /**
   * معالج إيقاف التسجيل
   */
  const handleStopRecording = async () => {
    setIsRecording(false);
    await stopListening();
  };

  /**
   * عرض عنصر الأمر
   */
  const renderCommandItem = ({ item }: any) => {
    const isSuccess = item.status === 'success';
    const isError = item.status === 'error';
    const isLoading = item.status === 'executing';

    return (
      <View
        className={`mb-3 p-4 rounded-lg border ${
          isSuccess
            ? 'bg-green-50 border-green-200'
            : isError
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
        }`}
      >
        {/* رأس الأمر */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
            {isSuccess && (
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
            )}
            {isError && <MaterialIcons name="error" size={20} color={colors.error} />}
            <Text className="ml-2 text-sm font-semibold text-foreground flex-1">
              {CommandParser.getCommandDescription(item.parsedCommand.type)}
            </Text>
          </View>
          <Text className="text-xs text-muted">
            {new Date(item.timestamp).toLocaleTimeString('ar-SA')}
          </Text>
        </View>

        {/* النص الأصلي */}
        <Text className="text-sm text-foreground mb-2">"{item.originalText}"</Text>

        {/* الخطأ أو النتيجة */}
        {isError && item.error && (
          <Text className="text-xs text-error mb-2">{item.error}</Text>
        )}

        {isSuccess && item.result?.data && (
          <View className="mt-2">
            {item.result.data.count && (
              <Text className="text-xs text-muted">
                عدد النتائج: {item.result.data.count}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4">
          {/* الرأس */}
          <View className="items-center gap-2 mb-4">
            <Text className="text-3xl font-bold text-foreground">الأوامر الصوتية</Text>
            <Text className="text-sm text-muted text-center">
              اضغط على الميكروفون وتحدث بأمرك
            </Text>
          </View>

          {/* زر المايكروفون الكبير */}
          <View className="items-center my-6">
            <TouchableOpacity
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={state.isInitializing || (state.isListening && !isRecording)}
              className={`w-32 h-32 rounded-full items-center justify-center ${
                isRecording || state.isListening
                  ? 'bg-red-500'
                  : 'bg-primary'
              } shadow-lg`}
            >
              {isRecording || state.isListening ? (
                <View className="items-center">
                  <MaterialIcons name="mic" size={48} color="white" />
                  <ActivityIndicator
                    size="large"
                    color="white"
                    style={{ marginTop: 8 }}
                  />
                </View>
              ) : (
                <MaterialIcons name="mic" size={48} color="white" />
              )}
            </TouchableOpacity>
            <Text className="mt-4 text-sm text-muted">
              {state.isInitializing ? 'جاري تجهيز الخدمات...' : isRecording || state.isListening ? 'جاري الاستماع...' : 'اضغط للبدء'}
            </Text>
          </View>

          {state.isInitializing && (
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <Text className="text-sm text-amber-700">جاري تحميل وربط خدمات Odoo والصوت...</Text>
            </View>
          )}

          {/* رسالة الخطأ */}
          {state.error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-sm text-error">{state.error}</Text>
            </View>
          )}

          {/* سجل الأوامر */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-foreground">سجل الأوامر</Text>
              {state.commands.length > 0 && (
                <TouchableOpacity onPress={clearCommands}>
                  <Text className="text-sm text-primary">مسح الكل</Text>
                </TouchableOpacity>
              )}
            </View>

            {state.commands.length === 0 ? (
              <View className="items-center justify-center py-8">
                <MaterialIcons name="history" size={48} color={colors.muted} />
                <Text className="mt-2 text-sm text-muted">لا توجد أوامر بعد</Text>
              </View>
            ) : (
              <FlatList
                data={state.commands}
                renderItem={renderCommandItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* أمثلة الأوامر */}
          <View className="bg-surface rounded-lg p-4 mt-4">
            <Text className="text-sm font-semibold text-foreground mb-3">أمثلة على الأوامر:</Text>
            <View className="gap-2">
              <Text className="text-xs text-muted">• أظهر مبيعات اليوم</Text>
              <Text className="text-xs text-muted">• كم مبيعات الشهر؟</Text>
              <Text className="text-xs text-muted">• الفواتير غير المدفوعة</Text>
              <Text className="text-xs text-muted">• المنتجات منخفضة المخزون</Text>
              <Text className="text-xs text-muted">• أعلى العملاء هذا الشهر</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
