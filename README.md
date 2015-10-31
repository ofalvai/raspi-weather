# Raspberry Pi weather station

DHT22 temperature/humidity sensor logger and browser dashboard for the Raspberry Pi. Based on [Adafruit's DHT22 Python library](https://github.com/adafruit/Adafruit_Python_DHT).

![Screenshot](/public/images/screenshot.png?raw=true)

# Features

- Measure and store temperature and humidity periodically (via cron and sqlite)
- Responsive web dashboard
- Display current temperature and humidity
- Display logged temperature and humidity graphs
- Current outside weather via [Forecast.io](http://forecast.io)

# Installation

```
sudo apt-get install sqlite3
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
git clone git@github.com:ofalvai/raspi-weather.git
cd raspi-weather
npm install
```

Install Adafruit's DHT22 Python library [according to their instructions](https://github.com/adafruit/Adafruit_Python_DHT#adafruit-python-dht-sensor-library).

Edit your sudo crontab with `sudo crontab -e` (yes, it needs to run as root to access GPIO, use at your own risk), and add this line:

```
*/30 * * * * /usr/bin/python /home/pi/raspi-weather/sensor_scripts/logger.py
```

...assuming you want to take measurements every 30 minutes, and cloned into `/home/pi`.

Connect your DHT22 sensor to the Pi and set the pin variable in `sensor_scripts/current.py` and `sensor_scripts/logger.py` to the pin number you use.

You can test both scripts by running `sudo sensor_scripts/current.py` and `sudo sensor_scripts/logger.py`. The latter will create the sqlite database file in the project root and log the first measurement.

You can further tweak the frontend settings in `public/javascripts/app.js`, like:

- temperature unit
- Forecast.io API key and location for outside weather info
- chart options

# Usage

Start the server (it needs to run as root for the same reason as the cronjob: to aceess GPIO):

```
sudo nohup node app.js &
```

...or you can install [forever](https://github.com/foreverjs/forever) to keep it _always_ running and then `sudo forever start app.js`

The server runs on port 3000, so visit for example `http://192.168.0.100:3000`

# Future ideas

- Select custom date ranges to display on the graphs
- Average graphs
- Dynamic favicon (like Google Calendar)

Feel free to fork and send me pull requests :)