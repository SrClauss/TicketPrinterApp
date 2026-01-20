package com.ticketprinter.brotherprint;

import android.net.Uri;
import android.os.AsyncTask;
import android.util.Log;

import androidx.annotation.NonNull;

import com.brother.sdk.lmprinter.Channel;
import com.brother.sdk.lmprinter.NetworkSearchOption;
import com.brother.sdk.lmprinter.OpenChannelError;
import com.brother.sdk.lmprinter.PrintError;
import com.brother.sdk.lmprinter.PrinterDriver;
import com.brother.sdk.lmprinter.PrinterDriverGenerateResult;
import com.brother.sdk.lmprinter.PrinterDriverGenerator;
import com.brother.sdk.lmprinter.PrinterModel;
import com.brother.sdk.lmprinter.PrinterSearcher;
import com.brother.sdk.lmprinter.setting.QLPrintSettings;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public class BrotherPrintModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BrotherPrintModule";
    private final ReactApplicationContext reactContext;

    public BrotherPrintModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "BrotherPrintModule";
    }

    @ReactMethod
    public void printImage(String ipAddress, String imageUri, String printerModel, String labelSize, Promise promise) {
        AsyncTask.execute(() -> {
            try {
                Log.d(TAG, "=== STARTING PRINT JOB ===");
                Log.d(TAG, "IP: " + ipAddress + ", URI: " + imageUri);
                
                // Convert content:// URI to file path if needed
                String filePath = getFilePathFromUri(imageUri);
                if (filePath == null) {
                    Log.e(TAG, "Failed to resolve file path from URI: " + imageUri);
                    promise.reject("FILE_ERROR", "Could not resolve file path from URI: " + imageUri);
                    return;
                }
                
                Log.d(TAG, "Resolved file path: " + filePath);
                
                // Check if file exists and get size
                File imageFile = new File(filePath);
                if (!imageFile.exists()) {
                    Log.e(TAG, "File does not exist: " + filePath);
                    promise.reject("FILE_ERROR", "Image file does not exist: " + filePath);
                    return;
                }
                Log.d(TAG, "File exists, size: " + imageFile.length() + " bytes");

                // Create Wi-Fi channel
                Log.d(TAG, "Creating Wi-Fi channel to: " + ipAddress);
                Channel channel = Channel.newWifiChannel(ipAddress);
                Log.d(TAG, "Wi-Fi channel created successfully");

                // Open channel
                Log.d(TAG, "Opening channel...");
                PrinterDriverGenerateResult result = PrinterDriverGenerator.openChannel(channel);
                if (result.getError().getCode() != OpenChannelError.ErrorCode.NoError) {
                    Log.e(TAG, "Failed to open channel: " + result.getError().getCode());
                    promise.reject("CHANNEL_ERROR", "Failed to open channel: " + result.getError().getCode());
                    return;
                }

                Log.d(TAG, "Channel opened successfully");
                PrinterDriver printerDriver = result.getDriver();

                // Configure print settings
                PrinterModel model = parsePrinterModel(printerModel);
                QLPrintSettings printSettings = new QLPrintSettings(model);
                
                // Set label size
                QLPrintSettings.LabelSize size = parseLabelSize(labelSize);
                if (size != null) {
                    printSettings.setLabelSize(size);
                }
                
                // Set work path for temporary files
                printSettings.setWorkPath(reactContext.getCacheDir().getAbsolutePath());
                
                Log.d(TAG, "Print settings configured - Model: " + model + ", Label: " + size + ", WorkPath: " + reactContext.getCacheDir().getAbsolutePath());

                // Print the image with timeout
                Log.d(TAG, "Starting print operation with 30s timeout...");
                
                final PrinterDriver finalDriver = printerDriver;
                final String finalPath = filePath;
                final QLPrintSettings finalSettings = printSettings;
                
                ExecutorService executor = Executors.newSingleThreadExecutor();
                Future<PrintError> future = executor.submit(new Callable<PrintError>() {
                    @Override
                    public PrintError call() {
                        return finalDriver.printImage(finalPath, finalSettings);
                    }
                });
                
                PrintError printError;
                try {
                    // Timeout de 30 segundos para a operação de impressão
                    printError = future.get(30, TimeUnit.SECONDS);
                    Log.d(TAG, "Print operation completed, error code: " + printError.getCode());
                } catch (TimeoutException e) {
                    Log.e(TAG, "Print operation timed out after 30 seconds");
                    future.cancel(true);
                    executor.shutdownNow();
                    printerDriver.closeChannel();
                    promise.reject("TIMEOUT", "Print operation timed out after 30 seconds. This may indicate the printer is not responding correctly or is not a real Brother printer.");
                    return;
                } catch (Exception e) {
                    Log.e(TAG, "Print operation exception: " + e.getMessage());
                    executor.shutdownNow();
                    printerDriver.closeChannel();
                    promise.reject("EXCEPTION", "Print operation failed: " + e.getMessage(), e);
                    return;
                }
                
                executor.shutdown();

                // Close the channel
                Log.d(TAG, "Closing channel...");
                printerDriver.closeChannel();
                Log.d(TAG, "Channel closed");

                // Check result
                if (printError.getCode() == PrintError.ErrorCode.NoError) {
                    Log.d(TAG, "Print successful!");
                    WritableMap resultMap = new WritableNativeMap();
                    resultMap.putString("status", "success");
                    resultMap.putString("message", "Print job completed successfully");
                    promise.resolve(resultMap);
                } else {
                    Log.e(TAG, "Print failed with error: " + printError.getCode());
                    promise.reject("PRINT_ERROR", "Print failed: " + printError.getCode());
                }

            } catch (Exception e) {
                Log.e(TAG, "Exception during print", e);
                promise.reject("EXCEPTION", "Print exception: " + e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void discoverPrinters(int timeoutSeconds, Promise promise) {
        AsyncTask.execute(() -> {
            try {
                Log.d(TAG, "Starting printer discovery for " + timeoutSeconds + " seconds");
                
                WritableArray printerArray = new WritableNativeArray();
                NetworkSearchOption option = new NetworkSearchOption(timeoutSeconds, false);
                
                com.brother.sdk.lmprinter.PrinterSearchResult searchResult = 
                    PrinterSearcher.startNetworkSearch(reactContext, option, (Channel channel) -> {
                        try {
                            WritableMap printerMap = new WritableNativeMap();
                            
                            // Get IP address
                            String ipAddress = channel.getChannelInfo();
                            printerMap.putString("ipAddress", ipAddress);
                            
                            // Get model name
                            String modelName = channel.getExtraInfo().get(Channel.ExtraInfoKey.ModelName);
                            if (modelName != null) {
                                printerMap.putString("modelName", modelName);
                            }
                            
                            printerArray.pushMap(printerMap);
                            Log.d(TAG, "Found printer: " + modelName + " at " + ipAddress);
                        } catch (Exception e) {
                            Log.e(TAG, "Error processing discovered printer", e);
                        }
                    });
                
                // Wait for search to complete
                if (searchResult.getError().getCode() == 
                    com.brother.sdk.lmprinter.PrinterSearchError.ErrorCode.NoError) {
                    Log.d(TAG, "Printer discovery completed successfully");
                    promise.resolve(printerArray);
                } else {
                    Log.e(TAG, "Printer discovery error: " + searchResult.getError().getCode());
                    promise.reject("DISCOVERY_ERROR", "Failed to discover printers: " + 
                        searchResult.getError().getCode());
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Exception during discovery", e);
                promise.reject("EXCEPTION", "Discovery exception: " + e.getMessage(), e);
            }
        });
    }

    @ReactMethod
    public void pingPrinter(String ipAddress, Promise promise) {
        AsyncTask.execute(() -> {
            try {
                Log.d(TAG, "Pinging printer at: " + ipAddress);
                
                Channel channel = Channel.newWifiChannel(ipAddress);
                PrinterDriverGenerateResult result = PrinterDriverGenerator.openChannel(channel);
                
                if (result.getError().getCode() == OpenChannelError.ErrorCode.NoError) {
                    result.getDriver().closeChannel();
                    Log.d(TAG, "Ping successful");
                    
                    WritableMap resultMap = new WritableNativeMap();
                    resultMap.putBoolean("available", true);
                    resultMap.putString("ipAddress", ipAddress);
                    promise.resolve(resultMap);
                } else {
                    Log.d(TAG, "Ping failed: " + result.getError().getCode());
                    
                    WritableMap resultMap = new WritableNativeMap();
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", result.getError().getCode().toString());
                    promise.resolve(resultMap);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Exception during ping", e);
                promise.reject("EXCEPTION", "Ping exception: " + e.getMessage(), e);
            }
        });
    }

    private String getFilePathFromUri(String uriString) {
        try {
            Log.d(TAG, "Converting URI to file path: " + uriString);
            Uri uri = Uri.parse(uriString);
            
            // If it's already a file path, return it
            if (uri.getScheme() == null || uri.getScheme().equals("file")) {
                Log.d(TAG, "URI is already a file path: " + uri.getPath());
                return uri.getPath();
            }
            
            // If it's a content:// URI, copy to cache
            if (uri.getScheme().equals("content")) {
                Log.d(TAG, "URI is content://, copying to cache...");
                InputStream inputStream = reactContext.getContentResolver().openInputStream(uri);
                if (inputStream == null) {
                    Log.e(TAG, "Could not open input stream for URI: " + uriString);
                    return null;
                }
                
                // Create temp file in cache
                File tempFile = new File(reactContext.getCacheDir(), "temp_print_image.jpg");
                Log.d(TAG, "Creating temp file: " + tempFile.getAbsolutePath());
                FileOutputStream outputStream = new FileOutputStream(tempFile);
                
                byte[] buffer = new byte[4096];
                int bytesRead;
                int totalBytes = 0;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytes += bytesRead;
                }
                
                inputStream.close();
                outputStream.close();
                
                Log.d(TAG, "File copied successfully, size: " + totalBytes + " bytes");
                return tempFile.getAbsolutePath();
            }
            
            Log.w(TAG, "Unsupported URI scheme: " + uri.getScheme());
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Error converting URI to file path", e);
            return null;
        }
    }

    private PrinterModel parsePrinterModel(String modelString) {
        if (modelString == null || modelString.isEmpty()) {
            return PrinterModel.QL_820NWB; // Default
        }
        
        try {
            return PrinterModel.valueOf(modelString);
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Unknown printer model: " + modelString + ", using default");
            return PrinterModel.QL_820NWB;
        }
    }

    private QLPrintSettings.LabelSize parseLabelSize(String sizeString) {
        if (sizeString == null || sizeString.isEmpty()) {
            return QLPrintSettings.LabelSize.DieCutW17H54; // Default
        }
        
        try {
            return QLPrintSettings.LabelSize.valueOf(sizeString);
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Unknown label size: " + sizeString + ", using default");
            return QLPrintSettings.LabelSize.DieCutW17H54;
        }
    }
}
