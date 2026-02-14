import { View, ViewProps } from "react-native";

type ScreenContainerProps = ViewProps & {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
};

export function ScreenContainer({
  children,
  className,
  containerClassName,
  ...rest
}: ScreenContainerProps) {
  return (
    <View style={{ flex: 1 }} className={containerClassName} {...rest}>
      <View className={className}>{children}</View>
    </View>
  );
}
