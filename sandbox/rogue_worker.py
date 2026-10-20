#!/usr/bin/env python3
import socket
import time

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(('127.0.0.1', 8888))
    s.listen(5)
    print("Rogue worker listening on port 8888...")
    while True:
        time.sleep(1)
except Exception as e:
    print(f"Error: {e}")
