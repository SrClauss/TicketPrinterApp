/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, TextInput, TouchableOpacity, useColorScheme, View, ActivityIndicator, Alert, Modal, ScrollView, Pressable } from 'react-native';
import {
  SafeAreaProvider,

} from 'react-native-safe-area-context';
import { Text, Button } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrotherPrint, { PrinterModel, LabelSize, DiscoveredPrinter } from './lib/brother';
import PrinterScreen from './app/screens/PrinterScreen';
import LoginScreen from './app/screens/LoginScreen';
import ResultScreen from './app/screens/ResultScreen';

const labelSizeDescriptions: Record<LabelSize, string> = {
  [LabelSize.DieCutW17H54]: '17mm x 54mm (Die Cut)',
  [LabelSize.DieCutW17H87]: '17mm x 87mm (Die Cut)',
  [LabelSize.DieCutW23H23]: '23mm x 23mm (Die Cut)',
  [LabelSize.DieCutW29H42]: '29mm x 42mm (Die Cut)',
  [LabelSize.DieCutW29H90]: '29mm x 90mm (Die Cut)',
  [LabelSize.DieCutW38H90]: '38mm x 90mm (Die Cut)',
  [LabelSize.DieCutW39H48]: '39mm x 48mm (Die Cut)',
  [LabelSize.DieCutW52H29]: '52mm x 29mm (Die Cut)',
  [LabelSize.DieCutW62H29]: '62mm x 29mm (Die Cut)',
  [LabelSize.DieCutW62H100]: '62mm x 100mm (Die Cut)',
  [LabelSize.DieCutW60H86]: '60mm x 86mm (Die Cut)',
  [LabelSize.DieCutW54H29]: '54mm x 29mm (Die Cut)',
  [LabelSize.DieCutW102H51]: '102mm x 51mm (Die Cut)',
  [LabelSize.DieCutW102H152]: '102mm x 152mm (Die Cut)',
  [LabelSize.DieCutW103H164]: '103mm x 164mm (Die Cut)',
  [LabelSize.RollW12]: '12mm (Roll)',
  [LabelSize.RollW29]: '29mm (Roll)',
  [LabelSize.RollW38]: '38mm (Roll)',
  [LabelSize.RollW50]: '50mm (Roll)',
  [LabelSize.RollW54]: '54mm (Roll)',
  [LabelSize.RollW62]: '62mm (Roll)',
  [LabelSize.RollW62RB]: '62mm RB (Roll)',
  [LabelSize.RollW102]: '102mm (Roll)',
  [LabelSize.RollW103]: '103mm (Roll)',
};

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
  const [screen, setScreen] = useState<'printer' | 'login' | 'result'>('login');
  const [loginResultDesc, setLoginResultDesc] = useState<string>('');

  return (
    <>
      {screen === 'printer' && <PrinterScreen onGoToLogin={() => setScreen('login')} />}
      {screen === 'login' && <LoginScreen onGoToPrinter={() => setScreen('printer')} onLoginResult={(desc) => { setLoginResultDesc(desc); setScreen('result'); }} />}
      {screen === 'result' && <ResultScreen description={loginResultDesc} onBack={() => setScreen('login')} />}
    </>
  );
}

export const styles = StyleSheet.create({
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#bebebe',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#374151',
    letterSpacing: 1,
    marginTop: 4,
  },
  headerSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  neuContainer: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#ffffff',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  neuInset: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#bebebe',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  neuButton: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#bebebe',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  tokenInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    color: '#1f2937',
  },
  smallText: {
    color: '#6b7280',
  },
});

export default App;
