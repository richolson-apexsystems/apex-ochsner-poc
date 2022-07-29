#!/usr/bin/env python3
import pycurl
import random
import os.path
import time
import sys
import socket
import select
from urllib.parse import urlparse
from pathlib import Path
from rtp import *
import subprocess

DEBUG = False
TRANSPORT_TCP = True
FRAMES_PER_PACKET = 800

PORT_F = 1234
PORT_T = PORT_F + 1

FILENAME_SDP = str(Path(__file__).resolve().parent)+"/file_tmp.sdp"

USER_AGENT = 'RTSP-Backchannel-TCP/1.0'

if TRANSPORT_TCP:
    transport = "RTP/AVP/TCP;unicast;interleaved=0-1"
else:
    # UDP #
    transport = "RTP/AVP;unicast;client_port={}-{}".format(PORT_F, PORT_T)


class Storage:
    def __init__(self):
        self.contents = []
        self.line = 0

    def store(self, buf):
        #print(f"H: [{buf.decode().strip()}]")
        if len(buf.decode().strip()) > 0:
            #print(f"H: [{buf.decode().strip()}]")
            self.line += 1
            #self.contents = "%s%i: %s" % (self.contents, self.line, buf.decode())
            self.contents.append(buf.decode().strip())

    def __str__(self):
        return str(self.contents)


class file_sdp(object):
    def __init__(self, name, type):
        self.name = name
        self.type = type

    def get_file_sdp(self):
        self.file_sdp = open(self.name, self.type)
        return self.file_sdp


class RTPStream():
    """
    Streams PCM audio over RTP to a list of recipients
    """

    def __init__(self):
        self.ssrc = random.randint(0, 2**32 - 1)
        # initial value + number of frames sent
        self.sequence_number = random.randint(0, 2**16 - 1)
        self.timestamp = random.randint(0, 2**32 - 1)
        self.counter = 0  # number of frames sent

    def encode(self, stream_data):
        print("Started RTP streaming")

        packet = RTPPacket()  # We'll reuse this for efficiency.
        self.starttime = time.time()

        # rtp timing
        next_packet = self.starttime + float(self.counter) / 8000.0
        delay = max(0.0, next_packet - time.time())
        # time.sleep(delay)

        # check for any incoming rtcp messages
        #ready_in, _, _ = select.select([self.rtp_socket], [], [], 0)
        # if self.rtp_socket in ready_in:
        #	data = self.rtcp_socket.recvfrom(1500)
        #	print("Received RTCP packet:", data)

        # create rtp packet and send it to all recipients
        packet.ssrc = self.ssrc
        packet.timestamp = self.timestamp
        packet.sequence_number = self.sequence_number
        packet.payload_type = PAYLOAD_MULAW
        packet.payload = stream_data

        rtp_payload = packet.serialize()

        # increment counters for next packet
        self.counter += FRAMES_PER_PACKET
        self.timestamp += FRAMES_PER_PACKET
        self.sequence_number += 1
        print(
            f"Counter:{self.counter} len:{len(stream_data)} left:{len(stream_data) - self.counter}")

        return rtp_payload


class Rtsp_Curl(object):
    def __init__(self):
        pass

    def init(self, url, user_pwd):
        self.curl = pycurl.Curl()
        self.url = url
        self.user_pwd = user_pwd
        self.transport = transport
        self.pipe = None
        if DEBUG:
            self.curl.setopt(pycurl.VERBOSE, 1)
            self.curl.setopt(pycurl.NOPROGRESS, 1)
        self.curl.setopt(pycurl.USERAGENT, USER_AGENT)
        self.curl.setopt(pycurl.TCP_NODELAY, 0)
        self.curl.setopt(pycurl.URL, self.url)
        self.curl.setopt(pycurl.OPT_RTSP_STREAM_URI, self.url)

    def auth(self):
        self.curl.setopt(pycurl.USERPWD, self.user_pwd)
        self.curl.setopt(pycurl.HTTPAUTH, pycurl.HTTPAUTH_DIGEST)
        self.curl.perform()

    def rtsp_describe(self):
        retrieved_body = Storage()
        retrieved_headers = Storage()
        header = ["Require: www.onvif.org/ver20/backchannel"]
        self.curl.setopt(pycurl.HTTPHEADER, header)
        self.filename_sdp = file_sdp(FILENAME_SDP, "w+").get_file_sdp()
        self.curl.setopt(pycurl.WRITEFUNCTION, self.get_sdp_filename)
        self.curl.setopt(pycurl.OPT_RTSP_REQUEST, pycurl.RTSPREQ_DESCRIBE)
        #self.curl.setopt(pycurl.WRITEFUNCTION, retrieved_body.store)
        #self.curl.setopt(pycurl.HEADERFUNCTION, retrieved_headers.store)
        self.curl.perform()
        # print(retrieved_body)
        # print(retrieved_headers)

    def rtsp_options(self):
        self.curl.setopt(pycurl.OPT_RTSP_REQUEST, pycurl.RTSPREQ_OPTIONS)
        try:
            self.curl.perform()
            return True
        except:
            return False

    def rtsp_setup(self, control):
        port = None
        global PORT_F, PORT_T
        if control.startswith('rtsp://'):
            uri = control
        else:
            uri = self.url + '/%s' % control

        retrieved_body = Storage()
        retrieved_headers = Storage()
        header = ["Require: www.onvif.org/ver20/backchannel"]
        self.curl.setopt(pycurl.HTTPHEADER, header)
        self.curl.setopt(pycurl.OPT_RTSP_STREAM_URI, uri)
        self.curl.setopt(pycurl.OPT_RTSP_REQUEST, pycurl.RTSPREQ_SETUP)
        self.curl.setopt(pycurl.OPT_RTSP_TRANSPORT, self.transport)
        self.curl.setopt(pycurl.WRITEFUNCTION, retrieved_body.store)
        self.curl.setopt(pycurl.HEADERFUNCTION, retrieved_headers.store)
        self.curl.perform()
        # print(retrieved_body)
        #print("--- SETUP GOT HEADERS ---")
        # print(retrieved_headers)

        # Parse the headers to get the ports
        for x in retrieved_headers.contents:
            key = value = None
            if ':' in x:
                (key, value) = x.split(':', 1)
                value = value.strip()
                if key == "Transport":
                    transports = value.split(';')
                    for t in transports:
                        if t.startswith("server_port="):
                            port = t.split('=', 1)[1]
                            if '-' in port:
                                ports = port.split('-', 1)
                                PORT_F = int(ports[0])
                                PORT_T = int(ports[1])
                            else:
                                PORT_F = int(port)
                                PORT_T = int(port)+1
                                ports = port
        if port:
            print(f"RTP TRANSPORT PORT == {PORT_F}")
        #print("--- SETUP END HEADERS ---")

    def rtsp_play(self, url, pipe=None):
        retrieved_headers = Storage()
        self.curl.setopt(pycurl.OPT_RTSP_STREAM_URI, url)
        self.curl.setopt(pycurl.RANGE, 'npt=0.000-')
        self.curl.setopt(pycurl.OPT_RTSP_REQUEST, pycurl.RTSPREQ_PLAY)
        self.curl.setopt(pycurl.HEADERFUNCTION, retrieved_headers.store)

        self.curl.perform()
        if len(retrieved_headers.contents) > 0:
            try:
                (proto, status, msg) = retrieved_headers.contents[0].split(
                    ' ', 2)
                #print(f"H: {status}")
                if int(status) != 200:
                    return False
            except:
                return False
        return True

    def rtsp_getsocket(self):
        # print("rtsp_getsocket...")
        return self.curl.getinfo(pycurl.LASTSOCKET)

    def rtsp_teardown(self):
        self.curl.setopt(pycurl.OPT_RTSP_REQUEST, pycurl.RTSPREQ_TEARDOWN)
        self.curl.perform()

    def rtsp_curl_close(self):
        self.curl.close()

    def get_media_control_attribute(self):
        send_flag = False
        control = None
        while not os.path.exists(FILENAME_SDP):
            time.sleep(1)
        if os.path.isfile(FILENAME_SDP):
            last_control = None
            self.filename_sdp = file_sdp(FILENAME_SDP, "r").get_file_sdp()
            for x in self.filename_sdp:
                (stype, sval) = x.split('=', 1)

                if stype == 'a':
                    #print(f"T {stype} === {sval}")
                    if sval.strip() == 'sendonly':
                        send_flag = True
                        print("BACKCHANNEL SENDONLY CONTROL FOUND")
                    if sval.startswith('control'):
                        headers = sval.split(':', 1)
                        #print(f"H {stype} : {headers}")
                        if len(headers) >= 2 and headers[0] == 'control':
                            last_control = headers[1].strip()
                            #print(f"CONTROL {last_control}")
            if send_flag and last_control != None:
                control = last_control
                print(f"SELECTED CONTROL {control}")
            self.filename_sdp.close()
            return control
        else:
            raise ValueError("%s isn't a file!" % FILENAME_SDP)

    def get_sdp_filename(self, sdp_filename):
        # print(sdp_filename.decode("utf-8"))
        self.filename_sdp.write(sdp_filename.decode("utf-8"))
        self.filename_sdp.close()


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(
            f"USAGE: {sys.argv[0]} audiofile.ogg rtsp://192.168.1.100:554/test.mp4&t=unicast&p=udp&ve=H264&w=1920&h=1080&ae=PCMU&sr=8000")
        audiofile = "audio.ogg"
        url = 'rtsp://192.168.1.100:554/profile2/media.smp'
        print(f"Using default url: {url}")
        # exit()
    else:
        audiofile = sys.argv[1]
        url = sys.argv[2]

    #url = 'rtsp://192.168.1.100:554/profile2/media.smp'
    # FIXME: Need to get authentication from url... rtsp://user:pass@xx.xx.xx.xx:nn/zzzzz/zzzzz
    fqdn = urlparse(url).netloc
    # fqdn = '192.168.1.100:554
    if ':' in fqdn:
        (camera_ip, camera_port) = fqdn.split(':', 1)
    else:
        camera_ip = fqdn
        camera_port = 554

    rtsp = Rtsp_Curl()
    # FIXME Use credentials from URL
    rtsp.init(url, 'admin:1070Ma1trix')
    if rtsp.rtsp_options() == False:
        print(f"Unable to connect to {fqdn}")
        exit(-1)

    rtsp.auth()
    rtsp.rtsp_describe()
    control = rtsp.get_media_control_attribute()
    rtsp.rtsp_setup(control)
    # print(PORT_F)

    # ffmpeg -re -i ../audio.wav -acodec pcm_mulaw -f mulaw -ac 1 -ar 8000 -f rtp -rtsp_transport tcp rtp://192.168.1.20:**41258**
    cmd_out = ['ffmpeg',
               '-loglevel', 'warning',
                            '-hide_banner', '-nostats',
                            '-re',  # (optional) output realtime
                            '-i', '-',  # The input comes from a pipe
                            #'-filter-complex', "\'[0:0][1:0]concat=n=2:v=0:a=1[out]\'",
                            #'-map', "\'[out]\'",
                            '-acodec', 'pcm_mulaw',
                            '-f', 'mulaw',
                            '-ac', '1',
                            '-ar', '8000']

    if TRANSPORT_TCP:
        print("Using TCP TRANSPORT (RTP over RTSP)")
        cmd_out.append(f'-f')
        cmd_out.append(f'wav')
        cmd_out.append('-')
    else:
        # FIXME: Add these for UDP
        #'-f', 'rtp',
        #'-sdp_file', '-',
        # '-packetsize', '172']
        cmd_out.append(f'-f')
        cmd_out.append(f'rtp')
        cmd_out.append(f'rtp://{camera_ip}:{PORT_F}')

        # f'rtp://192.168.2.150:{PORT_F}']

    print(f"FFMPEG CMD: {' '.join(cmd_out)}")
    pipe = subprocess.Popen(
        cmd_out, stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    # Initiate the rtsp play command
    if not rtsp.rtsp_play(control):
        print("Failed to play stream, retry later")
        exit(-1)

    sockfd = rtsp.rtsp_getsocket()
    #print(f"socket = {sockfd}")

    chunk = 0
    with open(audiofile, "rb") as file:
        packet = [1]
        audiodata = file.read()
        print(f"Got audiodata len={len(audiodata)}")
        x = pipe.stdin.write(audiodata)
        print(f"Wrote {x} bytes to FFMPEG")
        pipe.stdin.close()

        stream = RTPStream()
        #os.write(sockfd, b'\r')

        while len(packet):
            #print("Reading from pipe...")
            packet = pipe.stdout.read(FRAMES_PER_PACKET)
            #print("wavelen = ", len(packet))

            if TRANSPORT_TCP:
                rtppacket = stream.encode(packet)
                # We only support interleaved packets on channel 0,1 (rtp, rtcp respectively)
                zero = b'\x00'
                # rtppacket length is 2 bytes MSB (big endian)
                plen = len(rtppacket).to_bytes(2, 'big')
                # ONVIF encoded packet |-HDR-|-INTERLEAVE ID-|-RTP LEN-|-RTP PAYLOAD-----|
                #                      | '$' | 0 / 1         | 80 00   | XXXXXXXXXXXXX.. |

                spacket = b'$' + zero + plen + rtppacket
                #print(f"packet = {len(spacket)}: {str(spacket[0:40])}")
                os.write(sockfd, spacket)

                # check for any incoming rtcp messages (We ignore these, sorry)
                ready_in, _, _ = select.select([sockfd], [], [], 0)
                if sockfd in ready_in:
                    rdata = os.read(sockfd, 1500)
                    #print("Received RTCP packet:", rdata)
                    #print(f"reply({len(rdata)}) = {rdata}")

        # Terminate the RTP TCP stream
        if TRANSPORT_TCP:
            os.write(sockfd, b'\n')

    pipe.stdin.close()
    # pipe.wait()
    #packet = os.read(sockfd)
    #print(f"recieved {packet}")

    #tmp = input("Press enter to end")
    #subprocess.call('ffplay -i ' + FILENAME_SDP)
    if not TRANSPORT_TCP:
        rtsp.rtsp_teardown()
    rtsp.rtsp_curl_close()
