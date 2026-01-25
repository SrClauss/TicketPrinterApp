import React, { useEffect, useState } from 'react';
import { View, Alert, FlatList } from 'react-native';
import { Text, ActivityIndicator as PaperActivityIndicator, Button as PaperButton, List } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../App';
import { getApiBaseUrl } from '../../env';
import SafeLogger from '../utils/SafeLogger';

type Props = { onBack: () => void };

export default function BilheteriaListScreen({ onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => { loadPage(1); }, []);

  const tryParseJson = (text: string) => {
    try { return JSON.parse(text); } catch { return null; }
  };

  const loadPage = async (p: number) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('bilheteria_token');
      const base = getApiBaseUrl();
      const headers: any = {};
      if (token) headers['X-Token-Bilheteria'] = token;
      let res: Response | null = null;
      let text = '';

      // try documented admin paginated endpoint if possible
      try {
        const eventoRes = await fetch(`${base}/api/bilheteria/evento`, { headers });
        if (eventoRes.ok) {
          const eventoText = await eventoRes.text();
          let ev: any = null;
          try { ev = JSON.parse(eventoText); } catch { ev = null; }
          const eventoId = ev?._id || ev?.id;
          if (eventoId) {
            const adminUrl = `${base}/admin/eventos/${encodeURIComponent(eventoId)}/participantes?page=${p}&per_page=20&busca=`;
            try {
              res = await fetch(adminUrl, { headers });
              text = await res.text();
            } catch (e) { SafeLogger.error('fetch admin error', e); res = null; }
          }
        }
      } catch (e) { SafeLogger.error('evento fetch error', e); }

      if (!res || !res.ok) {
        // fallback to older endpoints
        const urlsToTry = [
          `${base}/api/bilheteria/participantes?page=${p}&limit=20`,
          `${base}/api/bilheteria/participantes`,
        ];
        for (const url of urlsToTry) {
          try {
            res = await fetch(url, { headers });
            text = await res.text();
            if (res.ok) break;
          } catch (e) { SafeLogger.error('fetch error', e); res = null; }
        }
      }

      if (!res) { Alert.alert('Erro', 'Não foi possível conectar à API'); return; }
      if (!res.ok) {
        if (res.status === 404) {
          Alert.alert('Não implementado', 'Endpoint de listagem paginada não disponível na API.');
        } else {
          Alert.alert('Erro', `Status ${res.status}\n${SafeLogger.sanitizeString(text)}`);
        }
        setHasMore(false);
        return;
      }
      const parsed = tryParseJson(text);
      if (Array.isArray(parsed)) {
        setItems(prev => p === 1 ? parsed : prev.concat(parsed));
        setHasMore(parsed.length >= 20);
      } else if (parsed && parsed.items) {
        setItems(prev => p === 1 ? parsed.items : prev.concat(parsed.items));
        setHasMore(parsed.page < parsed.totalPages);
      } else {
        // unknown format
        setItems(p === 1 ? [parsed] : items.concat([parsed]));
        setHasMore(false);
      }
      setPage(p);
    } catch (e: any) {
      Alert.alert('Erro', String(e));
    } finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Participantes</Text>
      {loading && <PaperActivityIndicator style={styles.loader} />}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => i._id || i.id || String(idx)}
        renderItem={({ item }) => (
          <List.Item title={item.nome || item.nome_completo || JSON.stringify(item)} description={item.email || ''} />
        )}
        onEndReached={() => { if (hasMore) loadPage(page + 1); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => <Text>Nenhum participante carregado.</Text>}
      />

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
