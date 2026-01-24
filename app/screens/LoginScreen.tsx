import React, {useEffect, useState} from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';

type Props = {
  onGoToPrinter: () => void;
  onLoginResult: (desc: string) => void;
};

export default function LoginScreen({ onGoToPrinter, onLoginResult }: Props) {
  const [token, setToken] = useState<string>('');
  const [env, setEnv] = useState<string>('development');
  const [loading, setLoading] = useState<boolean>(false);
  // quick test tokens (can be edited) — provided by user
  const [bilheteriaToken, setBilheteriaToken] = useState<string>('YmlsaGV0ZXJpYV9Qb2NvXzIwMjYtMDEt');
  const [portariaToken, setPortariaToken] = useState<string>('cG9ydGFyaWFfUG9jb18yMDI2LTAxLTIz');

  useEffect(() => {
    AsyncStorage.getItem('api_env').then(v => { if (v) setEnv(v); });
  }, []);

  const toggleEnv = async () => {
    const next = env === 'development' ? 'production' : 'development';
    setEnv(next);
    await AsyncStorage.setItem('api_env', next);
  };

  const handleLogin = async () => {
    if (!token || token.trim().length < 4) return;
    setLoading(true);
    try {
      const base = getApiBaseUrl(env as any);
      const res = await fetch(`${base}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { data = text; }

      if (res.ok) {
        const tokenResp = data && (data.access_token || data.token || data.admin_jwt || data.jwt) || null;
        if (tokenResp) {
          await AsyncStorage.setItem('admin_token', tokenResp);
        }
        const desc = `Login bem-sucedido. Status: ${res.status}. ${tokenResp ? 'Token salvo em admin_token.' : 'Nenhum token no corpo da resposta.'}`;
        onLoginResult(desc);
      } else {
        const desc = `Erro no login. Status: ${res.status}. Resposta: ${JSON.stringify(data)}`;
        onLoginResult(desc);
      }
    } catch (err: any) {
      onLoginResult(`Falha na requisição: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testBilheteria = async () => {
    const tokenToUse = bilheteriaToken;
    if (!tokenToUse) { Alert.alert('Token ausente', 'Forneça um token de bilheteria'); return; }
    try {
      const base = getApiBaseUrl(env as any);
      const res = await fetch(`${base}/api/bilheteria/evento`, { headers: { 'X-Token-Bilheteria': tokenToUse } });
      const text = await res.text();
      Alert.alert('Bilheteria', `Status: ${res.status}\nResposta: ${text}`);
    } catch (e: any) {
      Alert.alert('Bilheteria - Erro', String(e));
    }
  };

  const testPortaria = async () => {
    const tokenToUse = portariaToken;
    if (!tokenToUse) { Alert.alert('Token ausente', 'Forneça um token de portaria'); return; }
    try {
      const base = getApiBaseUrl(env as any);
      const res = await fetch(`${base}/api/portaria/evento`, { headers: { 'X-Token-Portaria': tokenToUse } });
      const text = await res.text();
      Alert.alert('Portaria', `Status: ${res.status}\nResposta: ${text}`);
    } catch (e: any) {
      Alert.alert('Portaria - Erro', String(e));
    }
  };

  return (
    <View style={[styles.container, {justifyContent:'center', alignItems:'center', paddingHorizontal:24}]}> 
      <View style={{alignItems:'center', marginBottom:24}}>
        <View style={styles.logoCircle}><Text style={{fontSize:32}}>🎫</Text></View>
        <Text style={styles.headerTitle}>EVENTIX</Text>
        <Text style={styles.headerSubtitle}>Gestão de Ingressos Premium</Text>
      </View>

      <View style={[styles.neuContainer, {width:'100%', maxWidth:360}]}> 
        <View style={{marginBottom:16}}>
          <Text style={{fontSize:12, color:'#4b5563', marginBottom:6}}>Acesso por Token</Text>
          <View style={styles.neuInset}> 
            <Text style={{marginRight:8}}>🔒</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder="Insira seu token de acesso"
              placeholderTextColor="#9CA3AF"
              style={styles.tokenInput}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity style={styles.neuButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0ea5e9" /> : <Text style={{color:'#0ea5e9', fontWeight:'700'}}>Entrar no Portal ➡️</Text>}
        </TouchableOpacity>
      </View>

      <View style={{width:'100%', maxWidth:360, marginTop:18}}>
        <Text style={{fontSize:12, color:'#4b5563', marginBottom:6}}>Token Bilheteria</Text>
        <TextInput value={bilheteriaToken} onChangeText={setBilheteriaToken} placeholder="X-Token-Bilheteria" style={[styles.TextInput, {width:'100%'}]} />
        <TouchableOpacity style={[styles.button, {marginTop:8}]} onPress={testBilheteria}><Text style={styles.buttonText}>Testar Bilheteria (GET /api/bilheteria/evento)</Text></TouchableOpacity>

        <Text style={{fontSize:12, color:'#4b5563', marginTop:12, marginBottom:6}}>Token Portaria</Text>
        <TextInput value={portariaToken} onChangeText={setPortariaToken} placeholder="X-Token-Portaria" style={[styles.TextInput, {width:'100%'}]} />
        <TouchableOpacity style={[styles.button, {marginTop:8}]} onPress={testPortaria}><Text style={styles.buttonText}>Testar Portaria (GET /api/portaria/evento)</Text></TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => { /* suporte placeholder */ }} style={{marginTop:24}}>
        <Text style={styles.smallText}>Esqueceu seu token? <Text style={{color:'#0ea5e9', fontWeight:'600'}}>Suporte</Text></Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onGoToPrinter} style={{position:'absolute', top:40, left:16}}>
        <Text style={{color:'#6b7280'}}>Configurar Impressora</Text>
      </TouchableOpacity>
    </View>
  );
}
