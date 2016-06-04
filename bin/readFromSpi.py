#!/usr/bin/env python3

from gpiozero import MCP3208
from time import sleep
import math
import sys

# clock_pin defaults to 11, mosi_pin defaults to 10, miso_pin defaults to 9, and select_pin defaults to 8.

SCLK        = 11 # 18 # Serial-Clock
MOSI        = 10 # 24 # Master-Out-Slave-In
MISO        = 9 # 23 # Master-In-Slave-Out
CS          = 8 # 25 # Chip-Select
MAX_VALUE   = 4096
RESISTOR    = 47
ITERATIONS  = 100

CHANNEL     = int(sys.argv[1])

def readTemp(channel, a, b, c, Rn):
  sumValue = 0.0
  count = 0
  T = 999.9

  for i in range (ITERATIONS):
    raw_value = channel.raw_value
    value = MAX_VALUE - raw_value

    if (value > 60 and raw_value > 60):
      sumValue += value
      count += 1
    else:
      print('Error: ', value, raw_value)
      return 999.9

  value = sumValue / count
  Rt = RESISTOR * ((MAX_VALUE / value) - 1)

  try:
    v = math.log(Rt / Rn)
    T = (1/(a + b*v + c*v*v)) - 273
  except:
    T = 999.9

  return T
    

adc = MCP3208(channel=CHANNEL, clock_pin=SCLK, mosi_pin=MOSI, miso_pin=MISO, select_pin=CS)

# MAVERICK
a = float(sys.argv[2]) # 0.0033354016
b = float(sys.argv[3]) # 0.000225
c = float(sys.argv[4]) # 0.00000251094
Rn = int(sys.argv[5]) # 925

temp = readTemp(adc, a, b, c, Rn)

if (temp != 999.9):
  print(temp)
else:
  print('ERR')
  exit(2)

