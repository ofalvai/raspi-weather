#!/usr/bin/python

import Adafruit_DHT
import json

sensor = Adafruit_DHT.DHT22
pin = 4

humidity, temperature = Adafruit_DHT.read_retry(sensor, pin)
print json.dumps({'temperature': round(temperature, 1), 'humidity': round(humidity, 1)});
