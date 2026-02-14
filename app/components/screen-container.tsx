import React from "react";
import { View, ViewProps, StyleProp, ViewStyle } from "react-native";

type ScreenContainerProps = ViewProps & {
  children?: React.ReactNode;
  /** ستايل الحاوية الخارجية */
  containerStyle?: StyleProp<ViewStyle>;
  /** ستايل المحتوى الداخلي */
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScreenContainer({
  children,
  containerStyle,
  contentStyle,
  style,
  ...rest
}: ScreenContainerProps) {
  return (
    <View style={[{ flex: 1 }, containerStyle, style]} {...rest}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
