"""
RTP packet serialization functionality
"""

from ctypes import * # http://docs.python.org/2/library/ctypes.html
import struct

VERSION = 2
PAYLOAD_MULAW = 0 # http://www.iana.org/assignments/rtp-parameters/rtp-parameters.xml
PAYLOAD_ALAW = 8 # see above

def bitmask(num_bits):
	return 2**num_bits - 1

class RTPPacket(object):
	"""RTP packet, in python-readable form"""

	def __init__(self, data = None):
		# Empty RTP packet
		if not data:
			self.version = 2
			self.padding = 0
			self.extension = 0
			# self.csrc_count = 0 # len(csrcs)
			self.marker = 0
			self.payload_type = 0
			self.sequence_number = 0
			self.timestamp = 0
			self.ssrc_identifier = 0
			self.csrc_identifiers = []
			self.payload = ""
		# Parsed from data.
		else:
			self.parse(data)

	def parse(self, data):
		if len(data) < 12:
			raise Exception("RTP packet is too short (Shorter than minimum header length)")

		# Bitfields in the front
		vpxcc, mpt = struct.unpack("!BB", data[0:2])
		version = vpxcc >> 6 & bitmask(2)
		if version != 2:
			raise Exception("Version is not 2")
		self.version = version
		self.padding = vpxcc >> 5 & bitmask(1)
		self.extension = vpxcc >> 4 & bitmask(1)
		csrc_count = vpxcc & bitmask(4) # not stored. len(csrc_identifiers) is used to avoid duplication
		self.marker = mpt >> 7 & bitmask(1)
		self.payload_type = mpt & bitmask(7)

		# rest of the fields
		self.sequence_number = struct.unpack("!H", data[2:4]) 
		self.timestamp = struct.unpack("!I", data[4:8])
		self.ssrc_identifier = struct.unpack("!I", data[8:12])
		self.csrc_identifiers = []
		if len(data) < 4 * csrc_count:
			raise Exception("RTP packet is too short (Not enough CSRCs)")
		for i in xrange(csrc_count):
			self.csrc_identifiers.append(struct.unpack("!I", data[12 + i * 4, 16 + i * 4]))
		self.payload = data[12 + 4 * csrc_count :]
		#print "ver", self.version,
		#print "pad", self.padding,
		#print "ext", self.extension,
		#print "ccs", csrc_count,
		#print "mrk", self.marker,
		#print "pty", self.payload_type,
		#print "seq", self.sequence_number,
		#print "time", self.timestamp,
		#print "ssrc", self.ssrc_identifier,
		#print "csrc", self.csrc_identifiers

	def serialize(self):
		vpxcc  = (self.version & bitmask(2)) << 6
		vpxcc += (self.padding & bitmask(1)) << 5
		vpxcc += (self.extension & bitmask(1)) << 4
		vpxcc += len(self.csrc_identifiers) & bitmask(4)

		mpt  = (self.marker & bitmask(1)) << 7
		mpt += (self.payload_type & bitmask(7))

		buf  = struct.pack("!B", vpxcc)
		buf += struct.pack("!B", mpt)
		buf += struct.pack("!H", self.sequence_number & bitmask(16))
		buf += struct.pack("!I", self.timestamp & bitmask(32))
		buf += struct.pack("!I", self.ssrc)
		for c in self.csrc_identifiers:
			buf += struct.pack("!I", c)
		buf += self.payload

		return buf