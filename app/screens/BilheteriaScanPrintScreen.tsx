import React, { useRef, useState } from 'react';
import { View, Alert, Modal, StyleSheet, Vibration } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

type Props = { onBack: () => void };

export default function BilheteriaScanPrintScreen({ onBack }: Props) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleCodeDetected = async (data: string, type: string) => {
    if (!data || processing) {
      return;
    }
    
    // Debounce: ignore scans of same code within 3 seconds
    const now = Date.now();
    if (data === lastScanRef.current && (now - lastScanTimeRef.current) < 3000) {
      console.log('[Scanner] Ignoring duplicate scan');
      return;
    }
    
    lastScanRef.current = data;
    lastScanTimeRef.current = now;
    
    console.log('[Scanner] ✅ QR Code detected!', { data, type, length: data.length });
    
    // Vibrate to give user feedback
    try {
      Vibration.vibrate(200);
    } catch (e) {
      console.log('[Scanner] Vibration not available');
    }
    
    setProcessing(true);
    
    try {
      console.log('[Scanner] Step 1: Getting token and base URL');
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['X-Token-Bilheteria'] = token;
      
      console.log('[Scanner] Step 2: Calling reimprimir API');
      const res = await fetch(`${base}/api/bilheteria/reimprimir/${encodeURIComponent(data)}`, { 
        method: 'POST', 
        headers 
      });
      
      console.log('[Scanner] Step 3: Got response, status:', res.status);
      const text = await res.text();
      console.log('[Scanner] Step 4: Response text length:', text.length);
      
      if (!res.ok) {
        console.log('[Scanner] Step 5a: Error response');
        Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`); 
        setProcessing(false);
        return; 
      }
      
      console.log('[Scanner] Step 5b: Parsing JSON');
      const json = JSON.parse(text);
      console.log('[Scanner] Step 6: Parsed JSON, getting layout');
      
      const layout = json.layout_preenchido || json.ingresso?.layout_preenchido;
      let imageUrl: string | null = null;
      
      if (layout && typeof layout === 'string' && (layout.startsWith('http') || layout.startsWith('data:'))) {
        imageUrl = layout;
      }
      
      const ingressoId = json.ingresso?._id || json.ingresso?.id || data;
      const eventoId = json.ingresso?.evento_id || json.evento_id || undefined;
      
      if (!imageUrl && ingressoId && eventoId) {
        imageUrl = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
      }
      
      console.log('[Scanner] Step 7: Image URL ready:', imageUrl ? 'YES' : 'NO');
      
      if (imageUrl) {
        console.log('[Scanner] Step 8: Getting printer settings');
        const ip = await AsyncStorage.getItem('printer_ip');
        const model = (await AsyncStorage.getItem('printer_model')) || undefined;
        
        console.log('[Scanner] Step 9: Calling BrotherPrint.printImage');
        await BrotherPrint.printImage({ 
          ipAddress: ip || '', 
          imageUri: imageUrl, 
          printerModel: model as any 
        });
        
        console.log('[Scanner] Step 10: Print command sent, showing alert');
        Alert.alert('Impressão', 'Comando de impressão enviado', [
          { text: 'OK', onPress: () => setProcessing(false) }
        ]);
      } else {
        console.log('[Scanner] Step 8b: No image URL, showing alert');
        Alert.alert('OK', 'Reimpressão solicitada, mas não foi possível obter imagem para imprimir.', [
          { text: 'OK', onPress: () => setProcessing(false) }
        ]);
      }
    } catch (e: unknown) {
      console.error('[Scanner] ERROR in handleCodeDetected:', e);
      Alert.alert('Erro', String(e), [
        { text: 'OK', onPress: () => setProcessing(false) }
      ]);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128', 'code-39', 'pdf-417', 'aztec', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !processing) {
        const code = codes[0];
        if (code.value) {
          console.log('[Scanner] Code scanned:', code.type, code.value);
          // Close camera immediately to avoid conflicts
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
    console.log('[Scanner] Camera permission granted, opening camera');
    setScanning(true);
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Ler QR e Imprimir</Text>
      <Text style={{ marginVertical: 12, color: '#666' }}>
        Posicione o QR code do ingresso dentro da moldura da câmera para escanear.
      </Text>
      <PaperButton mode="contained" onPress={requestCameraPermission} style={{ marginTop: 12 }}>
        Abrir câmera
      </PaperButton>

      {__DEV__ && (
        <PaperButton 
          mode="outlined" 
          onPress={() => {
            console.log('[Scanner] Testing with sample QR code');
            handleCodeDetected('test-qr-code-123', 'qr');
          }} 
          style={{ marginTop: 8 }}
        >
          🧪 Testar scanner
        </PaperButton>
      )}

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {device != null && (
            <Camera 
              style={StyleSheet.absoluteFill} 
              device={device}
              isActive={scanning}
              codeScanner={codeScanner}
            />
          )}
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {processing ? (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>Processando...</Text>
              </View>
            ) : (
              <View style={{ 
                width: 250, 
                height: 250, 
                borderWidth: 3, 
                borderColor: '#0ea5e9', 
                borderRadius: 10
              }} />
            )}
          </View>
          
          <PaperButton 
            mode="contained" 
            onPress={() => { setScanning(false); setProcessing(false); }} 
            style={{ position: 'absolute', bottom: 20, alignSelf: 'center' }}
          >
            Fechar câmera
          </PaperButton>
        </View>
      </Modal>

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
