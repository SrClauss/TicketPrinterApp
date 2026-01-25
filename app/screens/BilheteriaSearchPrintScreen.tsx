import React, { useState } from 'react';
import { View, Alert, Linking } from 'react-native';
import { Text, TextInput as PaperTextInput, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

type Props = { onBack: () => void };

export default function BilheteriaSearchPrintScreen({ onBack }: Props) {
  const [cpfSearch, setCpfSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const buscarEImprimir = async () => {
    if (!cpfSearch || cpfSearch.trim().length === 0) { Alert.alert('CPF inválido'); return; }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = {};
      if (token) headers['X-Token-Bilheteria'] = token;
      const searchRes = await fetch(`${base}/api/bilheteria/participantes/buscar?cpf=${encodeURIComponent(cpfSearch)}`, { headers });
      const text = await searchRes.text();
      if (!searchRes.ok) { Alert.alert('Erro na busca', `Status ${searchRes.status}\n${SafeLogger.sanitizeString(text)}`); return; }
      let results: any[] = [];
      try { results = JSON.parse(text); } catch { results = []; }
      if (!results || results.length === 0) { Alert.alert('Nenhum participante encontrado'); return; }
      const participante = results[0];
      const id = participante._id || participante.id || (participante._doc && participante._doc._id);
      if (!id) { Alert.alert('Participante sem id'); return; }
      // try to find ingresso via participante details
      const detailRes = await fetch(`${base}/api/bilheteria/participante/${encodeURIComponent(id)}`, { headers });
      const detailText = await detailRes.text();
      const detail = detailRes.ok ? JSON.parse(detailText) : participante;
      // attempt to locate ingresso id
      const searchForIngresso = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj._id && (obj.evento_id || (obj.evento && obj.evento._id))) return { ingresso_id: obj._id, evento_id: obj.evento_id || (obj.evento && obj.evento._id) };
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (Array.isArray(v)) {
            for (const item of v) {
              const r = searchForIngresso(item);
              if (r) return r;
            }
          } else if (typeof v === 'object') {
            const r = searchForIngresso(v);
            if (r) return r;
          }
        }
        return null;
      };
      const found = searchForIngresso(detail);
      let imageUrl: string | null = null;
      if (found) {
        imageUrl = `${base}/api/evento/${encodeURIComponent(found.evento_id)}/ingresso/${encodeURIComponent(found.ingresso_id)}/render.jpg`;
      }
      if (!imageUrl) { Alert.alert('Não foi possível localizar ingresso para imprimir'); return; }
      const ip = await AsyncStorage.getItem('printer_ip');
      const model = (await AsyncStorage.getItem('printer_model')) || undefined;
      try {
        await BrotherPrint.printImage({ ipAddress: ip || '', imageUri: imageUrl, printerModel: model as any });
        Alert.alert('Impressão', 'Comando de impressão enviado');
      } catch (e:any) { SafeLogger.error('Erro imprimir', e); Alert.alert('Erro ao imprimir', String(e)); }

    } catch (e:any) { Alert.alert('Erro', String(e)); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Buscar por CPF e Imprimir</Text>
      <PaperTextInput label="CPF" value={cpfSearch} onChangeText={setCpfSearch} />
      <PaperButton mode="contained" onPress={buscarEImprimir} style={{ marginTop: 12 }}>Buscar e Imprimir</PaperButton>
      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
