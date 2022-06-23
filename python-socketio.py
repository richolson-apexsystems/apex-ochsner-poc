# this is a python socket.io server used to test

import eventlet
import socketio
import logging
from random import randrange

sio = socketio.Server(cors_allowed_origins="*", async_mode='eventlet', ssl_verify=False)
app = socketio.WSGIApp(sio)    

def ping_in_intervals():
    while True:
        data = randrange(3)
        sio.sleep(2)
        sio.emit('pytest', data) 
        print(data)


@sio.on('ping')
def ping(*args):
    sio.emit('pong')
    print('recieved ping, sent pong') 
    
@sio.on('connect', namespace='/chat')
def connect(sid, environ):
    print("connect", sid)    
    
thread = sio.start_background_task(ping_in_intervals)
eventlet.wsgi.server(eventlet.listen(('localhost', 8080)), app)