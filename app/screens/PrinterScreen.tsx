import React, {useEffect, useState, useCallback, useMemo} from 'react';
import { View, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { Appbar, useTheme, Text, Button as PaperButton, TextInput as PaperTextInput, IconButton, ActivityIndicator as PaperActivityIndicator, List, Divider } from 'react-native-paper';
import DocumentPicker, { types } from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrotherPrint, { PrinterModel, LabelSize, DiscoveredPrinter } from '../../lib/brother';
import { styles } from '../../App';
import SafeLogger from '../utils/SafeLogger';

const labelSizeDescriptions: Partial<Record<LabelSize, string>> = {
  [LabelSize.DieCutW17H54]: '17mm x 54mm (Die Cut)',
  [LabelSize.RollW62]: '62mm (Roll)',
  [LabelSize.RollW54]: '54mm (Roll)',
};

type Props = {
  onGoToLogin: () => void;
};

const PrinterListItem = ({ printer, onSelect, selected }: { printer: DiscoveredPrinter; onSelect: (p: DiscoveredPrinter) => void; selected: boolean }) => {
  const renderLeft = useCallback((props: {color: string}) => <List.Icon {...props} icon="printer" />, []);
  const renderRight = useCallback((props: {color: string}) => <IconButton {...props} icon={selected ? 'check-circle' : 'chevron-right'} onPress={() => onSelect(printer)} />, [onSelect, printer, selected]);

  return (
    <List.Item
      title={printer.modelName || 'Brother Printer'}
      description={printer.ipAddress}
      onPress={() => onSelect(printer)}
      left={renderLeft}
      right={renderRight}
    />
  );
};

export default function PrinterScreen({ onGoToLogin }: Props) {
  const [file, setFile] = useState<string | null>(null);
  const [ip, setIp] = useState<string>('');
  const [selectedIP, setSelectedIP] = useState<string>('');
  const [printing, setPrinting] = useState<boolean>(false);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [selectedModel, setSelectedModel] = useState<PrinterModel>(PrinterModel.QL_820NWB);
  const [selectedLabelSize, setSelectedLabelSize] = useState<LabelSize>(LabelSize.DieCutW17H54);
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [showLabelPicker, setShowLabelPicker] = useState<boolean>(false);
  // printer related state

  useEffect(() => {
    async function loadIp() {
      try {
        const storedIp = await AsyncStorage.getItem('printer_ip');
        if (storedIp) setSelectedIP(storedIp);
      } catch (e) {
        SafeLogger.error('Failed to load printer_ip', e);
      }
    }
    loadIp();
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedModel = await AsyncStorage.getItem('printer_model');
        const storedLabel = await AsyncStorage.getItem('label_size');
        if (storedModel) setSelectedModel(storedModel as PrinterModel);
        if (storedLabel) setSelectedLabelSize(storedLabel as LabelSize);
      } catch (e) {
        SafeLogger.error('Failed to load printer settings', e);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => { AsyncStorage.setItem('printer_ip', selectedIP); }, [selectedIP]);
  useEffect(() => { AsyncStorage.setItem('printer_model', selectedModel); }, [selectedModel]);
  useEffect(() => { AsyncStorage.setItem('label_size', selectedLabelSize); }, [selectedLabelSize]);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pick({ type: [types.images] });
      setFile(res[0].uri);
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        // canceled
      } else {
        SafeLogger.error('Unknown error picking file', err);
        Alert.alert('Erro ao selecionar arquivo', SafeLogger.sanitizeString(err?.message || String(err)));
      }
    }
  };

  const handleStorageIP = async () => {
    try {
      await AsyncStorage.setItem('printer_ip', ip);
      setSelectedIP(ip);
      setIp('');
    } catch (e) {
      SafeLogger.error('Failed to save printer_ip', e);
      Alert.alert('Erro', 'Não foi possível salvar o IP da impressora');
    }
  };

  const handleDiscovery = async () => {
    setDiscovering(true);
    setDiscoveredPrinters([]);
    try {
      const printers = await BrotherPrint.discoverPrinters(15);
      setDiscoveredPrinters(printers);
      if (printers.length === 0) {
        Alert.alert('Nenhuma impressora encontrada', 'Nenhuma impressora Brother foi encontrada na rede. Você pode adicionar o IP manualmente.');
      }
    } catch (error: any) {
      SafeLogger.error('Discovery error', error);
      Alert.alert('Erro na descoberta', SafeLogger.sanitizeString(error?.message || String(error)));
    } finally {
      setDiscovering(false);
    }
  };

  const handleSelectPrinter = (printer: DiscoveredPrinter) => {
    setSelectedIP(printer.ipAddress);
    Alert.alert('Impressora selecionada', `${printer.modelName || 'Impressora'} - ${printer.ipAddress}`);
  };

  const doPrint = async () => {
    const targetIp = selectedIP || ip;
    if (!file) { Alert.alert('Nenhum arquivo selecionado', 'Selecione uma imagem para imprimir'); return; }
    if (!targetIp) { Alert.alert('IP não informado', 'Informe o IP da impressora antes de imprimir'); return; }
    setPrinting(true);
    try {
      const result = await BrotherPrint.printImage({ ipAddress: targetIp, imageUri: file!, printerModel: selectedModel, labelSize: selectedLabelSize });
      Alert.alert('Sucesso', SafeLogger.sanitizeString(result?.message || 'Imagem enviada para impressão'));
    } catch (error: any) {
      SafeLogger.error('Erro ao imprimir', error);
      const msg = SafeLogger.sanitizeString(error?.message || String(error));
      Alert.alert('Erro ao imprimir', msg);
    } finally { setPrinting(false); }
  };



  const theme = useTheme();
  const appbarStyle = useMemo(() => ({ backgroundColor: theme.colors.surface }), [theme.colors.surface]);

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={appbarStyle}>
        <Appbar.BackAction onPress={onGoToLogin} accessibilityLabel="Voltar" />
        <Appbar.Content title="Brother Printer" titleStyle={localStyles.appbarTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={localStyles.scrollContent} keyboardShouldPersistTaps="handled">
      <PaperButton mode="outlined" icon="magnify" onPress={handleDiscovery} loading={discovering} disabled={discovering} style={localStyles.buttonMarginVertical6}>{discovering ? 'Procurando impressoras...' : 'Descobrir Impressoras'}</PaperButton>
      {discovering && <PaperActivityIndicator animating={discovering} size={36} style={styles.loader} />}

      {discoveredPrinters.length > 0 && (
        <View style={styles.printerListContainer}>
          <Text style={styles.subtitle}>Impressoras encontradas:</Text>
          <List.Section>
            { }
            {discoveredPrinters.map((printer, index) => (
              <PrinterListItem key={printer.ipAddress || index} printer={printer} onSelect={handleSelectPrinter} selected={selectedIP === printer.ipAddress} />
            ))}
          </List.Section>
        </View>
      )}

      <Divider style={localStyles.dividerMarginVertical10} />
      <Text style={localStyles.textMarginBottom6}>Ou digite o IP manualmente</Text>
      <PaperTextInput style={styles.TextInput} onChangeText={setIp} value={ip} placeholder="Digite o IP manualmente" mode="outlined" />
      <PaperButton icon="content-save" mode="outlined" onPress={handleStorageIP} style={localStyles.marginTop8}>Gravar IP</PaperButton>
      <Text style={styles.selectedIP}>{selectedIP ? `IP Selecionado: ${selectedIP}` : 'Nenhum IP selecionado'}</Text>

      <PaperButton icon="tools" mode="outlined" onPress={() => setShowModelPicker(true)} style={localStyles.marginTop10}>Escolher Modelo: {selectedModel}</PaperButton>
      <PaperButton icon="aspect-ratio" mode="outlined" onPress={() => setShowLabelPicker(true)} style={localStyles.marginTop8}>Escolher Tamanho: {labelSizeDescriptions[selectedLabelSize]}</PaperButton>

      <Modal visible={showModelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Escolher Modelo</Text>
          <ScrollView>{(Object.values(PrinterModel) as PrinterModel[]).map((m) => (<List.Item key={m} title={m} onPress={() => { setSelectedModel(m); setShowModelPicker(false); }} />))}</ScrollView>
          <PaperButton mode="text" onPress={() => setShowModelPicker(false)}>Fechar</PaperButton>
        </View></View>
      </Modal>

      <Modal visible={showLabelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Escolher Tamanho do Papel</Text>
          <ScrollView>{(Object.values(LabelSize) as LabelSize[]).map((s) => (<List.Item key={s} title={labelSizeDescriptions[s] || String(s)} onPress={() => { setSelectedLabelSize(s); setShowLabelPicker(false); }} />))}</ScrollView>
          <PaperButton mode="text" onPress={() => setShowLabelPicker(false)}>Fechar</PaperButton>
        </View></View>
      </Modal>

      {/* Printer-only controls: file selection, print, discovery and model/label settings */}

      <PaperButton icon="file" mode="outlined" onPress={pickFile}>Selecionar Imagem</PaperButton>
      <Text style={styles.fileStatus}>{file ? `✓ ${file.split('/').pop()}` : 'Nenhum arquivo selecionado'}</Text>
      {printing && <PaperActivityIndicator animating={printing} size={36} style={styles.loader} />}
      <PaperButton icon="printer" mode="contained" loading={printing} disabled={printing} onPress={doPrint} style={localStyles.marginTop12}>{printing ? 'Enviando...' : 'Imprimir imagem selecionada'}</PaperButton>

      <PaperButton mode="text" icon="login" onPress={onGoToLogin} style={localStyles.marginTop8}>Ir para Login por Token</PaperButton>
    </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  sectionContainer: { marginTop: 12, width: '100%' },
  inputMargin: { marginBottom: 6 },
  buttonPrimary: { backgroundColor: '#0ea5e9' },
  buttonSuccess: { backgroundColor: '#28a745' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  // header spacer removed; Appbar handles layout
  headerSpacer: { width: 72 },
  appbarTitle: { fontWeight: '700' },
  buttonMarginVertical6: { marginVertical: 6 },
  dividerMarginVertical10: { marginVertical: 10 },
  textMarginBottom6: { marginBottom: 6 },
  marginTop8: { marginTop: 8 },
  marginTop10: { marginTop: 10 },
  marginTop12: { marginTop: 12 },
});
