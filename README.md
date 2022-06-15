# esp-OLEDproc - remote OLED display for [Kodi media center](https://kodi.tv/)

The **esp-OLEDproc** device fully replaces the server part of the LCDproc system (ie **LCDproc** add-on). Only the client part - the **[XBMC LCDproc](https://kodi.tv/addons/matrix/script.xbmc.lcdproc)** add-on - must be installed in the Kodi media center. It follows that the **esp-OLEDproc** device is completely independent of the platform on which Kodi is installed (LibreELEC, CoreELEC, Windows, Linux, Android ...). The only condition for proper function is the available WiFi signal at the place of installation of the display. Connecting the display to Kodi has never been easier!  
**esp-OLEDproc** fully supports Kodi native encoding (UTF-8), so accented texts are displayed completely normally (without transcoding to non-accented text)!
For this to work, the **XBMC LCDproc** add-on needs one very simple modification (adding UTF-8 to the encoding menu). I asked the author of **XBMC LCDproc** some time ago to release a modified version, but (although the modification is really trivial) I failed. That's why I made the modification myself and you can download the modified version [here](https://github.com/Pako2/esp-oledproc/raw/master/3rdparty/script.xbmc.lcdproc-4.0.0.1.zip).

## Preface
This project is based on a great [esp-rfid](https://github.com/omersiar/esp-rfid) project by Ömer Şiar Baysal.
The concept of [esp-rfid](https://github.com/omersiar/esp-rfid) was a great fit for me in all aspects, so it was possible to take a large part of the whole project and just modify it. **By this I express my great thanks to the author of this project!** 
There's another thing here. My English is very imperfect, so I'm glad I can use (without big changes) many passages from the original [README.md](https://github.com/omersiar/esp-rfid/blob/master/README.md). Once again, thank you!


## Features
### For Users
* Minimal effort for setting up your display, just flash and everything can be configured via Web UI
* If Kodi is not connected, the display may show the time and date (Time synced from a NTP Server)
* Cheap to build and easy to maintain
### For Tinkerers
* Open Source (minimum amount of hardcoded variable, this means more freedom)
* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Bootstrap for beautiful Web Pages for both Mobile and Desktop Screens
* Thanks to ESPAsyncTCP and ESPAsyncWebServer Libraries communication is Asynchronous


## Getting Started
This project still in its development phase. Please feel free to comment or give feedback.

* Get the latest release from [here.](https://github.com/Pako2/esp-oledproc/releases)
* See [ChangeLog](https://github.com/Pako2/esp-oledproc/blob/master/CHANGELOG.md)

## What You Will Need
### Hardware
* An ESP8266 module or a development board like **WeMos D1 mini** or **NodeMcu 1.0** with at least **32Mbit Flash (equals to 4MBytes)** (ESP32 does not supported for now)
* A monochrome OLED module with resolution 128 x 64 and SPI or I2C interface  

I bought both modules on Aliexpress. Now that I'm writing this, both together (a 1.3-inch display) can be purchased for less than $ 6 (including postage). The 0.96 inch display is even cheaper. For example, a mobile phone charger is enough to power it. So there's no reason not to try it!

### Software
#### Using Compiled Binaries
Download compiled binaries from GitHub Releases page https://github.com/Pako2/esp-oledproc/releases.  
On Windows you can use **"flash.bat"**, it will ask you which COM port that ESP is connected and then flashes it. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet. I mainly use displays with the SSD1306 controller. Precompiled binaries are for this driver chip. If you use other types of displays, you have to compile them yourself. It's easy, just swap the contents of a single line of source code.  
Another pitfall could be the font. The great u8g2 library supports UTF-8 encoding, but of course the [u8g2_font_unifont_te](https://github.com/olikraus/u8g2/wiki/fntgrpunifont) font (which I chose) does not contain a complete character set. It only contains a subset of characters, so you may need to use a different font for some languages.

#### Building With PlatformIO
##### Backend
The build environment is based on [PlatformIO](http://platformio.org). Follow the instructions found here: http://platformio.org/#!/get-started for installing it but skip the ```platform init``` step as this has already been done, modified and it is included in this repository. In summary:

```
sudo pip install -U pip setuptools
sudo pip install -U platformio
git clone https://github.com/Pako2/esp-oledproc.git
cd esp-oledproc
platformio run
```

When you run ```platformio run``` for the first time, it will download the toolchains and all necessary libraries automatically.

##### Useful commands:

* ```platformio run``` - process/build all targets
* ```platformio run -e generic -t upload``` - process/build and flash just the ESP12e target (the NodeMcu v2)
* ```platformio run -t clean``` - clean project (remove compiled files)

The resulting (built) image(s) can be found in the directory ```/bin``` created during the build process.

##### Frontend
You can not simply edit Web UI files because you will need to convert them to C arrays, which can be done automatically by a gulp script that can be found in tools directory or you can use compiled executables at the same directory as well (for Windows PCs only).

If you want to edit esp-oledproc's Web UI you will need (unless using compiled executables):
* NodeJS
* npm (comes with NodeJS installer)
* Gulp (can be installed with npm)

Gulp script also minifies HTML and JS files and compresses (gzip) them.

To minify and compress the frontend, enter the folder ```tools/webfilesbuilder``` and:
* Run ```npm install``` to install dependencies
* Run ```npm start``` to compress the web UI to make it ready for the ESP

In order to test your changes without flashing the firmware you can launch websocket emulator which is included in tools directory.
* You will need to Node JS for websocket emulator.
* Run ```npm install``` to install dependencies
* Run emulator  ```node wserver.js```

There are two alternative ways to test the UI
1. you can launch your browser with CORS disabled:
  ```chrome.exe --args --disable-web-security -–allow-file-access-from-files --user-data-dir="C:\Users\USERNAME"```
  and then open the HTML files directly (Get more information [here](https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome))
2. alternatively, you can launch a web server from the ```src/websrc``` folder, for example with Python, like this:
  ```python3 -m http.server```
  and then visit ```http://0.0.0.0:8000/```

When testing locally, use the password ```neo``` for admin capabilities.


### Pin Layout

The following table shows the pin layout used for connecting oled display to ESP:

| NodeMcu/WeMos| ESP8266     | I2C     | SPI     | 
|:------------:|:-----------:|:-------:|:-------:|
| GND          | GND         | GND     | GND     |
| 3V3          | 3V3         | 3V3     | 3V3     |
| D1           | GPIO-05     | SCK     |         |
| D2           | GPIO-04     | SDA     |         |
| D5           | GPIO-14     |         | SCK     |
| D7           | GPIO-13     |         | SDA     |
| D0           | GPIO-16     |         | RES     |
| D4           | GPIO-02     |         | DC      |
| D8           | GPIO-15     |         | CS      |

Someone would rather have a picture than a table.  
As an example of a possible connection, I also added two LEDs to indicate WiFi status and Kodi connection status.
<img src="img\i2c_bb.svg" alt="I2C board" title="I2C board" height="320"/> 
<img src="img\spi_bb.svg" alt="SPI board" title="SPI board" height="320"/>



### Steps
* First, flash firmware (you can use /bin/flash.bat on Windows) to your ESP either using Arduino IDE or with your favourite flash tool.
* (optional) Fire up your serial monitor to get informed.
* Search for Wireless Network "esp-oledproc-xxxxxx" and connect to it (It should be an open network and does not require password).
* Open your browser and type either "http://192.168.4.1" or "http://esp-oledproc.local" (.local needs Bonjour installed on your computer) on address bar.
* Log on to ESP, default password is "admin".
* Go to "Settings" page.
* Configure your **esp-OLEDproc** device. Push "Scan" button to join your wireless network, configure OLED display.
* Save settings, when rebooted your ESP will try to join your wireless network.
* Check your new IP address from serial monitor and connect to your ESP again. (You can also connect to "http://esp-oledproc.local").
* In your Kodi, open the **XBMC LCDproc** add-on configuration, select "Use remote LCDproc" on the Connection tab and fill in the correct IP address (and port) of **esp-OLEDproc** device.
* Don't forget to select UTF-8 encoding on the Behaviour tab (you must have version 4.0.0.1 of the **XBMC LCDproc** add-on).
* Confirm the entry.
* Congratulations, everything went well, if you encounter any issue feel free to ask help on GitHub.

#### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. 

## License
The code parts written by the author of the **esp-OLEDproc** project are licensed under [MIT License](https://github.com/Pako2/esp-oledproc/blob/stable/LICENSE), 3rd party libraries that are used by this project are licensed under different license schemes, please check them out as well.

