#!/usr/bin/python

import Adafruit_DHT
import sqlite3
import os

sensor = Adafruit_DHT.DHT22
pin = 4

humidity, temperature = Adafruit_DHT.read_retry(sensor, pin)
# print 'Temp: {0:0.1f} *C, Humidity: {1:0.1f}%'.format(temperature, humidity)

dir_path = os.path.dirname(os.path.abspath(__file__))
# Cron-bol futtatva nem jo a relative path

try:
    db = sqlite3.connect(os.path.join(dir_path, 'raspi-weather-test.db'))
    c = db.cursor()

    args = ['now', 'localtime', temperature, humidity]
    c.execute('INSERT INTO indoor (timestamp, temp, hum) VALUES (datetime(?, ?), ?, ?)', args)
    db.commit()
    db.close()
except sqlite3.Error as err:
    f = open(os.path.join(dir_path, 'sensor.log'), 'a')
    f.write(str(err))
    f.write('\n')
    f.close()

