import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";

type IconProps = ComponentProps<typeof Ionicons>;

export function IconSymbol({ name, size = 24, color, ...rest }: IconProps) {
  return <Ionicons name={name} size={size} color={color} {...rest} />;
}
``
