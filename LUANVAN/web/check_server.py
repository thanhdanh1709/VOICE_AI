"""
Script đơn giản để kiểm tra xem Flask server có đang chạy không
"""
import socket

def check_port(host='localhost', port=5000):
    """Kiểm tra port có đang LISTENING không"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            print(f"[OK] Port {port} đang mở - Server đang chạy!")
            return True
        else:
            print(f"[ERROR] Port {port} không mở - Server KHÔNG chạy!")
            return False
    except Exception as e:
        print(f"[ERROR] Không thể kiểm tra port: {e}")
        return False

if __name__ == '__main__':
    check_port()
