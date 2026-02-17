import React, { useState } from 'react';
import { View, Alert, StyleSheet, Modal, TextInput, ScrollView, Linking } from 'react-native';
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
  const [participant, setParticipant] = useState<any | null>(null);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const navigation = useNavigation();

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

      // Use backend route that returns the ingresso for the current event (same used by Bilheteria)
      const res = await fetch(`${base}/api/bilheteria/ingresso-por-cpf?cpf=${encodeURIComponent(cpfSearch)}`, { headers });
      if (!res.ok) {
        // fallback to older participant search so UI still works when endpoint missing
        console.log('[Portaria] ingresso-por-cpf returned', res.status);
        const text = await res.text();
        setErrorMessage(`Erro na busca: ${res.status} ${SafeLogger.sanitizeString(text)}`);
        setErrorModalVisible(true);
        return;
      }

      const data = await res.json();
      const ingresso = data.ingresso;
      const participante = data.participante;

      if (!ingresso) {
        setErrorMessage('Nenhum ingresso encontrado para este CPF no evento atual.');
        setErrorModalVisible(true);
        return;
      }

      // Build image URL (same logic as BilheteriaSearchPrintScreen)
      let imageUrl: string;
      if (ingresso.qrcode_hash) {
        imageUrl = `${base}/api/bilheteria/render/${encodeURIComponent(ingresso.qrcode_hash)}?evento_id=${encodeURIComponent(ingresso.evento_id)}`;
      } else {
        imageUrl = `${base}/api/evento/${encodeURIComponent(ingresso.evento_id)}/ingresso/${encodeURIComponent(ingresso._id)}/render.jpg`;
      }

      // Navigate to TicketDetails (same screen used by Bilheteria)
      navigation.navigate('TicketDetails', {
        ticket: {
          id: ingresso._id,
          name: participante?.nome || participante?.nome_completo || 'Ingresso',
          details: participante?.cpf || '',
          imageUrl,
          token,
          eventoId: ingresso.evento_id,
          qrcode_hash: ingresso.qrcode_hash || null,
        }
      });

    } catch (e: any) {
      console.error('[Portaria] buscarPorCPF error', e);
      setErrorMessage(`Erro de conexão: ${String(e)}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const openIngressoImage = async (ingressoId?: string, eventoId?: string, qrcode_hash?: string | null) => {
    if (!ingressoId || !eventoId) { Alert.alert('Imagem indisponível', 'Não foi possível localizar ingresso ou evento para baixar a imagem.'); return; }
    const base = getApiBaseUrl();
    const token = await AsyncStorage.getItem('bilheteria_token');

    let imageUrl: string;
    if (qrcode_hash) {
      imageUrl = `${base}/api/bilheteria/render/${encodeURIComponent(qrcode_hash)}?evento_id=${encodeURIComponent(eventoId)}`;
    } else {
      imageUrl = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
    }

    // Prefer opening TicketDetails (consistent with Bilheteria behavior)
    navigation.navigate('TicketDetails', {
      ticket: {
        id: ingressoId,
        name: 'Ingresso',
        details: '',
        imageUrl,
        token,
        eventoId,
        qrcode_hash: qrcode_hash || null,
      }
    });
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
                  <PaperButton mode="contained" onPress={() => openIngressoImage(participant.foundIngresso.ingresso_id, participant.foundIngresso.evento_id, participant.foundIngresso.qrcode_hash)} style={localStyles.modalClose}>Abrir ingresso (visualizar/print)</PaperButton>
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
