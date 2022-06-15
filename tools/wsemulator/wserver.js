console.log("[ INFO ] Starting ESP-oled WebSocket Emulation Server");

const WebSocket = require("ws");

console.log("[ INFO ] You can connect to ws://localhost (default port is 8080)");

const wss = new WebSocket.Server({
    port: 8080
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

var networks = {
    "command": "ssidlist",
    "list": [{
            "ssid": "Company's Network",
            "bssid": "4c:f4:39:a1:41",
            "rssi": "-84"
        },
        {
            "ssid": "Home Router",
            "bssid": "8a:e6:63:a8:15",
            "rssi": "-42"
        },
        {
            "ssid": "SSID Shown Here",
            "bssid": "8a:f5:86:c3:12",
            "rssi": "-77"
        },
        {
            "ssid": "Great Wall of WPA",
            "bssid": "9c:f1:90:c5:15",
            "rssi": "-80"
        },
        {
            "ssid": "Not Internet",
            "bssid": "8c:e4:57:c5:16",
            "rssi": "-87"
        }
    ]
};


var configfile = {
	"command": "configfile",
	"network": {
		"bssid": "",
		"ssid": "esp-oledproc",
		"pswd": "",
		"dhcp": 0,
		"ip": "",
		"subnet": "",
		"gateway": "",
		"dns": "",
		"ipport": "13666",
		"fallbackmode": 1
	},
	"hardware": {
		"wifipin": 255,
		"kodipin": 255,
	},
	"general": {
		"hostnm": "esp-oledproc",
		"restart": 0,
		"pswd": "admin"
	},
	"display": {
		"contrast1": 150,
		"speed": 5,
		"scrollgap": 5,
		"contrast2": 0,
		"contrast3": 0,
		"clock": 1,
		"calendar": 0,
		"monday": "Mon.",
		"tuesday": "Tue.",
		"wednesday": "Wed.",
		"thursday": "Thu.",
		"friday": "Fri.",
		"saturday": "Sat.",
		"sunday": "Sun."
	},
	"ntp": {
		"server": "pool.ntp.org",
		"interval": 30,
		"timezone": "CET-1CEST,M3.5.0,M10.5.0/3",
		"tzname": "TZ_Europe_Prague"
	}
};


function sendStatus() {
    var stats = {
        "command": "status",
        "heap": 30000,
        "chipid": "emu413",
        "cpu": "80/160",
        "availsize": 555555,
        "availspiffs": 445555,
        "spiffssize": 888888,
        "uptime": "1 Day 6 Hours",
        "ssid": "emuSSID",
        "dns": "8.8.8.8",
        "mac": "FF:44:11:33:22",
        "ip": "192.168.2.2",
        "gateway": "192.168.2.1",
        "netmask": "255.255.255.0"
    };
    wss.broadcast(stats);
}

wss.on('connection', function connection(ws) {
    ws.on("error", () => console.log("[ WARN ] WebSocket Error - Assume a client is disconnected."));
    ws.on('message', function incoming(message) {
        var obj = JSON.parse(message);
        console.log("[ INFO ] Got Command: " + obj.command);
        switch (obj.command) {
            case "remove":
                console.log("[ INFO ] Removing " + obj.uid);
                remove(obj.uid);
                break;
            case "configfile":
                configfile = obj;
                console.log("[ INFO ] New configuration file is recieved");
                configfile = obj;
                break;
            case "status":
                console.log("[ INFO ] Sending Fake Emulator Status");
                sendStatus();
                break;
            case "gettime":
                console.log("[ INFO ] Sending time");
                var res = {};
                res.command = "gettime";
                res.epoch = Math.floor((new Date).getTime() / 1000);
                res.tzoffset = 0; // =======
                wss.broadcast(res);
                break;
            case "settime":
                console.log("[ INFO ] Setting time (fake)");
                var res = {};
                res.command = "gettime";
                res.epoch = Math.floor((new Date).getTime() / 1000);
                res.tzoffset = 0; // =======
                wss.broadcast(res);
                break;
            case "getconf":
                console.log("[ INFO ] Sending configuration file (if set any)");
                wss.broadcast(configfile);
                break;
            default:
                console.log("[ WARN ] Unknown command ");
                break;
        }
    });
});