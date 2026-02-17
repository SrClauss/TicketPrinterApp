import React, { useState } from 'react';
import { View, Alert, Linking } from 'react-native';
import { Text, TextInput as PaperTextInput, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import { useNavigation } from '@react-navigation/native';

type Props = { onBack: () => void };

export default function BilheteriaSearchPrintScreen({ onBack }: Props) {
  const [cpfSearch, setCpfSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const buscarEImprimir = async () => {
    if (!cpfSearch || cpfSearch.trim().length === 0) { 
      Alert.alert('CPF inválido'); 
      return; 
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = {};
      if (token) headers['X-Token-Bilheteria'] = token;
      
      console.log('[Search] Buscando ingresso por CPF:', cpfSearch);
      
      // Call new backend route that returns ingresso for current event only
      const res = await fetch(
        `${base}/api/bilheteria/ingresso-por-cpf?cpf=${encodeURIComponent(cpfSearch)}`, 
        { headers }
      );
      
      if (!res.ok) {
        const errorText = await res.text();
        Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(errorText)}`);
        return;
      }
      
      const data = await res.json();
      const ingresso = data.ingresso;
      const participante = data.participante;
      
      console.log('[Search] Ingresso encontrado:', {
        ingresso_id: ingresso._id,
        evento_id: ingresso.evento_id,
        qrcode_hash: ingresso.qrcode_hash
      });
      
      // Build image URL
      let imageUrl: string;
      if (ingresso.qrcode_hash) {
        imageUrl = `${base}/api/bilheteria/render/${encodeURIComponent(ingresso.qrcode_hash)}?evento_id=${encodeURIComponent(ingresso.evento_id)}`;
      } else {
        imageUrl = `${base}/api/evento/${encodeURIComponent(ingresso.evento_id)}/ingresso/${encodeURIComponent(ingresso._id)}/render.jpg`;
      }
      
      console.log('[Search] Abrindo TicketDetails com imageUrl:', imageUrl);
      
      // Navigate to TicketDetails
      (navigation as any).navigate('TicketDetails', {
        ticket: {
          id: ingresso._id,
          name: participante.nome || 'Ingresso',
          details: participante.cpf || '',
          imageUrl,
          token,
          eventoId: ingresso.evento_id,
          qrcode_hash: ingresso.qrcode_hash || null,
        },
      });
      
    } catch (e: any) { 
      console.error('[Search] Erro:', e);
      Alert.alert('Erro', String(e)); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Buscar por CPF e Imprimir</Text>
      <PaperTextInput label="CPF" value={cpfSearch} onChangeText={setCpfSearch} />
      <PaperButton mode="contained" onPress={buscarEImprimir} style={{ marginTop: 12 }}>Buscar e abrir ingresso</PaperButton>
      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
