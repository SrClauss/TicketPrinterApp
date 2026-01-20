#!/usr/bin/env python3
"""
Brother Printer Simulator
Simula uma impressora Brother QL-820NWB respondendo ao protocolo básico
"""

import socket
import sys
import os
from datetime import datetime

# Brother printer status response (simplificado)
# Formato: Status byte + informações adicionais
def create_status_response():
    """Cria uma resposta de status válida para impressora Brother"""
    # Status da impressora (bytes simulados)
    # Byte 0: Print head mark (0x80)
    # Byte 1: Size (0x20 = 32 bytes)
    # Byte 2: Brother code (0x42 = 'B')
    # Byte 3: Series code (0x30 = '0')
    # Byte 4: Model code (0x4F = 'O' para QL-820NWB)
    # Bytes 5-7: Reserved
    # Byte 8: Error information 1
    # Byte 9: Error information 2
    # Byte 10: Media width
    # Byte 11: Media type
    # Bytes 12-14: Reserved
    # Byte 15: Mode
    # Bytes 16-31: Reserved/Extended info
    
    status = bytearray([
        0x80,  # Header
        0x20,  # Status size (32 bytes)
        0x42,  # 'B' Brother
        0x30,  # Series '0'
        0x4F,  # Model 'O' (QL-820NWB)
        0x00, 0x00, 0x00,  # Reserved
        0x00,  # Error info 1: No error
        0x00,  # Error info 2: No error
        0x3A,  # Media width (62mm)
        0x0A,  # Media type: Die-cut label
        0x00, 0x00, 0x00,  # Reserved
        0x00,  # Mode: Ready
    ])
    
    # Padding até 32 bytes
    while len(status) < 32:
        status.append(0x00)
    
    return bytes(status)

def handle_client(client_socket, client_address):
    """Processa conexão do cliente (app Android)"""
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Connection from {client_address[0]}:{client_address[1]}")
    
    capture_dir = "printer-captures"
    os.makedirs(capture_dir, exist_ok=True)
    
    timestamp = int(datetime.now().timestamp() * 1000)
    capture_file = os.path.join(capture_dir, f"capture-{timestamp}.bin")
    
    total_bytes = 0
    buffer = bytearray()
    
    try:
        # Configurar socket para non-blocking com timeout curto
        client_socket.setblocking(False)
        client_socket.settimeout(0.5)
        
        # Enviar status de impressora pronta quando conecta
        print(f"  → Sending printer status (ready)")
        status = create_status_response()
        client_socket.send(status)
        print(f"  → Status sent: {len(status)} bytes")
        
        packet_count = 0
        idle_count = 0
        max_idle = 600  # 5 minutos com timeout de 0.5s
        
        while idle_count < max_idle:
            try:
                data = client_socket.recv(4096)
                if not data:
                    print(f"  ← Connection closed by client")
                    break
                
                packet_count += 1
                buffer.extend(data)
                total_bytes += len(data)
                idle_count = 0  # Reset idle counter
                
                # Log dos dados recebidos (mais detalhado)
                print(f"  ← Packet #{packet_count}: {len(data)} bytes (total: {total_bytes})")
                
                # Mostrar primeiros bytes em hex para debug
                if len(data) > 0:
                    hex_preview = ' '.join(f'{b:02X}' for b in data[:16])
                    print(f"     First bytes: {hex_preview}...")
                
                # Detectar comandos Brother específicos
                if len(data) >= 2:
                    # Comandos ESC (0x1B) são comuns em impressoras Brother
                    if data[0] == 0x1B:
                        cmd = data[1] if len(data) > 1 else 0x00
                        print(f"  → ESC command detected: 0x{cmd:02X}")
                        
                        # Responder a alguns comandos comuns
                        if cmd == 0x69:  # ESC i - Status information request
                            print(f"  → Responding to status request")
                            client_socket.send(status)
                        elif cmd == 0x40:  # ESC @ - Initialize
                            print(f"  → Printer initialized, sending ACK")
                            client_socket.send(status)
                    
                    # Invalidate command (0x00)
                    elif data[0] == 0x00:
                        print(f"  → Invalidate command, sending status")
                        client_socket.send(status)
                
                # A cada 8KB de dados, enviar status (simula feedback da impressora)
                if total_bytes > 0 and total_bytes % 8192 < len(data):
                    print(f"  → Sending intermediate status (at {total_bytes} bytes)")
                    client_socket.send(status)
                    
            except socket.timeout:
                idle_count += 1
                if idle_count % 20 == 0:  # Log a cada 10 segundos
                    print(f"  ... waiting for data ({idle_count * 0.5:.0f}s elapsed, {total_bytes} bytes received)")
                continue
            except socket.error as e:
                print(f"  ✗ Socket error: {e}")
                break
        
        if idle_count >= max_idle:
            print(f"  ✗ Timeout after {max_idle * 0.5:.0f}s")
        
        # Salvar dados capturados
        if total_bytes > 0:
            with open(capture_file, 'wb') as f:
                f.write(buffer)
            print(f"  ✓ Saved {total_bytes} bytes to {capture_file}")
            
            # Enviar status final de sucesso
            print(f"  → Sending final status (print completed)")
            try:
                client_socket.send(status)
            except:
                pass
        else:
            print(f"  ✗ No data received")
    
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            client_socket.close()
        except:
            pass
        print(f"  Connection closed. Total: {total_bytes} bytes\n")

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9100
    
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', port))
    server.listen(5)
    
    print(f"Brother Printer Simulator listening on 0.0.0.0:{port}")
    print(f"Simulating: Brother QL-820NWB")
    print(f"Press Ctrl+C to stop\n")
    
    try:
        while True:
            client_socket, client_address = server.accept()
            # Não definir timeout no accept, será configurado no handle_client
            handle_client(client_socket, client_address)
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    finally:
        server.close()

if __name__ == "__main__":
    main()
