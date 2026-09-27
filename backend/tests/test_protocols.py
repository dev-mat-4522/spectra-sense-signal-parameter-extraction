import numpy as np
import pytest
from app.dsp.nrzi import nrzi_encode, nrzi_decode
from app.dsp.g3ruh import scramble, descramble
from app.dsp.hdlc import extract_hdlc_frames
from app.dsp.ax25 import parse_ax25, _calc_fcs

def test_nrzi():
    bits = np.array([0, 1, 1, 0, 1, 0, 0, 1], dtype=np.uint8)
    encoded = nrzi_encode(bits)
    decoded = nrzi_decode(encoded)
    np.testing.assert_array_equal(bits, decoded)

def test_g3ruh():
    bits = np.random.randint(0, 2, 1000, dtype=np.uint8)
    scrambled = scramble(bits)
    descrambled = descramble(scrambled)
    np.testing.assert_array_equal(bits[17:], descrambled[17:])

def test_hdlc_and_ax25():
    packet = bytes([0x84, 0x8A, 0x82, 0x86, 0x9E, 0x9C, 0x60, 
                    0x9C, 0x60, 0x86, 0x82, 0x98, 0x98, 0x61, 
                    0x03, 0xF0, 0x48, 0x49])
    fcs = _calc_fcs(packet)
    fcs_bytes = bytes([fcs & 0xFF, (fcs >> 8) & 0xFF])
    full_packet = packet + fcs_bytes
    bits = []
    for b in full_packet:
        for i in range(8):
            bits.append((b >> i) & 1)
    stuffed = []
    ones = 0
    for b in bits:
        if b == 1:
            ones += 1
            stuffed.append(1)
            if ones == 5:
                stuffed.append(0)
                ones = 0
        else:
            ones = 0
            stuffed.append(0)
    flag = [0, 1, 1, 1, 1, 1, 1, 0]
    stream = flag + stuffed + flag
    frames = extract_hdlc_frames(np.array(stream, dtype=np.uint8))
    assert len(frames) == 1
    ax = parse_ax25(frames[0])
    assert ax['valid'] == True
    assert ax['dest'] == 'BEACON-0'
    assert ax['src'] == 'N0CALL-0'
    assert ax['info_ascii'] == 'HI'
