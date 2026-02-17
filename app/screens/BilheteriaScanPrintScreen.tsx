import React, { useRef, useState } from 'react';
import { View, Alert, Modal, Platform, PermissionsAndroid, Vibration } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { RNCamera, BarCodeReadEvent } from 'react-native-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

type Props = { onBack: () => void };

export default function BilheteriaScanPrintScreen({ onBack }: Props) {
  const cameraRef = useRef<RNCamera | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permissão de Câmera',
            message: 'Este aplicativo precisa acessar sua câmera para escanear QR codes.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[Scanner] Camera permission granted');
          setScanning(true);
        } else {
          Alert.alert('Permissão negada', 'Não é possível usar a câmera sem permissão.');
        }
      } catch (err) {
        console.warn('[Scanner] Permission error:', err);
        Alert.alert('Erro', 'Falha ao solicitar permissão de câmera.');
      }
    } else {
      setScanning(true);
    }
  };

  const handleBarCodeRead = async (event: BarCodeReadEvent) => {
    const { data, type } = event;
    
    if (!data || processing) {
      return;
    }
    
    // Debounce: ignore scans of same code within 3 seconds
    const now = Date.now();
    if (data === lastScanRef.current && (now - lastScanTimeRef.current) < 3000) {
      return;
    }
    
    lastScanRef.current = data;
    lastScanTimeRef.current = now;
    
    console.log('[Scanner] QR Code detected!', { data, type, length: data.length });
    
    // Vibrate to give user feedback
    try {
      Vibration.vibrate(200);
    } catch (e) {
      console.log('[Scanner] Vibration not available');
    }
    
    setProcessing(true);
    
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['X-Token-Bilheteria'] = token;
      
      const res = await fetch(`${base}/api/bilheteria/reimprimir/${encodeURIComponent(data)}`, { 
        method: 'POST', 
        headers 
      });
      const text = await res.text();
      
      if (!res.ok) { 
        Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`); 
        setProcessing(false);
        return; 
      }
      
      const json = JSON.parse(text);
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
      
      if (imageUrl) {
        const ip = await AsyncStorage.getItem('printer_ip');
        const model = (await AsyncStorage.getItem('printer_model')) || undefined;
        await BrotherPrint.printImage({ 
          ipAddress: ip || '', 
          imageUri: imageUrl, 
          printerModel: model as any 
        });
        Alert.alert('Impressão', 'Comando de impressão enviado', [
          { text: 'OK', onPress: () => setProcessing(false) }
        ]);
      } else {
        Alert.alert('OK', 'Reimpressão solicitada, mas não foi possível obter imagem para imprimir.', [
          { text: 'OK', onPress: () => setProcessing(false) }
        ]);
      }
    } catch (e: unknown) { 
      Alert.alert('Erro', String(e), [
        { text: 'OK', onPress: () => setProcessing(false) }
      ]);
    }
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
            handleBarCodeRead({ 
              data: 'test-qr-code-123', 
              type: 'QR_CODE'
            } as any);
          }} 
          style={{ marginTop: 8 }}
        >
          🧪 Testar scanner
        </PaperButton>
      )}

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <RNCamera 
            ref={ref => { cameraRef.current = ref; }} 
            style={{ flex: 1 }} 
            captureAudio={false} 
            onBarCodeRead={handleBarCodeRead}
            barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
            autoFocus={RNCamera.Constants.AutoFocus.on}
            flashMode={RNCamera.Constants.FlashMode.auto}
            androidCameraPermissionOptions={{
              title: 'Permissão para usar câmera',
              message: 'Precisamos da sua permissão para usar a câmera',
              buttonPositive: 'Ok',
              buttonNegative: 'Cancelar',
            }}
          >
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
          </RNCamera>
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
