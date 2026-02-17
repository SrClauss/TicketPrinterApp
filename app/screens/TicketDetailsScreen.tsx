import React from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint from '../../lib/brother';

import { getApiBaseUrl } from '../../env';

type TicketDetailsProps = {
  ticket: {
    id: string;
    name: string;
    details: string;
    imageUrl?: string;
    token?: string | null;
    eventoId?: string | null;
    qrcode_hash?: string | null;
  };
};

export default function TicketDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { ticket } = route.params as TicketDetailsProps;
  const [printing, setPrinting] = React.useState(false);

  const [localImageUri, setLocalImageUri] = React.useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);

  // Prepare image for display: prefer cached local file when token/header required
  React.useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      if (!ticket?.imageUrl) return;
      setImageError(null);
      setImageLoading(true);

      console.log('[TicketDetails] prepare image', { imageUrl: ticket.imageUrl, hasToken: !!ticket.token, id: ticket.id, eventoId: ticket.eventoId, qrcode_hash: ticket.qrcode_hash });

      try {
        // If URL host doesn't match the configured API base, and we have qrcode_hash + eventoId,
        // reconstruct the imageUrl to point to the same bilheteria server used elsewhere.
        let effectiveUrl = ticket.imageUrl;
        try {
          // extract hostname manually (lib.dom URL props not available in this TS config)
          const parsedHostMatch = String(ticket.imageUrl).match(/^https?:\/\/([^/:]+)/i);
          const baseHostMatch = String(getApiBaseUrl()).match(/^https?:\/\/([^/:]+)/i);
          const parsedHost = parsedHostMatch ? parsedHostMatch[1] : null;
          const baseHost = baseHostMatch ? baseHostMatch[1] : null;
          if (parsedHost && baseHost && parsedHost !== baseHost && ticket.qrcode_hash && ticket.eventoId) {
            const forced = `${getApiBaseUrl()}/api/bilheteria/render/${encodeURIComponent(ticket.qrcode_hash)}?evento_id=${encodeURIComponent(ticket.eventoId)}`;
            console.log('[TicketDetails] replacing image host — using render URL on configured API base', { from: ticket.imageUrl, to: forced });
            effectiveUrl = forced;
          }
        } catch (e) {
          // ignore URL parsing errors
        }

        // data: and file: can be used directly
        if (effectiveUrl.startsWith('data:') || effectiveUrl.startsWith('file://')) {
          console.log('[TicketDetails] using data/file URL directly');
          if (mounted) setLocalImageUri(effectiveUrl);
          return;
        }

        // For http(s) URLs: download to cache (Image headers are unreliable on some platforms)
        const cacheName = ticket.qrcode_hash || ticket.id;
        const localPath = `${RNFS.CachesDirectoryPath}/ticket_preview_${cacheName}.jpg`;
        const headers: any = {};
        if (ticket.token) headers['X-Token-Bilheteria'] = ticket.token;

        try {
          console.log('[TicketDetails] attempting download to', localPath, 'from', effectiveUrl, 'headers:', headers);
          const download = await RNFS.downloadFile({ fromUrl: effectiveUrl, toFile: localPath, headers }).promise;
          console.log('[TicketDetails] download result', download);
          if (download.statusCode === 200) {
            if (mounted) {
              setLocalImageUri(`file://${localPath}`);
              console.log('[TicketDetails] local image ready', `file://${localPath}`);
            }
            return;
          }
          // fallback: if we don't have token, use remote URL directly
          if (!ticket.token) {
            console.log('[TicketDetails] download not 200 but no token — using remote URL');
            if (mounted) setLocalImageUri(effectiveUrl);
            return;
          }
          throw new Error(`status ${download.statusCode}`);
        } catch (err) {
          console.warn('[TicketDetails] download failed', err);
          // fallback to remote URL if token not present
          if (!ticket.token) {
            console.log('[TicketDetails] falling back to remote URL (no token)');
            if (mounted) setLocalImageUri(effectiveUrl);
            return;
          }
          throw err;
        }
      } catch (err:any) {
        console.error('[TicketDetails] image prepare error', err);
        if (mounted) setImageError(String(err));
      } finally {
        if (mounted) setImageLoading(false);
      }
    };
    prepare();
    return () => { mounted = false; };
  }, [ticket?.imageUrl, ticket?.token, ticket?.id, ticket?.eventoId, ticket?.qrcode_hash]);

  const handlePrint = async () => {
    if (!ticket) return;
    setPrinting(true);
    try {
      const ip = await AsyncStorage.getItem('printer_ip');
      const model = (await AsyncStorage.getItem('printer_model')) || undefined;
      if (!ip) {
        Alert.alert('Erro', 'IP da impressora não configurado. Vá em Configurações para configurar a impressora.');
        return;
      }

      if (!ticket.imageUrl && !localImageUri) {
        Alert.alert('Erro', 'Imagem do ingresso não disponível');
        return;
      }

      const imageToPrint = localImageUri || ticket.imageUrl!;
      await BrotherPrint.printImage({ ipAddress: ip || '', imageUri: imageToPrint, printerModel: model as any });
      Alert.alert('Impressão', 'Comando de impressão enviado');
    } catch (e:any) {
      SafeLogger.error('Erro ao imprimir ticket', e);
      Alert.alert('Erro ao imprimir', String(e));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalhes do Ingresso</Text>

      {imageLoading ? (
        <Text>Carregando imagem...</Text>
      ) : imageError ? (
        <Text style={{ color: 'red' }}>Falha ao carregar imagem: {imageError}</Text>
      ) : localImageUri ? (
        <>
          <Image source={{ uri: localImageUri }} style={styles.image} resizeMode="contain" />
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Fonte: {localImageUri}</Text>
        </>
      ) : ticket.imageUrl ? (
        <>
          <Image source={{ uri: ticket.imageUrl }} style={styles.image} resizeMode="contain" onError={(e) => setImageError(String(e.nativeEvent || e))} />
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Fonte: {ticket.imageUrl}</Text>
        </>
      ) : (
        <Text>Imagem indisponível</Text>
      )}

      <Text>ID: {ticket.id}</Text>
      <Text>Nome: {ticket.name}</Text>
      <Text>Detalhes: {ticket.details}</Text>

      <PaperButton icon="printer" mode="contained" loading={printing} disabled={printing} onPress={handlePrint} style={{ marginTop: 12 }}>
        {printing ? 'Imprimindo...' : 'Imprimir'}
      </PaperButton>

      <PaperButton mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  image: {
    width: 300,
    height: 400,
    marginBottom: 16,
  },
});