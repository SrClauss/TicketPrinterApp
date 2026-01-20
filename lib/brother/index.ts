import { NativeModules } from 'react-native';

export interface DiscoveredPrinter {
  ipAddress: string;
  modelName?: string;
  serialNumber?: string;
}

interface BrotherPrintModuleInterface {
  printImage(
    ipAddress: string,
    imageUri: string,
    printerModel: string,
    labelSize: string
  ): Promise<{ status: string; message: string }>;
  
  pingPrinter(
    ipAddress: string
  ): Promise<{ available: boolean; ipAddress?: string; error?: string }>;
  
  discoverPrinters(
    timeoutSeconds: number
  ): Promise<DiscoveredPrinter[]>;
}

const { BrotherPrintModule } = NativeModules;

if (!BrotherPrintModule) {
  throw new Error('BrotherPrintModule not found. Make sure the native module is properly linked.');
}

export enum PrinterModel {
  QL_820NWB = 'QL_820NWB',
  QL_810W = 'QL_810W',
  QL_800 = 'QL_800',
  QL_1110NWB = 'QL_1110NWB',
  QL_1100 = 'QL_1100',
}

export enum LabelSize {
  DieCutW17H54 = 'DieCutW17H54',
  DieCutW17H87 = 'DieCutW17H87',
  DieCutW23H23 = 'DieCutW23H23',
  DieCutW29H42 = 'DieCutW29H42',
  DieCutW29H90 = 'DieCutW29H90',
  DieCutW38H90 = 'DieCutW38H90',
  DieCutW39H48 = 'DieCutW39H48',
  DieCutW52H29 = 'DieCutW52H29',
  DieCutW62H29 = 'DieCutW62H29',
  DieCutW62H100 = 'DieCutW62H100',
  DieCutW60H86 = 'DieCutW60H86',
  DieCutW54H29 = 'DieCutW54H29',
  DieCutW102H51 = 'DieCutW102H51',
  DieCutW102H152 = 'DieCutW102H152',
  DieCutW103H164 = 'DieCutW103H164',
  RollW12 = 'RollW12',
  RollW29 = 'RollW29',
  RollW38 = 'RollW38',
  RollW50 = 'RollW50',
  RollW54 = 'RollW54',
  RollW62 = 'RollW62',
  RollW62RB = 'RollW62RB',
  RollW102 = 'RollW102',
  RollW103 = 'RollW103',
 
}

export interface PrintOptions {
  ipAddress: string;
  imageUri: string;
  printerModel?: PrinterModel;
  labelSize?: LabelSize;
}

export const BrotherPrint = {
  /**
   * Print an image to a Brother printer over Wi-Fi
   * @param options Print configuration options
   * @returns Promise with print result
   */
  async printImage(options: PrintOptions): Promise<{ status: string; message: string }> {
    const {
      ipAddress,
      imageUri,
      printerModel = PrinterModel.QL_820NWB,
      labelSize = LabelSize.DieCutW17H54,
    } = options;

    return (BrotherPrintModule as BrotherPrintModuleInterface).printImage(
      ipAddress,
      imageUri,
      printerModel,
      labelSize
    );
  },

  /**
   * Check if a printer is available at the specified IP address
   * @param ipAddress IP address of the printer
   * @returns Promise with availability status
   */
  async pingPrinter(ipAddress: string): Promise<{ available: boolean; ipAddress?: string; error?: string }> {
    return (BrotherPrintModule as BrotherPrintModuleInterface).pingPrinter(ipAddress);
  },

  /**
   * Discover Brother printers on the local network
   * @param timeoutSeconds Search duration in seconds (default: 15)
   * @returns Promise with array of discovered printers
   */
  async discoverPrinters(timeoutSeconds: number = 15): Promise<DiscoveredPrinter[]> {
    return (BrotherPrintModule as BrotherPrintModuleInterface).discoverPrinters(timeoutSeconds);
  },
};

export default BrotherPrint;
