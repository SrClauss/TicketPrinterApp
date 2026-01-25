import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

let glyphs: Record<string, number> | null = null;
try {
  // glyphmap is provided by the package; require at runtime so CI or environments without node_modules don't crash at build-time
   
  glyphs = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
} catch {
  glyphs = null;
}

type Props = {
  name: string;
  size?: number;
  color?: string;
  [key: string]: any;
};

export default function MDIcon({ name, size = 24, color, ...rest }: Props) {
  const resolvedName = glyphs && Object.prototype.hasOwnProperty.call(glyphs, name) ? name : 'help-circle';
  return <MaterialCommunityIcons name={resolvedName} size={size} color={color} {...rest} />;
}
