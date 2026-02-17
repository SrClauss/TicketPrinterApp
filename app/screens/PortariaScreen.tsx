import React, {useEffect, useState} from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { Text, ActivityIndicator as PaperActivityIndicator, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import { useNavigation } from '@react-navigation/native';

type Props = {
  onBack: () => void;
  onOpenSearch?: () => void;
};

export default function PortariaScreen({ onBack, onOpenSearch }: Props) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any | null>(null);
  const navigation = useNavigation();

  const loadInfo = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('portaria_token');
      if (!token) { Alert.alert('Erro', 'Token de portaria não encontrado'); setLoading(false); return; }
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/portaria/evento`, { headers: { 'X-Token-Portaria': token } });
      const text = await res.text();
      if (res.ok) {
        try { setInfo(JSON.parse(text)); } catch { setInfo(text); }
      } else {
        Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`);
      }
    } catch (e: any) {
      Alert.alert('Erro', String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInfo(); }, []);

  const localStyles = StyleSheet.create({
    itemTitle: { fontWeight: '700', marginBottom: 8 },
    backButton: { marginTop: 18 },
  });

  return (
    <View style={[styles.container, styles.screenPadding]}> 
      <Text style={styles.title}>Portaria</Text>
      {loading ? <PaperActivityIndicator style={styles.loader} /> : (
        info ? (
          <View>
            <Text style={localStyles.itemTitle}>{info.nome || JSON.stringify(info)}</Text>
            <Text>{info.descricao}</Text>
          </View>
        ) : (
          <Text>Nenhuma informação carregada.</Text>
        )
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <PaperButton mode="contained" onPress={() => { if (typeof onOpenSearch === 'function') onOpenSearch(); else Alert.alert('Navegação', 'Funcionalidade de pesquisa não disponível.'); }}>Pesquisar por CPF</PaperButton>
        <PaperButton mode="contained" onPress={() => navigation.navigate('BilheteriaScanPrint')}>Scan QR</PaperButton>
      </View>

      <PaperButton mode="text" onPress={onBack} style={localStyles.backButton}>Sair</PaperButton>
    </View>
  );
}
