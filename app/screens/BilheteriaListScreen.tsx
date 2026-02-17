import React, { useEffect, useState } from 'react';
import { View, Alert, FlatList, TouchableOpacity } from 'react-native';
import { Text, TextInput as PaperTextInput, ActivityIndicator as PaperActivityIndicator, Button as PaperButton, List } from 'react-native-paper';
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
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');

  useEffect(() => { setSearch(''); loadPage(1); }, []);

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
      // try common paginated endpoints (prefer new paginated /participantes/list)
      const searchParam = search ? `&nome=${encodeURIComponent(search)}` : '';
      const urlsToTry = [
        `${base}/api/bilheteria/participantes/list?page=${p}&per_page=${perPage}${searchParam}`,
        `${base}/api/bilheteria/participantes?page=${p}&limit=${perPage}${searchParam}`,
        `${base}/api/bilheteria/participantes`,
      ];
      let res: Response | null = null;
      let text = '';
      for (const url of urlsToTry) {
        try {
          // attempt fetch
          res = await fetch(url, { headers });
          text = await res.text();
          if (res.ok) break; // success
        } catch (e) { SafeLogger.error('fetch error', e); res = null; }
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

      // helpers to dedupe by id
      const uniqueList = (arr: any[]) => {
        const map = new Map<string, any>();
        for (const it of arr || []) {
          const key = (it && (it._id || it.id)) || JSON.stringify(it);
          if (!map.has(key)) map.set(key, it);
        }
        return Array.from(map.values());
      };
      const mergeUnique = (prev: any[], incoming: any[]) => {
        const seen = new Set(prev.map(i => i._id || i.id));
        const out = [...prev];
        for (const it of incoming || []) {
          const k = it._id || it.id;
          if (!k) {
            // include items without id (rare)
            out.push(it);
            continue;
          }
          if (!seen.has(k)) { seen.add(k); out.push(it); }
        }
        return out;
      };

      if (Array.isArray(parsed)) {
        // API returned a plain array of participants
        setItems(prev => p === 1 ? uniqueList(parsed) : mergeUnique(prev, parsed));
        setHasMore(parsed.length >= perPage);

      } else if (parsed && parsed.participantes) {
        // Newer backend shape: { participantes: [...], total_count, total_pages, current_page, per_page }
        const incoming = parsed.participantes || [];
        setItems(prev => p === 1 ? uniqueList(incoming) : mergeUnique(prev, incoming));
        setHasMore((parsed.current_page || 1) < (parsed.total_pages || 1));

      } else if (parsed && parsed.items) {
        // Older/alternative paginated shape: { items: [...], page, totalPages }
        const incoming = parsed.items || [];
        setItems(prev => p === 1 ? uniqueList(incoming) : mergeUnique(prev, incoming));
        setHasMore((parsed.page || 1) < (parsed.totalPages || 1));

      } else {
        // Unknown format — fall back to single object
        const single = parsed ? [parsed] : [];
        setItems(prev => p === 1 ? uniqueList(single) : mergeUnique(prev, single));
        setHasMore(false);
      }

      setPage(p);
    } catch (e: any) {
      Alert.alert('Erro', String(e));
    } finally { setLoading(false); }
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const renderParticipant = ({ item }: any) => {
    const id = item._id || item.id || String(Math.random());
    const expanded = expandedId === id;

    return (
      <View style={{ borderBottomWidth: 1, borderColor: '#eee' }}>
        <TouchableOpacity
          onPress={() => setExpandedId(expanded ? null : id)}
          style={{ padding: 12, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{item.nome || item.nome_completo || '—'}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{item.cpf || '-'}</Text>
          </View>
          <Text style={{ color: '#0ea5e9', fontWeight: '700' }}>{expanded ? 'Ocultar' : 'Detalhes'}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ padding: 12, backgroundColor: '#fafafa' }}>
            <Text style={{ marginBottom: 6 }}>Email: {item.email || '-'}</Text>
            <Text style={{ marginBottom: 6 }}>Telefone: {item.telefone || '-'}</Text>
            <Text style={{ marginBottom: 6 }}>Empresa: {item.empresa || '-'}</Text>
            <Text style={{ marginBottom: 6 }}>Nacionalidade: {item.nacionalidade || '-'}</Text>
            <Text style={{ marginTop: 6, color: '#374151' }}>Ingressos: {Array.isArray(item.ingressos) ? item.ingressos.length : 0}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, styles.screenPadding]}>
      <Text style={styles.title}>Participantes</Text>
      <PaperTextInput
        label="Buscar (nome)"
        value={search}
        onChangeText={setSearch}
        style={{ marginBottom: 8 }}
        right={<PaperTextInput.Icon icon={search ? 'close' : 'magnify'} onPress={() => { if (search) { setSearch(''); loadPage(1); } }} />}
      />
      <PaperButton mode="contained" onPress={() => loadPage(1)} style={{ marginBottom: 12 }}>Buscar</PaperButton>
      {loading && <PaperActivityIndicator style={styles.loader} />}
      <FlatList
        data={items}
        keyExtractor={(i, idx) => i._id || i.id || String(idx)}
        renderItem={renderParticipant}
        onEndReached={() => { if (hasMore) loadPage(page + 1); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => <Text>Nenhum participante carregado.</Text>}
      />

      <PaperButton mode="text" onPress={onBack} style={{ marginTop: 12 }}>Voltar</PaperButton>
    </View>
  );
}
