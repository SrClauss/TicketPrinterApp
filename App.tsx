/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, TextInput, TouchableOpacity, useColorScheme, View, ActivityIndicator, Alert } from 'react-native';
import {
  SafeAreaProvider,

} from 'react-native-safe-area-context';
import { Text, Button } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrotherPrint, { PrinterModel, LabelSize, DiscoveredPrinter } from './lib/brother';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [file, setFile] = useState<string | null>(null);
  const [ip, setIp] = useState<string>('');
  const [selectedIP, setSelectedIP] = useState<string>('');
  const [printing, setPrinting] = useState<boolean>(false);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);

  useEffect(() => {
    async function loadIp() {
      try {
        const storedIp = await AsyncStorage.getItem('printer_ip');
        if (storedIp) {
          setSelectedIP(storedIp);
        }
      } catch (e) {
        console.error('Failed to load printer_ip', e);
      }
    }
    loadIp();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem('printer_ip', selectedIP);
  }, [selectedIP]);



  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [types.images], // Permite selecionar apenas imagens
      });
      console.log('File selected: ', res);
      setFile(res[0].uri); // Salva o URI do arquivo selecionado
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User canceled the picker');
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
    }

    catch (e) {
      console.error('Failed to save printer_ip', e);
    }
  };


  const handleDiscovery = async () => {
    setDiscovering(true);
    setDiscoveredPrinters([]);
    
    try {
      console.log('Starting printer discovery...');
      const printers = await BrotherPrint.discoverPrinters(15);
      console.log('Found printers:', printers);
      
      setDiscoveredPrinters(printers);
      
      if (printers.length === 0) {
        Alert.alert('Nenhuma impressora encontrada', 'Nenhuma impressora Brother foi encontrada na rede. Você pode adicionar o IP manualmente.');
      } else {
        Alert.alert('Impressoras encontradas', `${printers.length} impressora(s) encontrada(s)`);
      }
    } catch (error: any) {
      console.error('Discovery error:', error);
      Alert.alert('Erro na descoberta', error.message || String(error));
    } finally {
      setDiscovering(false);
    }
  };


  const handleSelectPrinter = (printer: DiscoveredPrinter) => {
    setSelectedIP(printer.ipAddress);
    Alert.alert('Impressora selecionada', `${printer.modelName || 'Impressora'} - ${printer.ipAddress}`);
  };




  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brother Printer</Text>
      
      <TouchableOpacity
        style={[styles.button, discovering && styles.buttonDisabled]}
        onPress={handleDiscovery}
        disabled={discovering}
      >
        <Text style={styles.buttonText}>
          {discovering ? 'Procurando impressoras...' : '🔍 Descobrir Impressoras'}
        </Text>
      </TouchableOpacity>

      {discovering && <ActivityIndicator size="large" style={styles.loader} />}

      {discoveredPrinters.length > 0 && (
        <View style={styles.printerListContainer}>
          <Text style={styles.subtitle}>Impressoras encontradas:</Text>
          {discoveredPrinters.map((printer, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.printerItem,
                selectedIP === printer.ipAddress && styles.printerItemSelected
              ]}
              onPress={() => handleSelectPrinter(printer)}
            >
              <Text style={styles.printerModel}>{printer.modelName || 'Brother Printer'}</Text>
              <Text style={styles.printerIP}>{printer.ipAddress}</Text>
              {printer.serialNumber && (
                <Text style={styles.printerSerial}>S/N: {printer.serialNumber}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.divider}>OU</Text>

      <TextInput
        style={styles.TextInput}
        onChangeText={setIp}
        value={ip}
        placeholder="Digite o IP manualmente"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleStorageIP}
      >
        <Text style={styles.buttonText}>💾 Gravar IP</Text>
      </TouchableOpacity>
      
      <Text style={styles.selectedIP}>
        {selectedIP ? `📌 IP Selecionado: ${selectedIP}` : 'Nenhum IP selecionado'}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={pickFile}>
        <Text style={styles.buttonText}>📄 Selecionar Imagem</Text>
      </TouchableOpacity>
      
      <Text style={styles.fileStatus}>{file ? `✓ ${file.split('/').pop()}` : 'Nenhum arquivo selecionado'}</Text>
      
      {printing && <ActivityIndicator size="large" style={styles.loader} />}
      <Button
        title={printing ? 'Printing...' : 'Print Selected Image'}
        disabled={printing}
        onPress={async () => {
          const targetIp = selectedIP || ip;

          if (!file) {
            Alert.alert('Nenhum arquivo selecionado', 'Selecione uma imagem para imprimir');
            return;
          }

          if (!targetIp) {
            Alert.alert('IP não informado', 'Informe o IP da impressora antes de imprimir');
            return;
          }

          setPrinting(true);

          try {
            console.log('Printing image from URI:', file, 'to', targetIp);
            
            const result = await BrotherPrint.printImage({
              ipAddress: targetIp,
              imageUri: file,
              printerModel: PrinterModel.QL_820NWB,
              labelSize: LabelSize.DieCutW17H54,
            });
            
            console.log('Print result:', result);
            Alert.alert('Sucesso', result.message || 'Imagem enviada para impressão');
          } catch (error: any) {
            console.error('Failed to print image', error);
            Alert.alert('Erro ao imprimir', error.message || String(error));
          } finally {
            setPrinting(false);
          }
        }}
      />
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  TextInput: {
    height: 45,
    borderColor: '#DDDDDD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 8,
    backgroundColor: 'white',
  },
  selectedIP: {
    fontSize: 14,
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  fileStatus: {
    fontSize: 12,
    marginVertical: 8,
    textAlign: 'center',
    color: '#666',
  },
  loader: {
    marginVertical: 15,
  },
  divider: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#999',
  },
  printerListContainer: {
    marginVertical: 10,
    maxHeight: 200,
  },
  printerItem: {
    backgroundColor: 'white',
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  printerItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#E8F4FF',
  },
  printerModel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  printerIP: {
    fontSize: 14,
    color: '#666',
  },
  printerSerial: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default App;
