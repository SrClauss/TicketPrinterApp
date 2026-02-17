import React, { useState } from 'react';
import { View, StyleSheet, Modal, TextInput } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import { useNavigation } from '@react-navigation/native';

type Props = {
  onBack: () => void;
};

export default function PortariaSearchScreen({ onBack }: Props) {
  const [cpfSearch, setCpfSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const navigation = useNavigation();

  const buscarPorCPF = async () => {
    if (!cpfSearch || cpfSearch.trim().length === 0) { setErrorMessage('Informe um CPF válido'); setErrorModalVisible(true); return; }
    setLoading(true);
    setErrorMessage(null);
    setErrorModalVisible(false);

    try {
      const token = await AsyncStorage.getItem('portaria_token');
      const base = getApiBaseUrl();
      const headers: any = {};
      if (token) headers['X-Token-Portaria'] = token;

      // Use backend route that returns complete ingresso data for validation (same format as scan)
      const res = await fetch(`${base}/api/portaria/ingresso-por-cpf?cpf=${encodeURIComponent(cpfSearch)}`, { headers });
      if (!res.ok) {
        console.log('[Portaria] ingresso-por-cpf returned', res.status);
        const text = await res.text();
        setErrorMessage(`Erro na busca: ${res.status} ${SafeLogger.sanitizeString(text)}`);
        setErrorModalVisible(true);
        return;
      }

      const data = await res.json();

      if (!data.ingresso) {
        setErrorMessage('Nenhum ingresso encontrado para este CPF no evento atual.');
        setErrorModalVisible(true);
        return;
      }

      // Navigate to PortariaIngressoDetails (same screen used by scanner)
      navigation.navigate('PortariaIngressoDetails', { ingresso: data });

    } catch (e: any) {
      console.error('[Portaria] buscarPorCPF error', e);
      setErrorMessage(`Erro de conexão: ${String(e)}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const localStyles = StyleSheet.create({
    manualInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 8, borderRadius: 4 },
  });

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Pesquisa por CPF</Text>
      <TextInput
        placeholder="Informe o CPF"
        placeholderTextColor="#666"
        style={localStyles.manualInput}
        value={cpfSearch}
        onChangeText={setCpfSearch}
      />

      <View style={{ flexDirection: 'column', marginTop: 8 }}>
        <PaperButton mode="contained" onPress={buscarPorCPF} style={{ width: '100%', marginBottom: 12 }}>
          Buscar por CPF
        </PaperButton>
        <PaperButton mode="outlined" onPress={() => setCpfSearch('')} style={{ width: '100%' }}>
          Limpar
        </PaperButton>
      </View>

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 18 }}>Voltar</PaperButton>

      <Modal visible={errorModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.container, styles.screenPadding, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' }]}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 18 }}>Erro</Text>
            <Text style={{ marginTop: 8 }}>{errorMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <PaperButton mode="contained" onPress={() => { setErrorModalVisible(false); }}>Fechar</PaperButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
