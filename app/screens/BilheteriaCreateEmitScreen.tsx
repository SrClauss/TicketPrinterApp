import React, { useEffect, useState, useCallback } from 'react';
import { Text, View, Alert, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';
import BrotherPrint, { PrinterModel } from '../../lib/brother';







export default function BilheteriaCreateEmitScreen() {



  const [requiredFields, setRequiredFields] = useState<string[]>(['Nome','Email','CPF']);
  const [formValues, setFormValues] = useState<Record<string,string>>({ nome: '', email: '', cpf: '', telefone: '', empresa: '', nacionalidade: '' });
  const [loadingFields, setLoadingFields] = useState(false);

  const mapFieldToKey = (field: string) => {
    const f = (field || '').toLowerCase();
    if (f.includes('nome')) return 'nome';
    if (f.includes('email')) return 'email';
    if (f.includes('cpf')) return 'cpf';
    if (f.includes('telefone')) return 'telefone';
    if (f.includes('empresa')) return 'empresa';
    if (f.includes('nacionalidade')) return 'nacionalidade';
    return field.replace(/\s+/g, '_').toLowerCase();
  };

  useEffect(() => {
    (async () => {
      setLoadingFields(true);
      try {
        const token = await AsyncStorage.getItem('bilheteria_token');
        const base = getApiBaseUrl();
        const headers: any = {};
        if (token) headers['X-Token-Bilheteria'] = token;
        const res = await fetch(`${base}/api/bilheteria/evento/campos-obrigatorios`, { headers });
        if (!res.ok) { setLoadingFields(false); return; }
        const j = await res.json();
        const campos: string[] = j.campos_obrigatorios || ['Nome','Email','CPF'];
        setRequiredFields(campos);
        setFormValues(prev => {
          const next = { ...prev };
          campos.forEach(c => { const k = mapFieldToKey(c); if (!(k in next)) next[k] = ''; });
          return next;
        });
      } catch (e: any) {
        SafeLogger.error('Erro buscando campos obrigatórios', e);
      } finally { setLoadingFields(false); }
    })();
  }, []);



  const handleChange = (key: string, v: string) => setFormValues(prev => ({ ...prev, [key]: v }));

  const handleSubmit = async () => {
    // For now only log; real implementation should POST to API to create participante + emitir ingresso
    SafeLogger.log('Emitir com campos:', formValues);
    Alert.alert('Emitir', 'Dados prontos para envio (ver console).');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar e Emitir Ingressos</Text>
      {loadingFields && <ActivityIndicator size="small" />}

      {requiredFields.map((f) => {
        const key = mapFieldToKey(f);
        const value = formValues[key] || '';
        const keyboardType = key === 'email' ? 'email-address' : (key === 'cpf' || key === 'telefone' ? 'numeric' : 'default');
        return (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={f}
            value={value}
            onChangeText={(v) => handleChange(key, v)}
            keyboardType={keyboardType}
          />
        );
      })}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>Criar e Emitir Ingresso</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
