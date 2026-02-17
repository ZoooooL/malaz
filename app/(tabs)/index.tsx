import { ScrollView, Text, View, TouchableOpacity, Platform } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { useVoiceCommand } from '@/lib/context/voice-command-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

/**
 * Home Screen - Malaz Dashboard
 */
export default function HomeScreen() {
  const colors = useColors();
  const { startListening, state } = useVoiceCommand();

  const handleVoiceCommand = async () => {
    await startListening();
  };

  return (
    <ScreenContainer className="p-6" containerClassName="relative">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Hero Section */}
          <View className="items-center gap-2">
            <Text className="text-4xl font-bold text-foreground">Malaz</Text>
            <Text className="text-base text-muted text-center">
              مساعد الأوامر الصوتية الذكي
            </Text>
            <View className={`mt-3 px-4 py-2 rounded-full ${state.error ? 'bg-red-100' : state.isInitializing ? 'bg-amber-100' : 'bg-green-100'}`}>
              <Text className={`text-xs font-semibold ${state.error ? 'text-red-700' : state.isInitializing ? 'text-amber-700' : 'text-green-700'}`}>
                {state.error ? 'يوجد خطأ في التهيئة' : state.isInitializing ? 'جاري تجهيز الخدمات...' : 'النظام جاهز لاستقبال الأوامر'}
              </Text>
            </View>
          </View>

          {/* Dashboard Cards */}
          <View className="gap-3">
            {/* Sales Card */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-muted mb-1">مبيعات اليوم</Text>
                  <Text className="text-2xl font-bold text-foreground">--</Text>
                </View>
                <View className="bg-blue-100 rounded-lg p-3">
                  <MaterialIcons name="trending-up" size={24} color={colors.primary} />
                </View>
              </View>
            </View>

            {/* Invoices Card */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-muted mb-1">الفواتير المعلقة</Text>
                  <Text className="text-2xl font-bold text-foreground">--</Text>
                </View>
                <View className="bg-orange-100 rounded-lg p-3">
                  <MaterialIcons name="receipt" size={24} color="#F59E0B" />
                </View>
              </View>
            </View>

            {/* Low Stock Card */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm text-muted mb-1">المخزون المنخفض</Text>
                  <Text className="text-2xl font-bold text-foreground">--</Text>
                </View>
                <View className="bg-red-100 rounded-lg p-3">
                  <MaterialIcons name="warning" size={24} color="#EF4444" />
                </View>
              </View>
            </View>
          </View>

          {state.error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3">
              <Text className="text-sm text-red-700 text-center">{state.error}</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">نصائح</Text>
            <Text className="text-xs text-muted leading-relaxed">
              اضغط على زر الميكروفون العائم في الأسفل لبدء الأوامر الصوتية
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Voice Button */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          onPress={handleVoiceCommand}
          disabled={state.isListening || state.isInitializing}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: state.isInitializing ? '#9CA3AF' : state.isListening ? '#EF4444' : colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <MaterialIcons
            name={state.isListening ? 'mic-off' : 'mic'}
            size={28}
            color="white"
          />
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}
