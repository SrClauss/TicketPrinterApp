import React, {useEffect, useState} from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { Text, ActivityIndicator as PaperActivityIndicator, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';

type Props = {
  onBack: () => void;
  onOpenList?: () => void;
  onOpenCreate?: () => void;
  onOpenScan?: () => void;
  onOpenSearch?: () => void;
};

export default function BilheteriaScreen({ onBack, onOpenList, onOpenCreate, onOpenScan, onOpenSearch }: Props) {
  const [loading, setLoading] = useState(false);
  const [evento, setEvento] = useState<any | null>(null);

  const loadEvento = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      if (!token) { Alert.alert('Erro', 'Token de bilheteria não encontrado'); setLoading(false); return; }
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/bilheteria/evento`, { headers: { 'X-Token-Bilheteria': token } });
      const text = await res.text();
      if (res.ok) {
        try { setEvento(JSON.parse(text)); } catch { setEvento(text); }
      } else {
        Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`);
      }
    } catch (e: any) {
      Alert.alert('Erro', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvento(); }, []);

  // local styles
  const localStyles = StyleSheet.create({
    itemTitle: { fontWeight: '700', marginBottom: 8 },
    backButton: { marginTop: 18 },
  });

  return (
    <View style={[styles.container, styles.screenPadding]}> 
      <Text style={styles.title}>Bilheteria</Text>
      {loading ? <PaperActivityIndicator style={styles.loader} /> : (
        evento ? (
          <View>
            <Text style={localStyles.itemTitle}>{evento.nome || JSON.stringify(evento)}</Text>
            <Text>{evento.descricao}</Text>
          </View>
        ) : (
          <Text>Nenhum evento carregado.</Text>
        )
      )}

      <PaperButton mode="contained" onPress={() => { if (typeof onOpenList === 'function') onOpenList(); else Alert.alert('Funcionalidade', 'Lista de participantes não implementada na API.'); }} style={{ marginTop: 12 }}>Listar Participantes</PaperButton>
      <PaperButton mode="contained" onPress={() => { if (typeof onOpenCreate === 'function') onOpenCreate(); else Alert.alert('Funcionalidade', 'Criar/Emitir não disponível.'); }} style={{ marginTop: 12 }}>Criar participante e emitir ingresso</PaperButton>
      <PaperButton mode="contained" onPress={() => { if (typeof onOpenScan === 'function') onOpenScan(); else Alert.alert('Funcionalidade', 'Scanner não disponível.'); }} style={{ marginTop: 12 }}>Ler QR e imprimir</PaperButton>
      <PaperButton mode="contained" onPress={() => { if (typeof onOpenSearch === 'function') onOpenSearch(); else Alert.alert('Funcionalidade', 'Pesquisa por CPF não disponível.'); }} style={{ marginTop: 12 }}>Pesquisar por CPF e imprimir</PaperButton>

      <PaperButton mode="text" onPress={onBack} style={localStyles.backButton}>Sair</PaperButton>
    </View>
  );
}
