import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button as PaperButton, Card } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles as globalStyles } from '../../App';

type IngressoDetailsProps = {
  ingresso: {
    participante?: any;
    ingresso?: any;
    tipo_ingresso?: any;
    qrcode_hash?: string;
    status?: string;
    evento?: any;
    valido?: boolean;
  };
};

export default function PortariaIngressoDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as IngressoDetailsProps;
  const data = params?.ingresso || {};

  // Extract nested data
  const participante = data.participante || data.ingresso?.participante || {};
  const ingresso = data.ingresso || data;
  const tipoIngresso = data.tipo_ingresso || ingresso?.tipo_ingresso || {};
  const evento = data.evento || ingresso?.evento || {};
  const status = data.status || ingresso?.status || 'Desconhecido';
  const qrcode = data.qrcode_hash || ingresso?.qrcode_hash || '';
  const valido = data.valido !== undefined ? data.valido : (status === 'ativo' || status === 'checked_in');

  const localStyles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#f5f5f5',
    },
    card: {
      marginBottom: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#333',
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
      marginTop: 8,
    },
    fieldValue: {
      fontSize: 16,
      color: '#333',
      marginBottom: 4,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
    },
    statusText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    buttonContainer: {
      marginTop: 16,
    },
  });

  const statusColor = valido ? '#4caf50' : '#f44336';
  const statusText = valido ? 'VÁLIDO ✓' : 'INVÁLIDO ✗';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={localStyles.container}>
        <Text style={globalStyles.title}>Validação de Ingresso</Text>

      {/* Status Card */}
      <Card style={[localStyles.card, { backgroundColor: valido ? '#e8f5e9' : '#ffebee' }]}>
        <View style={[localStyles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={[localStyles.statusText, { color: '#fff' }]}>{statusText}</Text>
        </View>
        <Text style={[localStyles.fieldLabel, { marginTop: 12 }]}>Status do Ingresso:</Text>
        <Text style={localStyles.fieldValue}>{status}</Text>
      </Card>

      {/* Participant Info */}
      <Card style={localStyles.card}>
        <Text style={localStyles.sectionTitle}>Participante</Text>
        
        <Text style={localStyles.fieldLabel}>Nome:</Text>
        <Text style={localStyles.fieldValue}>{participante.nome || participante.nome_completo || 'N/A'}</Text>
        
        <Text style={localStyles.fieldLabel}>CPF:</Text>
        <Text style={localStyles.fieldValue}>{participante.cpf || 'N/A'}</Text>
        
        <Text style={localStyles.fieldLabel}>Email:</Text>
        <Text style={localStyles.fieldValue}>{participante.email || 'N/A'}</Text>
        
        <Text style={localStyles.fieldLabel}>Telefone:</Text>
        <Text style={localStyles.fieldValue}>{participante.telefone || participante.celular || 'N/A'}</Text>
      </Card>

      {/* Ticket Info */}
      <Card style={localStyles.card}>
        <Text style={localStyles.sectionTitle}>Informações do Ingresso</Text>
        
        <Text style={localStyles.fieldLabel}>Tipo de Ingresso:</Text>
        <Text style={localStyles.fieldValue}>{tipoIngresso.nome || tipoIngresso.tipo || 'N/A'}</Text>
        
        <Text style={localStyles.fieldLabel}>Código QR:</Text>
        <Text style={[localStyles.fieldValue, { fontFamily: 'monospace', fontSize: 12 }]}>
          {qrcode || 'N/A'}
        </Text>
        
        {ingresso._id && (
          <>
            <Text style={localStyles.fieldLabel}>ID do Ingresso:</Text>
            <Text style={[localStyles.fieldValue, { fontFamily: 'monospace', fontSize: 12 }]}>
              {ingresso._id}
            </Text>
          </>
        )}
      </Card>

      {/* Event Info */}
      <Card style={localStyles.card}>
        <Text style={localStyles.sectionTitle}>Evento</Text>
        
        <Text style={localStyles.fieldLabel}>Nome do Evento:</Text>
        <Text style={localStyles.fieldValue}>{evento.nome || 'N/A'}</Text>
        
        <Text style={localStyles.fieldLabel}>Descrição:</Text>
        <Text style={localStyles.fieldValue}>{evento.descricao || 'N/A'}</Text>
        
        {evento.data_evento && (
          <>
            <Text style={localStyles.fieldLabel}>Data:</Text>
            <Text style={localStyles.fieldValue}>{evento.data_evento}</Text>
          </>
        )}
        
        {evento.local && (
          <>
            <Text style={localStyles.fieldLabel}>Local:</Text>
            <Text style={localStyles.fieldValue}>{evento.local}</Text>
          </>
        )}
      </Card>

      {/* Actions */}
      <View style={localStyles.buttonContainer}>
        <PaperButton 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginBottom: 8 }}
          icon="qrcode-scan"
        >
          Ler Próximo Ingresso
        </PaperButton>
        
        <PaperButton 
          mode="outlined" 
          onPress={() => {
            navigation.goBack();
            navigation.goBack();
          }}
        >
          Voltar para Menu Principal
        </PaperButton>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
