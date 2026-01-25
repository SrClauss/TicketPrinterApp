import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Text, TextInput as PaperTextInput, Button as PaperButton, ActivityIndicator as PaperActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

type Props = { onBack: () => void };

export default function BilheteriaCreateEmitScreen({ onBack }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  const tryCreateAndEmit = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['X-Token-Bilheteria'] = token;
      // create participant
      const participantRes = await fetch(`${base}/api/bilheteria/participantes`, { method: 'POST', headers, body: JSON.stringify({ nome, email, cpf }) });
      const participantText = await participantRes.text();
      if (!participantRes.ok) { Alert.alert('Erro ao criar participante', `Status ${participantRes.status}\n${SafeLogger.sanitizeString(participantText)}`); return; }
      const participant = JSON.parse(participantText);
      // emit ticket: require tipo_ingresso_id: attempt to use first tipo available from evento
      const eventoRes = await fetch(`${base}/api/bilheteria/evento`, { headers: { 'X-Token-Bilheteria': token } });
      const eventoText = await eventoRes.text();
      const evento = eventoRes.ok ? JSON.parse(eventoText) : null;
      const tipoId = evento?.tipos_ingresso?.[0]?._id || evento?.tipos_ingresso?.[0]?.id;
      if (!tipoId) { Alert.alert('Erro', 'Não foi possível determinar tipo de ingresso'); return; }
      const emitirRes = await fetch(`${base}/api/bilheteria/emitir`, { method: 'POST', headers, body: JSON.stringify({ tipo_ingresso_id: tipoId, participante_id: participant._id || participant.id }) });
      const emitirText = await emitirRes.text();
      if (!emitirRes.ok) { Alert.alert('Erro ao emitir ingresso', `Status ${emitirRes.status}\n${SafeLogger.sanitizeString(emitirText)}`); return; }
      const emitirJson = JSON.parse(emitirText);
      // try to print: prefer layout_preenchido (if URL), fallback to render endpoint
      const layout = emitirJson.layout_preenchido || emitirJson.ingresso?.layout_preenchido;
      let imageUrl: string | null = null;
      if (layout && typeof layout === 'string' && (layout.startsWith('http') || layout.startsWith('data:'))) imageUrl = layout;
      const ingressoId = emitirJson.ingresso?._id || emitirJson.ingresso?.id || emitirJson._id;
      const eventoId = emitirJson.ingresso?.evento_id || evento?._id || evento?.id;

      if (!imageUrl && ingressoId && eventoId) {
        imageUrl = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
      }

      if (imageUrl) {
        const ip = await AsyncStorage.getItem('printer_ip');
        const model = (await AsyncStorage.getItem('printer_model')) || undefined;
        try {
          await BrotherPrint.printImage({ ipAddress: ip || '', imageUri: imageUrl, printerModel: model as any });
          Alert.alert('Impressão', 'Comando de impressão enviado');
        } catch (e:any) {
          SafeLogger.error('Erro imprimir', e);
          Alert.alert('Erro ao imprimir', String(e));
        }
      } else {
        Alert.alert('Emitido', 'Ingresso emitido, mas não foi possível obter imagem para impressão.');
      }

    } catch (e:any) { Alert.alert('Erro', String(e)); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Criar Participante e Emitir</Text>
      <PaperTextInput label="Nome" value={nome} onChangeText={setNome} />
      <PaperTextInput label="Email" value={email} onChangeText={setEmail} />
      <PaperTextInput label="CPF" value={cpf} onChangeText={setCpf} />
      {loading && <PaperActivityIndicator style={styles.loader} />}
      <PaperButton mode="contained" onPress={tryCreateAndEmit} style={{ marginTop: 12 }}>Criar e Emitir</PaperButton>
      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
