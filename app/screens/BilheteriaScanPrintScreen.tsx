import React, { useRef, useState } from 'react';
import { View, Alert, Modal } from 'react-native';
import { Text, Button as PaperButton } from 'react-native-paper';
import { RNCamera } from 'react-native-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

type Props = { onBack: () => void };

export default function BilheteriaScanPrintScreen({ onBack }: Props) {
  const cameraRef = useRef<RNCamera | null>(null);
  const [scanning, setScanning] = useState(true);

  const handleBarCodeRead = async ({ data }: { data: string }) => {
    if (!data) return;
    setScanning(false);
    try {
      // assume data is ingresso id or a qrcode hash; try reimprimir
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['X-Token-Bilheteria'] = token;
      // call reimprimir endpoint
      const res = await fetch(`${base}/api/bilheteria/reimprimir/${encodeURIComponent(data)}`, { method: 'POST', headers });
      const text = await res.text();
      if (!res.ok) { Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`); return; }
      const json = JSON.parse(text);
      const layout = json.layout_preenchido || json.ingresso?.layout_preenchido;
      let imageUrl: string | null = null;
      if (layout && typeof layout === 'string' && (layout.startsWith('http') || layout.startsWith('data:'))) imageUrl = layout;
      const ingressoId = json.ingresso?._id || json.ingresso?.id || data;
      const eventoId = json.ingresso?.evento_id || json.evento_id || undefined;
      if (!imageUrl && ingressoId && eventoId) {
        imageUrl = `${base}/api/evento/${encodeURIComponent(eventoId)}/ingresso/${encodeURIComponent(ingressoId)}/render.jpg`;
      }
      if (imageUrl) {
        const ip = await AsyncStorage.getItem('printer_ip');
        const model = (await AsyncStorage.getItem('printer_model')) || undefined;
        await BrotherPrint.printImage({ ipAddress: ip || '', imageUri: imageUrl, printerModel: model as any });
        Alert.alert('Impressão', 'Comando de impressão enviado');
      } else {
        Alert.alert('OK', 'Reimpressão solicitada, mas não foi possível obter imagem para imprimir.');
      }
    } catch (e:any) { Alert.alert('Erro', String(e)); }
    finally { setScanning(true); }
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Ler QR e Imprimir</Text>
      <Modal visible={scanning} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <RNCamera ref={ref=>cameraRef.current=ref} style={{ flex: 1 }} captureAudio={false} onBarCodeRead={handleBarCodeRead} barCodeTypes={[RNCamera.Constants.BarCodeType.qr]} />
          <PaperButton mode="text" onPress={()=>{ setScanning(false); setTimeout(()=>setScanning(true),100); }} style={{ position: 'absolute', bottom: 20, alignSelf: 'center' }}>Fechar câmera</PaperButton>
        </View>
      </Modal>

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
