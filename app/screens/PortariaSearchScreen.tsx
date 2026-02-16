import React, { useState } from 'react';
import { View, Alert, StyleSheet, Modal, TextInput, ScrollView, Linking } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';

type Props = {
  onBack: () => void;
};

export default function PortariaSearchScreen({ onBack }: Props) {
  const [cpfSearch, setCpfSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [participant, setParticipant] = useState<any | null>(null);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const buscarPorCPF = async () => {
    if (!cpfSearch || cpfSearch.trim().length === 0) { setErrorMessage('Informe um CPF válido'); setErrorModalVisible(true); return; }
    setLoading(true);
    setParticipant(null);
    setParticipantModalVisible(false);
    setErrorMessage(null);
    setErrorModalVisible(false);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = {};
      if (token) headers['X-Token-Bilheteria'] = token;
      const searchRes = await fetch(`${base}/api/bilheteria/participantes/buscar?cpf=${encodeURIComponent(cpfSearch)}`, { headers });
      const text = await searchRes.text();
      if (!searchRes.ok) {
        setErrorMessage(`Erro na busca: ${searchRes.status} ${SafeLogger.sanitizeString(text)}`);
        setErrorModalVisible(true);
        return;
      }
      let results: any[] = [];
      try { results = JSON.parse(text); } catch { results = []; }
      if (!results || results.length === 0) {
        setErrorMessage('Nenhum participante encontrado para o CPF informado.');
        setErrorModalVisible(true);
        return;
      }
      const participante = results[0];
      // fetch participant details to find ingressos
      const id = participante._id || participante.id || (participante._doc && participante._doc._id);
      if (!id) {
        setParticipant(participante);
        setParticipantModalVisible(true);
        return;
      }
      const detailRes = await fetch(`${base}/api/bilheteria/participante/${encodeURIComponent(id)}`, { headers });
      const detailText = await detailRes.text();
      if (!detailRes.ok) {
        // fallback: show participante basic info
        setParticipant(participante);
        setParticipantModalVisible(true);
        return;
      }
      let details: any;
      try { details = JSON.parse(detailText); } catch { details = detailText; }
      // try to find an ingresso
      type FoundIngresso = { ingresso_id: string; evento_id: string } | null;
      let foundIngresso: FoundIngresso = null;
      const searchForIngresso = (obj: any): FoundIngresso => {
        if (!obj || typeof obj !== 'object') return null;
        if ((obj as any)._id && ((obj as any).evento_id || ((obj as any).evento && (obj as any).evento._id))) return { ingresso_id: (obj as any)._id, evento_id: (obj as any).evento_id || ((obj as any).evento && (obj as any).evento._id) };
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          const v = (obj as any)[k];
          if (Array.isArray(v)) {
            for (const item of v) {
              const r = searchForIngresso(item);
              if (r) return r;
            }
          } else if (v && typeof v === 'object') {
            const r = searchForIngresso(v);
            if (r) return r;
          }
        }
        return null;
      };
      foundIngresso = searchForIngresso(details);
      const combined = { participante: details, foundIngresso };
      setParticipant(combined);
      setParticipantModalVisible(true);
    } catch (e: any) {
      setErrorMessage(`Erro de conexão: ${String(e)}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const openIngressoImage = async (ingressoId?: string, eventoId?: string) => {
    if (!ingressoId || !eventoId) { Alert.alert('Imagem indisponível', 'Não foi possível localizar ingresso ou evento para baixar a imagem.'); return; }
    const base = getApiBaseUrl();
    const url = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
    try {
      await Linking.openURL(url);
    } catch (e:any) {
      Alert.alert('Erro ao abrir imagem', String(e));
    }
  };

  const localStyles = StyleSheet.create({
    manualInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 8, borderRadius: 4 },
    participantContainer: { padding: 16 },
    fieldTitle: { fontWeight: '700', marginTop: 8 },
    modalClose: { marginTop: 12 },
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <PaperButton mode="contained" onPress={buscarPorCPF}>Buscar por CPF</PaperButton>
        <PaperButton mode="outlined" onPress={() => setCpfSearch('')}>Limpar</PaperButton>
      </View>

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 18 }}>Voltar</PaperButton>

      <Modal visible={participantModalVisible} animationType="slide" transparent={false}>
        <View style={[styles.container, styles.screenPadding]}>
          <ScrollView>
            <Text style={styles.title}>Detalhes do Participante</Text>
            {participant ? (
              <View style={localStyles.participantContainer}>
                <Text style={localStyles.fieldTitle}>Participante</Text>
                <Text>{participant.participante?.nome || participant.participante?.nome_completo || JSON.stringify(participant.participante)}</Text>

                <Text style={localStyles.fieldTitle}>Email</Text>
                <Text>{participant.participante?.email}</Text>

                <Text style={localStyles.fieldTitle}>Telefone</Text>
                <Text>{participant.participante?.telefone}</Text>

                <Text style={localStyles.fieldTitle}>Ingressos</Text>
                <Text>{participant.foundIngresso ? `Ingresso: ${participant.foundIngresso.ingresso_id}` : 'Nenhum ingresso identificado'}</Text>

                {participant.foundIngresso ? (
                  <PaperButton mode="contained" onPress={() => openIngressoImage(participant.foundIngresso.ingresso_id, participant.foundIngresso.evento_id)} style={localStyles.modalClose}>Abrir imagem do ingresso</PaperButton>
                ) : null}

              </View>
            ) : (
              <Text>Nenhum dado disponível.</Text>
            )}

            <PaperButton mode="contained" onPress={() => setParticipantModalVisible(false)} style={localStyles.modalClose}>Fechar</PaperButton>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={errorModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.container, styles.screenPadding, {backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center'}]}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 18 }}>Erro</Text>
            <Text style={{ marginTop: 8 }}>{errorMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <PaperButton mode="contained" onPress={()=>{ setErrorModalVisible(false); }}>Fechar</PaperButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
