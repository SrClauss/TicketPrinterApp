import React from 'react';
import { View } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { styles } from '../../App';

type Props = {
  description: string;
  onBack: () => void;
};

export default function ResultScreen({ description, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resultado do Login</Text>
      <Text>{description}</Text>
      <PaperButton mode="text" onPress={onBack} style={styles.spacedButton}>Voltar ao Login</PaperButton>
    </View>
  );
}
