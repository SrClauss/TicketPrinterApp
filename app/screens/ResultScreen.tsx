import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
      <TouchableOpacity style={styles.button} onPress={onBack}><Text style={styles.buttonText}>Voltar ao Login</Text></TouchableOpacity>
    </View>
  );
}
