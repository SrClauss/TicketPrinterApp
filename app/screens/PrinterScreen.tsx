import React, {useEffect, useState} from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView, Button } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrotherPrint, { PrinterModel, LabelSize, DiscoveredPrinter } from '../../lib/brother';
import { styles } from '../../App';

const labelSizeDescriptions: Record<LabelSize, string> = {
  [LabelSize.DieCutW17H54]: '17mm x 54mm (Die Cut)',
  [LabelSize.RollW62]: '62mm (Roll)',
  [LabelSize.RollW54]: '54mm (Roll)',
};

type Props = {
  onGoToLogin: () => void;
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

  useEffect(() => {
    async function loadIp() {
      try {
        const storedIp = await AsyncStorage.getItem('printer_ip');
        if (storedIp) setSelectedIP(storedIp);
      } catch (e) {
        console.error('Failed to load printer_ip', e);
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
        console.error('Failed to load printer settings', e);
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
        console.error('Unknown error: ', err);
      }
    }
  };

  const handleStorageIP = async () => {
    try {
      await AsyncStorage.setItem('printer_ip', ip);
      setSelectedIP(ip);
      setIp('');
    } catch (e) {
      console.error('Failed to save printer_ip', e);
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
      Alert.alert('Erro na descoberta', error.message || String(error));
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
      Alert.alert('Sucesso', result.message || 'Imagem enviada para impressão');
    } catch (error: any) {
      const msg = error && (error.message || String(error));
      Alert.alert('Erro ao imprimir', msg);
    } finally { setPrinting(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brother Printer</Text>
      <TouchableOpacity style={[styles.button, discovering && styles.buttonDisabled]} onPress={handleDiscovery} disabled={discovering}>
        <Text style={styles.buttonText}>{discovering ? 'Procurando impressoras...' : '🔍 Descobrir Impressoras'}</Text>
      </TouchableOpacity>
      {discovering && <ActivityIndicator size="large" style={styles.loader} />}

      {discoveredPrinters.length > 0 && (
        <View style={styles.printerListContainer}>
          <Text style={styles.subtitle}>Impressoras encontradas:</Text>
          {discoveredPrinters.map((printer, index) => (
            <TouchableOpacity key={index} style={[styles.printerItem, selectedIP === printer.ipAddress && styles.printerItemSelected]} onPress={() => handleSelectPrinter(printer)}>
              <Text style={styles.printerModel}>{printer.modelName || 'Brother Printer'}</Text>
              <Text style={styles.printerIP}>{printer.ipAddress}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.divider}>OU</Text>
      <TextInput style={styles.TextInput} onChangeText={setIp} value={ip} placeholder="Digite o IP manualmente" />
      <TouchableOpacity style={styles.button} onPress={handleStorageIP}><Text style={styles.buttonText}>💾 Gravar IP</Text></TouchableOpacity>
      <Text style={styles.selectedIP}>{selectedIP ? `📌 IP Selecionado: ${selectedIP}` : 'Nenhum IP selecionado'}</Text>

      <TouchableOpacity style={styles.button} onPress={() => setShowModelPicker(true)}><Text style={styles.buttonText}>🔧 Escolher Modelo: {selectedModel}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => setShowLabelPicker(true)}><Text style={styles.buttonText}>📐 Escolher Tamanho: {labelSizeDescriptions[selectedLabelSize]}</Text></TouchableOpacity>

      <Modal visible={showModelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Escolher Modelo</Text>
          <ScrollView>{(Object.values(PrinterModel) as PrinterModel[]).map((m) => (<TouchableOpacity key={m} style={styles.modalItem} onPress={() => { setSelectedModel(m); setShowModelPicker(false); }}><Text>{m}</Text></TouchableOpacity>))}</ScrollView>
          <TouchableOpacity style={styles.button} onPress={() => setShowModelPicker(false)}><Text style={styles.buttonText}>Fechar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={showLabelPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Escolher Tamanho do Papel</Text>
          <ScrollView>{(Object.values(LabelSize) as LabelSize[]).map((s) => (<TouchableOpacity key={s} style={styles.modalItem} onPress={() => { setSelectedLabelSize(s); setShowLabelPicker(false); }}><Text>{labelSizeDescriptions[s]}</Text></TouchableOpacity>))}</ScrollView>
          <TouchableOpacity style={styles.button} onPress={() => setShowLabelPicker(false)}><Text style={styles.buttonText}>Fechar</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={pickFile}><Text style={styles.buttonText}>📄 Selecionar Imagem</Text></TouchableOpacity>
      <Text style={styles.fileStatus}>{file ? `✓ ${file.split('/').pop()}` : 'Nenhum arquivo selecionado'}</Text>
      {printing && <ActivityIndicator size="large" style={styles.loader} />}
      <Button title={printing ? 'Printing...' : 'Print Selected Image'} disabled={printing} onPress={doPrint} />

      <TouchableOpacity style={[styles.button, {backgroundColor:'#28a745'}]} onPress={onGoToLogin}><Text style={styles.buttonText}>Ir para Login por Token</Text></TouchableOpacity>
    </View>
  );
}
