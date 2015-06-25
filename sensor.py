#!/usr/bin/python

import Adafruit_DHT

sensor = Adafruit_DHT.DHT22
pin = 4

humidity, temperature = Adafruit_DHT.read_retry(sensor, pin)
print '{0:0.1f};{1}'.format(temperature, int(humidity))
