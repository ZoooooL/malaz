import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import * as Haptics from "expo-haptics";

type HapticTabProps = TouchableOpacityProps & {
  children?: React.ReactNode;
};

export function HapticTab({ children, onPress, ...rest }: HapticTabProps) {
  const handlePress = async (e: any) => {
    try { await Haptics.selectionAsync(); } catch {}
    onPress?.(e);
  };
  return <TouchableOpacity onPress={handlePress} {...rest}>{children}</TouchableOpacity>;
}
