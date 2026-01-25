import React, {useEffect, useState} from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { Text, TextInput as PaperTextInput, Button, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';


type Props = {
  onGoToPrinter: () => void;
  onLoginResult: (desc: string) => void;
  onGoToBilheteria: () => void;
  onGoToPortaria: () => void;
};

export default function LoginScreen({ onGoToPrinter, onLoginResult, onGoToBilheteria, onGoToPortaria }: Props) {
  // load tokens from AsyncStorage if present
  const [bilheteriaToken, setBilheteriaToken] = useState<string>('');

  // local styles
  const localStyles = StyleSheet.create({
    envTextSmall: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
    tokenContainer: { width: '100%', maxWidth: 360 },
    tokenLabel: { fontSize: 12, color: '#4b5563', marginBottom: 6 },
    buttonMarginTop8: { marginTop: 8 },
    portariaContainer: { marginTop: 18 },
    supportButton: { marginTop: 24 },
    supportInner: { color: '#0ea5e9', fontWeight: '600' },    tokenInputFull: { width: '100%' },  });
  const [portariaToken, setPortariaToken] = useState<string>('');
  const [bilheteriaLoading, setBilheteriaLoading] = useState(false);
  const [portariaLoading, setPortariaLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const b = await AsyncStorage.getItem('bilheteria_token');
        if (b) setBilheteriaToken(b);
        const p = await AsyncStorage.getItem('portaria_token');
        if (p) setPortariaToken(p);
      } catch {
        // ignore
      }
    })();
  }, []);





  const testBilheteria = async () => {
    const tokenToUse = bilheteriaToken;
    if (!tokenToUse) { Alert.alert('Token ausente', 'Forneça um token de bilheteria'); return; }
    setBilheteriaLoading(true);
    try {
      await AsyncStorage.setItem('bilheteria_token', tokenToUse);
    } catch { /* ignore */ }

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/bilheteria/evento`, { headers: { 'X-Token-Bilheteria': tokenToUse } });
      const text = await res.text();
      if (res.ok) {
        onGoToBilheteria();
      } else {
        onLoginResult(`Bilheteria: status ${res.status} resposta: ${SafeLogger.sanitizeString(text)}`);
      }
    } catch (e: any) {
      SafeLogger.error('Bilheteria - Erro', e);
      onLoginResult('Bilheteria - Erro ao conectar');
    } finally {
      setBilheteriaLoading(false);
    }
  };

  const testPortaria = async () => {
    const tokenToUse = portariaToken;
    if (!tokenToUse) { Alert.alert('Token ausente', 'Forneça um token de portaria'); return; }
    setPortariaLoading(true);
    try {
      await AsyncStorage.setItem('portaria_token', tokenToUse);
    } catch { /* ignore */ }

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/portaria/evento`, { headers: { 'X-Token-Portaria': tokenToUse } });
      const text = await res.text();
      if (res.ok) {
        onGoToPortaria();
      } else {
        onLoginResult(`Portaria: status ${res.status} resposta: ${SafeLogger.sanitizeString(text)}`);
      }
    } catch (e: any) {
      SafeLogger.error('Portaria - Erro', e);
      onLoginResult('Portaria - Erro ao conectar');
    } finally {
      setPortariaLoading(false);
    }
  };

  return (
    <View style={[styles.container, styles.loginCenter]}> 
      <IconButton icon="printer" size={24} onPress={onGoToPrinter} style={styles.printerIcon} accessibilityLabel="Configurações de impressora" />

      <View style={styles.loginHeader}>
        <View style={styles.logoCircle}><Text style={styles.logoEmoji}>🎫</Text></View>
        <Text style={styles.headerTitle}>EVENTIX</Text>
        <Text style={styles.headerSubtitle}>Gestão de Ingressos Premium</Text>
        <Text style={localStyles.envTextSmall}>Base: {getApiBaseUrl()}</Text>
      </View>

      <View style={[styles.neuContainer, localStyles.tokenContainer]}> 
        <Text style={localStyles.tokenLabel}>Token Bilheteria</Text>
        <PaperTextInput value={bilheteriaToken} onChangeText={setBilheteriaToken} placeholder="X-Token-Bilheteria" style={[styles.TextInput, localStyles.tokenInputFull]} mode="outlined" />
        <Button mode="contained" onPress={testBilheteria} loading={bilheteriaLoading} disabled={bilheteriaLoading} style={localStyles.buttonMarginTop8}>{bilheteriaLoading ? 'Testando...' : 'Salvar e Testar Bilheteria'}</Button>
      </View>

      <View style={[localStyles.tokenContainer, localStyles.portariaContainer]}>
        <Text style={localStyles.tokenLabel}>Token Portaria</Text>
        <PaperTextInput value={portariaToken} onChangeText={setPortariaToken} placeholder="X-Token-Portaria" style={[styles.TextInput, localStyles.tokenInputFull]} mode="outlined" />
        <Button mode="contained" onPress={testPortaria} loading={portariaLoading} disabled={portariaLoading} style={localStyles.buttonMarginTop8}>{portariaLoading ? 'Testando...' : 'Salvar e Testar Portaria'}</Button>
      </View>

      <Button mode="text" onPress={() => { /* suporte placeholder */ }} compact style={localStyles.supportButton}><Text style={styles.smallText}>Esqueceu seu token? <Text style={localStyles.supportInner}>Suporte</Text></Text></Button>
    </View>
  );
}
