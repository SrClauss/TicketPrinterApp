import React, { useRef, useState } from 'react';
import { View, Alert, Modal, StyleSheet, Vibration, TextInput } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import { useNavigation } from '@react-navigation/native';

type Props = { onBack: () => void };

export default function PortariaScanScreen({ onBack }: Props) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const navigation = useNavigation();

  const handleCodeDetected = async (data: string, type: string) => {
    if (!data || processing) {
      return;
    }

    const now = Date.now();
    if (data === lastScanRef.current && (now - lastScanTimeRef.current) < 3000) {
      console.log('[PortariaScan] Ignoring duplicate scan');
      return;
    }
    lastScanRef.current = data;
    lastScanTimeRef.current = now;

    console.log('[PortariaScan] ✅ QR Code detected!', { data, type, length: data.length });
    setProcessing(true);
    setScanning(false);

    try {
      Vibration.vibrate(200);
      await new Promise<void>(resolve => setTimeout(resolve, 100));

      console.log('[PortariaScan] Getting portaria token');
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem('portaria_token');
        console.log('[PortariaScan] Got token:', token ? 'YES' : 'NO');
      } catch (storageError) {
        console.error('[PortariaScan] AsyncStorage error:', storageError);
      }

      if (!token) {
        Alert.alert('Erro', 'Token de portaria não encontrado');
        return;
      }

      const base = getApiBaseUrl();
      console.log('[PortariaScan] Calling portaria API:', `${base}/api/portaria/ingresso/${data}`);

      const headers: Record<string, string> = { 'X-Token-Portaria': token };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${base}/api/portaria/ingresso/${encodeURIComponent(data)}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('[PortariaScan] Response status:', res.status);
      const text = await res.text();

      if (!res.ok) {
        console.log('[PortariaScan] Error response');
        if (res.status === 404) {
          Alert.alert('QR Code Inválido', 'Ingresso não encontrado ou QR code inválido.');
        } else if (res.status === 403 || res.status === 401) {
          Alert.alert('Acesso Negado', 'Token de portaria inválido ou sem permissão.');
        } else {
          Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`);
        }
        return;
      }

      const json = JSON.parse(text);
      console.log('[PortariaScan] Success, navigating to details');

      // Navigate to Portaria-specific details screen
      (navigation as any).navigate('PortariaIngressoDetails', {
        ingresso: json
      });

    } catch (error) {
      console.error('[PortariaScan] Error during validation:', error);
      Alert.alert('Erro', String(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleManualCodeSubmit = () => {
    if (manualCode.trim()) {
      handleCodeDetected(manualCode.trim(), 'manual');
      setManualCode('');
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128', 'code-39', 'pdf-417', 'aztec', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !processing) {
        const code = codes[0];
        if (code.value) {
          console.log('[PortariaScan] Code scanned:', code.type, code.value);
          setScanning(false);
          handleCodeDetected(code.value, code.type || 'qr');
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
    console.log('[PortariaScan] Camera permission granted, opening camera');
    setScanning(true);
  };

  const localStyles = StyleSheet.create({
    scannerModal: { flex: 1, backgroundColor: '#000' },
    manualInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 8, borderRadius: 4, backgroundColor: '#fff' },
    bottomPanel: { padding: 12, position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.7)' },
    instructionText: { color: '#fff', textAlign: 'center', fontSize: 16, marginBottom: 8 },
  });

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Scanner de Ingresso - Portaria</Text>
      
      {!scanning && (
        <>
          <Text style={{ textAlign: 'center', marginBottom: 16 }}>
            Aponte a câmera para o QR code do ingresso para validar a entrada
          </Text>

          <PaperButton 
            mode="contained" 
            onPress={requestCameraPermission}
            disabled={processing}
            style={{ marginBottom: 12 }}
          >
            {processing ? 'Processando...' : 'Abrir Câmera'}
          </PaperButton>

          <PaperButton mode="text" onPress={onBack}>
            Voltar
          </PaperButton>
        </>
      )}

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

          <View style={localStyles.bottomPanel}>
            <Text style={localStyles.instructionText}>Aponte para o QR code do ingresso</Text>
            
            <TextInput
              placeholder="Ou cole o código aqui"
              placeholderTextColor="#999"
              style={localStyles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <PaperButton 
                mode="contained" 
                onPress={handleManualCodeSubmit}
                disabled={!manualCode.trim()}
              >
                Validar Código
              </PaperButton>
              <PaperButton mode="outlined" onPress={() => setScanning(false)}>
                Cancelar
              </PaperButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
