# this is a python socket.io server used to test

import eventlet
import socketio
import logging
from random import randrange
import subprocess
import asyncio

# sio = socketio.Server(cors_allowed_origins="*",
#                     async_mode='eventlet', ssl_verify=False)

sio = socketio.Server(cors_allowed_origins=["http://192.168.100.111:3000", "http://localhost:3000", "*"],
                      async_mode='eventlet', ssl_verify=False)

app = socketio.WSGIApp(sio)


@sio.on('audioMessage')
def audio_message(sid, data):
    print(f"Got sid={sid}, audio data=[{data[1:40]}]")

    with open("audio.ogg", "wb") as file:
        file.write(data)

    subprocess.call([
        './rtsp-backchannel-tcp.py',
        'audio.ogg',
        'rtsp://192.168.1.100/profile1/media.smp'])
    sio.emit('success', True, to=sid)


@sio.on('connect')
def connect(sid, environ):
    sio.emit('connected')
    # print("connect", sid)


eventlet.wsgi.server(eventlet.listen(('172.24.57.213', 8080)), app)
