import React, {useEffect, useState, useRef} from 'react';
import { View, Alert, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, ActivityIndicator as PaperActivityIndicator, Button as PaperButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';

type Props = {
  onBack: () => void;
  onOpenSearch?: () => void;
};

export default function PortariaScreen({ onBack, onOpenSearch }: Props) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any | null>(null);

  const [scanning, setScanning] = useState(false);
  const [participant, setParticipant] = useState<any | null>(null);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processingRef = useRef(false);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

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

  const navigation = useNavigation();

  const fetchIngresso = async (qrcode_hash: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    setLoading(true);
    setParticipant(null);
    setParticipantModalVisible(false);
    setErrorMessage(null);
    setErrorModalVisible(false);
    setScanning(false);
    
    try {
      const token = await AsyncStorage.getItem('portaria_token');
      if (!token) { setErrorMessage('Token de portaria não encontrado'); setErrorModalVisible(true); return; }
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/portaria/ingresso/${encodeURIComponent(qrcode_hash)}`, { headers: { 'X-Token-Portaria': token } });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMessage('QRCode inválido ou não encontrado.');
        } else if (res.status === 403 || res.status === 401) {
          setErrorMessage('Acesso negado. Verifique o token de portaria.');
        } else {
          setErrorMessage(`Erro ${res.status}: ${SafeLogger.sanitizeString(text)}`);
        }
        setErrorModalVisible(true);
        return;
      }

      let data: any;
      try { data = JSON.parse(text); } catch { data = text; }

      // Prefer navigating to TicketDetails (reuse Bilheteria components/UX)
      // Build ticket object compatible with TicketDetailsScreen
      const ingresso = data.ingresso || data;
      const participante = data.participante || data.participante || (data.ingresso && data.ingresso.participante) || null;

      const qrcode = ingresso?.qrcode_hash || ingresso?.qrcode || data?.qrcode_hash || qrcode_hash;
      const eventoId = ingresso?.evento_id || ingresso?.evento?._id || data?.evento_id || null;
      const ingressoId = ingresso?._id || ingresso?.id || null;

      // Construct imageUrl the same way Bilheteria does
      let imageUrl: string | null = null;
      if (qrcode) {
        imageUrl = `${base}/api/bilheteria/render/${encodeURIComponent(qrcode)}?evento_id=${encodeURIComponent(eventoId)}`;
      } else if (eventoId && ingressoId) {
        imageUrl = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
      }

      // Try to provide bilheteria token so TicketDetails can download image with headers
      const bilheteriaToken = await AsyncStorage.getItem('bilheteria_token');

      console.log('[Portaria] navigating to TicketDetails', { ingressoId, qrcode, eventoId, hasBilheteriaToken: !!bilheteriaToken });

      navigation.navigate('TicketDetails', {
        ticket: {
          id: ingressoId || qrcode || qrcode_hash,
          name: participante?.nome || participante?.nome_completo || 'Ingresso',
          details: participante?.cpf || '',
          imageUrl: imageUrl || `${base}/api/portaria/ingresso/${encodeURIComponent(qrcode_hash)}`,
          token: bilheteriaToken, // may be null — TicketDetails handles missing token
          eventoId: eventoId || null,
          qrcode_hash: qrcode || null,
        }
      });

      // still set local state so modal can be opened if user returns
      setParticipant(data);
      setParticipantModalVisible(true);

    } catch (e: any) {
      setErrorMessage(`Erro de conexão: ${String(e)}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !processingRef.current) {
        const code = codes[0];
        if (code.value) {
          console.log('[Portaria] QR Code scanned:', code.value);
          fetchIngresso(code.value);
        }
      }
    },
  });

  const requestCameraPermission = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permissão negada', 'Não é possível usar a câmera sem permissão.');
        return;
      }
    }
    console.log('[Portaria] Camera permission granted, opening camera');
    setScanning(true);
  };

  // local styles
  const localStyles = StyleSheet.create({
    itemTitle: { fontWeight: '700', marginBottom: 8 },
    backButton: { marginTop: 18 },
    scannerModal: { flex: 1, backgroundColor: '#000' },
    cameraButton: { position: 'absolute', bottom: 40, alignSelf: 'center' },
    participantContainer: { padding: 16 },
    fieldTitle: { fontWeight: '700', marginTop: 8 },
    manualInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 8, borderRadius: 4, backgroundColor: '#fff' },
    modalClose: { marginTop: 12 },
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
        <PaperButton mode="contained" onPress={requestCameraPermission}>Scan QR</PaperButton>
      </View>

      <PaperButton mode="text" onPress={onBack} style={localStyles.backButton}>Sair</PaperButton>

      <Modal visible={scanning} animationType="slide">
        <View style={localStyles.scannerModal}>
          {device != null && (
            <Camera 
              style={StyleSheet.absoluteFill} 
              device={device}
              isActive={scanning}
              codeScanner={codeScanner}
            />
          )}

          <View style={{ padding: 12, position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Aponte a câmera para o QR code</Text>
            <TextInput
              placeholder="Ou cole o código aqui"
              placeholderTextColor="#999"
              style={localStyles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <PaperButton mode="contained" onPress={() => { if (manualCode.trim()) { setScanning(false); fetchIngresso(manualCode.trim()); } }}>Buscar</PaperButton>
              <PaperButton mode="outlined" onPress={() => setScanning(false)}>Cancelar</PaperButton>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={participantModalVisible} animationType="slide" transparent={false}>
        <View style={[styles.container, styles.screenPadding]}>
          <ScrollView>
            <Text style={styles.title}>Detalhes do Ingresso</Text>
            {participant ? (
              <View style={localStyles.participantContainer}>
                <Text style={localStyles.fieldTitle}>Participante</Text>
                <Text>{participant.participante?.nome || participant.participante?.nome_completo || JSON.stringify(participant.participante)}</Text>

                <Text style={localStyles.fieldTitle}>Email</Text>
                <Text>{participant.participante?.email}</Text>

                <Text style={localStyles.fieldTitle}>Telefone</Text>
                <Text>{participant.participante?.telefone}</Text>

                <Text style={localStyles.fieldTitle}>Tipo de ingresso</Text>
                <Text>{participant.tipo_ingresso?.nome || participant.tipo_ingresso_id}</Text>

                <Text style={localStyles.fieldTitle}>Status</Text>
                <Text>{participant.status || participant.ingresso?.status}</Text>

                <Text style={localStyles.fieldTitle}>Qrcode hash</Text>
                <Text>{participant.qrcode_hash || participant.ingresso?.qrcode_hash}</Text>

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
              <PaperButton mode="contained" onPress={()=>{ setErrorModalVisible(false); setScanning(true); }}>Tentar novamente</PaperButton>
              <PaperButton mode="outlined" onPress={()=>{ setErrorModalVisible(false); setScanning(true); }}>Inserir manual</PaperButton>
              <PaperButton mode="text" onPress={()=>setErrorModalVisible(false)}>Fechar</PaperButton>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
