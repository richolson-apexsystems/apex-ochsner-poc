# POC for Ochsner E-Sitter

## Uses Meteor, NodeJS, Blaze, Socket.IO, WebRTC, RTSP, RTP, FFMPEG and NGINX.

## Quick Start

On Linux/macOS/Windows, use this line:

## Development environment setup on Linux/macOS/Windows

After cloning the repository, install `npm` dependencies with `npm install`.

Run `./run.sh` within the application root to start the application on localhost:3000.

NOTE: The application relies on domain names as port proxies, rtsp.zenzig.com and hls.zenzig.com. 
The names can be changed to anything so long as they are distinct. rtsp.zenzig.com proxies the application 
on port 3000 and it's socket.io connection on port 8080. hls.zenzig.com provides a proxy for the rtsp server's hls 
port of 8888.


### FFMPEG

We use FFMPEG to recieve and relay RTSP streams so make sure it is available on the target system.

The POC relies on 'rtsp-simple-server' to convert rtsp feeds from cameras into HLS we show in the client.

### Docker

Download the docker image and launch it using the 'rtsp-simple-server.yml' file included in root of the POC:

```
docker run --rm -it --network=host -v $PWD/rtsp-simple-server.yml:/rtsp-simple-server.yml aler9/rtsp-simple-server
```





