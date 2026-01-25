/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme,  } from 'react-native';
import {
  SafeAreaProvider,

} from 'react-native-safe-area-context';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { Provider as PaperProvider, MD3LightTheme, Appbar } from 'react-native-paper';
import MDIcon from './app/components/MDIcon';

// Improve memory usage and register native screen view managers
enableScreens();

import PrinterScreen from './app/screens/PrinterScreen';
import LoginScreen from './app/screens/LoginScreen';
import ResultScreen from './app/screens/ResultScreen';
import BilheteriaScreen from './app/screens/BilheteriaScreen';
import BilheteriaListScreen from './app/screens/BilheteriaListScreen';
import BilheteriaCreateEmitScreen from './app/screens/BilheteriaCreateEmitScreen';
import BilheteriaScanPrintScreen from './app/screens/BilheteriaScanPrintScreen';
import BilheteriaSearchPrintScreen from './app/screens/BilheteriaSearchPrintScreen';
import PortariaScreen from './app/screens/PortariaScreen';
import PortariaSearchScreen from './app/screens/PortariaSearchScreen';



function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

const Stack = createNativeStackNavigator();

function M3Header({ navigation, route, options, back }: any) {
  const title = options.title ?? route.name;
  return (
    <Appbar.Header>
      {back ? <Appbar.BackAction onPress={() => navigation.goBack()} /> : null}
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

function LoginWrapper({ navigation }: any) {
  return (
    <LoginScreen
      onGoToPrinter={() => navigation.navigate('Printer')}
      onLoginResult={(desc) => { navigation.navigate('Result', { desc }); }}
      onGoToBilheteria={() => navigation.navigate('Bilheteria')}
      onGoToPortaria={() => navigation.navigate('Portaria')}
    />
  );
}

function BilheteriaWrapper({ navigation }: any) {
  return <BilheteriaScreen onBack={() => navigation.goBack()} />;
}
function PortariaWrapper({ navigation }: any) {
  return <PortariaScreen onBack={() => navigation.goBack()} onOpenSearch={() => navigation.navigate('PortariaSearch')} />;
}
function PortariaSearchWrapper({ navigation }: any) {
  return <PortariaSearchScreen onBack={() => navigation.goBack()} />;
}

function BilheteriaListWrapper({ navigation }: any) {
  return <BilheteriaListScreen onBack={() => navigation.goBack()} />;
}
function BilheteriaCreateEmitWrapper({ navigation }: any) {
  return <BilheteriaCreateEmitScreen onBack={() => navigation.goBack()} />;
}
function BilheteriaScanPrintWrapper({ navigation }: any) {
  return <BilheteriaScanPrintScreen onBack={() => navigation.goBack()} />;
}
function BilheteriaSearchPrintWrapper({ navigation }: any) {
  return <BilheteriaSearchPrintScreen onBack={() => navigation.goBack()} />;
}
function PrinterWrapper({ navigation }: any) {
  return <PrinterScreen onGoToLogin={() => navigation.navigate('Login')} />;
}
function ResultWrapper({ route, navigation }: any) {
  const desc = route.params?.desc ?? '';
  return <ResultScreen description={desc} onBack={() => navigation.goBack()} />;
}

function AppContent() {
  return (
    <PaperProvider theme={MD3LightTheme} settings={{ icon: (props: any) => <MDIcon name={props.name} size={props.size ?? 24} color={props.color} /> }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ header: M3Header }}>
          <Stack.Screen name="Login" component={LoginWrapper} options={{ title: 'Login' }} />
          <Stack.Screen name="Bilheteria" component={BilheteriaWrapper} options={{ title: 'Bilheteria' }} />
          <Stack.Screen name="BilheteriaList" component={BilheteriaListWrapper} options={{ title: 'Lista de Participantes' }} />
          <Stack.Screen name="BilheteriaCreateEmit" component={BilheteriaCreateEmitWrapper} options={{ title: 'Emitir Ingresso' }} />
          <Stack.Screen name="BilheteriaScanPrint" component={BilheteriaScanPrintWrapper} options={{ title: 'Ler QR e Imprimir' }} />
          <Stack.Screen name="BilheteriaSearchPrint" component={BilheteriaSearchPrintWrapper} options={{ title: 'Buscar por CPF e Imprimir' }} />

          <Stack.Screen name="Portaria" component={PortariaWrapper} options={{ title: 'Portaria' }} />
          <Stack.Screen name="PortariaSearch" component={PortariaSearchWrapper} options={{ title: 'Pesquisa Portaria' }} />
          <Stack.Screen name="Printer" component={PrinterWrapper} options={{ title: 'Impressora' }} />
          <Stack.Screen name="Result" component={ResultWrapper} options={{ title: 'Resultado' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
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
  screenPadding: {
    padding: 20,
  },
  spacedButton: {
    marginTop: 18,
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
  loginCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  printerIcon: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'transparent',
  },
  envContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  envText: {
    fontSize: 12,
    marginRight: 4,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 32,
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
