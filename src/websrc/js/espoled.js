var version = "";
var UNIFONT = "u8g2_font_unifont_te";
var DRIVERCHIP = "SSD1306";
var ROTATION = "0";
var RESOLUTION = "128 * 64";

var websock = null;
var wsUri = "ws://" + window.location.host + "/ws";
var utcSeconds;
var tzoffset;
var data = [];
var ajaxobj;

var config = {
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
		"wifipin": "255",
		"kodipin": "255"
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

var backupstarted = false;
var restorestarted = false;
var gotInitialData = false;
var wsConnectionPresent = false;

var espoled;

function browserTime() {
	var d = new Date(0);
	var timestamp = Math.floor((c.getTime() / 1000) + ((c.getTimezoneOffset() * 60) * -1));
	d.setUTCSeconds(timestamp);
	document.getElementById("rtc").innerHTML = d.toUTCString().slice(0, -3);
}

function deviceTime() {
	var t = new Date(0); // The 0 there is the key, which sets the date to the epoch,
	var devTime = Math.floor(utcSeconds + (tzoffset * 60));
	t.setUTCSeconds(devTime);
	document.getElementById("utc").innerHTML = t.toUTCString().slice(0, -3);
}

function syncBrowserTime() {
	var d = new Date();
	var timestamp = Math.floor((d.getTime() / 1000));
	var datatosend = {};
	datatosend.command = "settime";
	datatosend.epoch = timestamp;

	const select = document.getElementById("DropDownTimezone");
	config.ntp.tzname = select.options[select.selectedIndex].text;
	config.ntp.timezone = select.value;

	datatosend.timezone = config.ntp.timezone;
	websock.send(JSON.stringify(datatosend));
	$("#ntp").click();
}

function saveFile(obj,anchorElement,filename) {
	var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
	var dlAnchorElem = document.getElementById(anchorElement);
	dlAnchorElem.setAttribute("href", dataStr);
	dlAnchorElem.setAttribute("download", filename);
	dlAnchorElem.click();
  }

function backupset() {
	saveFile(config,"downloadSet","esp-oledproc-settings.json")
  }

function listhardware() {
	document.getElementById("driverchip").value = DRIVERCHIP;
	document.getElementById("rotation").value = ROTATION;
	document.getElementById("resolution").value = RESOLUTION;
	document.getElementById("wifipin").value = config.hardware.wifipin;
	document.getElementById("kodipin").value = config.hardware.kodipin;
}

function listntp() {
	websock.send("{\"command\":\"gettime\"}");
	document.getElementById("ntpserver").value = config.ntp.server;
	document.getElementById("intervals").value = config.ntp.interval;
	const select = document.getElementById("DropDownTimezone");
	for (var option of select.options) {
		if (option.text === config.ntp.tzname) {
			option.selected = true;
			break;
		}
	}
	browserTime();
	deviceTime();
}

function revcommit() {
	document.getElementById("jsonholder").innerText = JSON.stringify(config, null, 2);
	$("#revcommit").modal("show");
}

function uncommited() {
	$("#commit").fadeOut(200, function () {
		$(this).css("background", "gold").fadeIn(1000);
	});
	document.getElementById("commit").innerHTML = "<h6>You have uncommited changes, please click here to review and commit.</h6>";
	$("#commit").click(function () {
		revcommit();
		return false;
	});
}

function savehardware() {
	config.hardware.wifipin = parseInt(document.getElementById("wifipin").value);
	config.hardware.kodipin = parseInt(document.getElementById("kodipin").value);
	uncommited();
}

function saventp() {
	config.ntp.server = document.getElementById("ntpserver").value;
	config.ntp.interval = parseInt(document.getElementById("intervals").value);
	const select = document.getElementById("DropDownTimezone");
	config.ntp.tzname = select.options[select.selectedIndex].text;
	config.ntp.timezone = select.value;
	uncommited();
}

function savegeneral() {
	var a = document.getElementById("adminpwd").value;
	if (a === null || a === "") {
		alert("Administrator Password cannot be empty");
		return;
	}
	config.general.pswd = a;
	config.general.hostnm = document.getElementById("hostname").value;
	config.general.restart = parseInt(document.getElementById("autorestart").value);
	uncommited();
}

function savedisplay() {
	config.display.contrast1 = parseInt(document.getElementById("contrast1").value);
	config.display.contrast2 = parseInt(document.getElementById("contrast2").value);
	config.display.contrast3 = parseInt(document.getElementById("contrast3").value);
	config.display.speed = parseInt(document.getElementById("speed").value);
	config.display.scrollgap = parseInt(document.getElementById("scrollgap").value);
	config.display.monday = document.getElementById("day0").value.substring(0, 4);
	config.display.tuesday = document.getElementById("day1").value.substring(0, 4);
	config.display.wednesday = document.getElementById("day2").value.substring(0, 4);
	config.display.thursday = document.getElementById("day3").value.substring(0, 4);
	config.display.friday = document.getElementById("day4").value.substring(0, 4);
	config.display.saturday = document.getElementById("day5").value.substring(0, 4);
	config.display.sunday = document.getElementById("day6").value.substring(0, 4);
	if (document.getElementById("clockon").checked) {
		config.display.clock = 1;
	} else {
		config.display.clock = 0;
	}
	if (document.getElementById("calon").checked) {
		config.display.calendar = 1;
	} else {
		config.display.calendar = 0;
	}
	uncommited();
}

function checkOctects(input) {
	var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	var call = document.getElementById(input);
	if (call.value.match(ipformat)) {
		return true;
	} else {
		alert("You have entered an invalid address on " + input);
		call.focus();
		return false;
	}
}

function savenetwork() {
	config.network.dhcp = 0;
	config.network.ipport = document.getElementById("ipport").value;
	if (document.getElementById("inputtohide").style.display === "none") {
		var b = document.getElementById("ssid");
		config.network.ssid = b.options[b.selectedIndex].value;
	} else {
		config.network.ssid = document.getElementById("inputtohide").value;
	}
	config.network.bssid = document.getElementById("wifibssid").value;
	if (parseInt(document.querySelector("input[name=\"dhcpenabled\"]:checked").value) === 1) {
		config.network.dhcp = 1;
	} else {
		config.network.dhcp = 0;
		if (!checkOctects("ipaddress")) {
			return;
		}
		if (!checkOctects("subnet")) {
			return;
		}
		if (!checkOctects("dnsadd")) {
			return;
		}
		if (!checkOctects("gateway")) {
			return;
		}
		config.network.ip = document.getElementById("ipaddress").value;
		config.network.dns = document.getElementById("dnsadd").value;
		config.network.subnet = document.getElementById("subnet").value;
		config.network.gateway = document.getElementById("gateway").value;
	}
	config.network.pswd = document.getElementById("wifipass").value;
	if (parseInt(document.querySelector("input[name=\"fallbackmode\"]:checked").value) === 1) {
		config.network.fallbackmode = 1;
	} else {
		config.network.fallbackmode = 0;
	}
	uncommited();
}

var formData = new FormData();

function inProgress(callback) {
	$("body").load("espoled.html #progresscontent", function (responseTxt, statusTxt, xhr) {
		if (statusTxt === "success") {
			$(".progress").css("height", "40");
			$(".progress").css("font-size", "xx-large");
			var i = 0;
			var prg = setInterval(function () {
				$(".progress-bar").css("width", i + "%").attr("aria-valuenow", i).html(i + "%");
				i++;
				if (i === 101) {
					clearInterval(prg);
					var a = document.createElement("a");
					a.href = "http://" + config.general.hostnm + ".local";
					a.innerText = "Try to reconnect ESP";
					document.getElementById("reconnect").appendChild(a);
					document.getElementById("reconnect").style.display = "block";
					document.getElementById("updateprog").className = "progress-bar progress-bar-success";
					document.getElementById("updateprog").innerHTML = "Completed";
				}
			}, 500);
			switch (callback) {
				case "upload":
					$.ajax({
						url: "/update",
						type: "POST",
						data: formData,
						processData: false,
						contentType: false
					});
					break;
				case "commit":
					websock.send(JSON.stringify(config));
					break;
				case "destroy":
					websock.send("{\"command\":\"destroy\"}");
					break;
				case "restart":
					websock.send("{\"command\":\"restart\"}");
					break;
				default:
					break;
			}
		}
	}).hide().fadeIn();
}

function commit() {
	inProgress("commit");
}

function handleDHCP() {
	if (document.querySelector("input[name=\"dhcpenabled\"]:checked").value === "1") {
		$("#staticip2").slideUp();
		$("#staticip1").slideUp();
	} else {
		document.getElementById("ipaddress").value = config.network.ip;
		document.getElementById("subnet").value = config.network.subnet;
		$("#staticip1").slideDown();
		$("#staticip1").show();
		$("#staticip2").slideDown();
		$("#staticip2").show();
	}
}

function handleClock() {
	if (document.getElementById("clockon").checked) {
		$("#contrast").slideDown();
		$("#contrast").show();
		$("#calendar").slideDown();
		$("#calendar").show();
		if (document.getElementById("calon").checked) {
			document.getElementById("day0").value = config.display.monday;
			document.getElementById("day1").value = config.display.tuesday;
			document.getElementById("day2").value = config.display.wednesday;
			document.getElementById("day3").value = config.display.thursday;
			document.getElementById("day4").value = config.display.friday;
			document.getElementById("day5").value = config.display.saturday;
			document.getElementById("day6").value = config.display.sunday;
			$("#monday").slideDown();
			$("#monday").show();
			$("#tuesday").slideDown();
			$("#tuesday").show();
			$("#wednesday").slideDown();
			$("#wednesday").show();
			$("#thursday").slideDown();
			$("#thursday").show();
			$("#friday").slideDown();
			$("#friday").show();
			$("#saturday").slideDown();
			$("#saturday").show();
			$("#sunday").slideDown();
			$("#sunday").show();
		} else {
			$("#monday").slideUp();
			$("#tuesday").slideUp();
			$("#wednesday").slideUp();
			$("#thursday").slideUp();
			$("#friday").slideUp();
			$("#saturday").slideUp();
			$("#sunday").slideUp();
		}
	} else {
		$("#contrast").slideUp();
		$("#calendar").slideUp();
		$("#monday").slideUp();
		$("#tuesday").slideUp();
		$("#wednesday").slideUp();
		$("#thursday").slideUp();
		$("#friday").slideUp();
		$("#saturday").slideUp();
		$("#sunday").slideUp();
	}
}

function handleSTA() {
	document.getElementById("hideBSSID").style.display = "block";
	document.getElementById("scanb").style.display = "block";
	document.getElementById("dhcp").style.display = "block";
	if (config.network.dhcp === 0) {
		$("input[name=\"dhcpenabled\"][value=\"0\"]").prop("checked", true);
	}
	handleDHCP();
}

function listnetwork() {
	document.getElementById("inputtohide").value = config.network.ssid;
	document.getElementById("wifipass").value = config.network.pswd;
	document.getElementById("wifibssid").value = config.network.bssid;
	document.getElementById("dnsadd").value = config.network.dns;
	document.getElementById("gateway").value = config.network.gateway;
	document.getElementById("ipport").value = config.network.ipport;
	handleSTA();
	if (config.network.fallbackmode === 1) {
		$("input[name=\"fallbackmode\"][value=\"1\"]").prop("checked", true);
	}

}

function listgeneral() {
	document.getElementById("adminpwd").value = config.general.pswd;
	document.getElementById("hostname").value = config.general.hostnm;
	document.getElementById("autorestart").value = config.general.restart;
}

function listdisplay() {
	document.getElementById("unifont").value = UNIFONT;
	document.getElementById("contrast1").value = config.display.contrast1.toString();
	document.getElementById("rangeval1").innerText = config.display.contrast1.toString();
	document.getElementById("contrast2").value = config.display.contrast2.toString();
	document.getElementById("rangeval2").innerText = config.display.contrast2.toString();
	document.getElementById("speed").value = config.display.speed.toString();
	document.getElementById("rangeval3").innerText = config.display.speed.toString();
	document.getElementById("scrollgap").value = config.display.scrollgap.toString();
	document.getElementById("rangeval4").innerText = config.display.scrollgap.toString();
	document.getElementById("contrast3").value = config.display.contrast3.toString();
	document.getElementById("rangeval5").innerText = config.display.contrast3.toString();
	document.getElementById("calendar").style.display = "none";
	document.getElementById("contrast").style.display = "none";
	document.getElementById("monday").style.display = "none";
	document.getElementById("tuesday").style.display = "none";
	document.getElementById("wednesday").style.display = "none";
	document.getElementById("thursday").style.display = "none";
	document.getElementById("friday").style.display = "none";
	document.getElementById("saturday").style.display = "none";
	document.getElementById("sunday").style.display = "none";
	if (config.display.calendar === 1) { document.getElementById("calon").checked = true; }
	else { document.getElementById("calon").checked = false; }
	if (config.display.clock === 1) { document.getElementById("clockon").checked = true; }
	else { document.getElementById("clockon").checked = false; }
	handleClock();
}

function listBSSID() {
	var select = document.getElementById("ssid");
	document.getElementById("wifibssid").value = select.options[select.selectedIndex].bssidvalue;
}

function listSSID(obj) {
	var select = document.getElementById("ssid");
	for (var i = 0; i < obj.list.length; i++) {
		var x = parseInt(obj.list[i].rssi);
		var percentage = Math.min(Math.max(2 * (x + 100), 0), 100);
		var opt = document.createElement("option");
		opt.value = obj.list[i].ssid;
		opt.bssidvalue = obj.list[i].bssid;
		opt.innerHTML = "BSSID: " + obj.list[i].bssid + ", Signal Strength: %" + percentage + ", Network: " + obj.list[i].ssid;
		select.appendChild(opt);
	}
	document.getElementById("scanb").innerHTML = "Re-Scan";
	listBSSID();
}

function scanWifi() {
	websock.send("{\"command\":\"scan\"}");
	document.getElementById("scanb").innerHTML = "...";
	document.getElementById("inputtohide").style.display = "none";
	var node = document.getElementById("ssid");
	node.style.display = "inline";
	while (node.hasChildNodes()) {
		node.removeChild(node.lastChild);
	}
}

function isVisible(e) {
	return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}

function colorStatusbar(ref) {
	var percentage = ref.style.width.slice(0, -1);
	if (percentage > 50) {
		ref.className = "progress-bar progress-bar-success";
	} else if (percentage > 25) {
		ref.className = "progress-bar progress-bar-warning";
	} else {
		ref.class = "progress-bar progress-bar-danger";
	}
}

function listStats() {
	version = ajaxobj.version;
	document.getElementById("chip").innerHTML = ajaxobj.chipid;
	document.getElementById("cpu").innerHTML = ajaxobj.cpu + " Mhz";
	document.getElementById("uptime").innerHTML = ajaxobj.uptime;
	document.getElementById("heap").innerHTML = ajaxobj.heap + " Bytes";
	document.getElementById("heap").style.width = (ajaxobj.heap * 100) / 40960 + "%";
	colorStatusbar(document.getElementById("heap"));
	document.getElementById("flash").innerHTML = ajaxobj.availsize + " Bytes";
	document.getElementById("flash").style.width = (ajaxobj.availsize * 100) / (ajaxobj.availsize + ajaxobj.sketchsize) + "%";
	colorStatusbar(document.getElementById("flash"));
	document.getElementById("spiffs").innerHTML = ajaxobj.availspiffs + " Bytes";
	document.getElementById("spiffs").style.width = (ajaxobj.availspiffs * 100) / ajaxobj.spiffssize + "%";
	colorStatusbar(document.getElementById("spiffs"));
	document.getElementById("ssidstat").innerHTML = ajaxobj.ssid;
	document.getElementById("ip").innerHTML = ajaxobj.ip;
	document.getElementById("gate").innerHTML = ajaxobj.gateway;
	document.getElementById("mask").innerHTML = ajaxobj.netmask;
	document.getElementById("dns").innerHTML = ajaxobj.dns;
	document.getElementById("mac").innerHTML = ajaxobj.mac;
	document.getElementById("sver").innerText = version;
	$("#mainver").text(version);
}

function getContent(contentname) {
	$("#dismiss").click();
	$(".overlay").fadeOut().promise().done(function () {
		var content = $(contentname).html();
		$("#ajaxcontent").html(content).promise().done(function () {
			switch (contentname) {
				case "#statuscontent":
					listStats();
					break;
				case "#backupcontent":
					break;
				case "#ntpcontent":
					listntp();
					break;
				case "#generalcontent":
					listgeneral();
					break;
				case "#displaycontent":
					listdisplay();
					break;
				case "#hardwarecontent":
					listhardware();
					break;
				case "#networkcontent":
					listnetwork();
					break;
				default:
					break;
			}
			$("[data-toggle=\"popover\"]").popover({
				container: "body"
			});
			$(this).hide().fadeIn();
		});
	});
}

function restoreSet() {
	var input = document.getElementById("restoreSet");
	var reader = new FileReader();
	if ("files" in input) {
		if (input.files.length === 0) {
			alert("You did not select file to restore!");
		} else {
			reader.onload = function () {
				var json;
				try {
					json = JSON.parse(reader.result);
				} catch (e) {
					alert("Not a valid backup file!");
					return;
				}
				if (json.command === "configfile") {
					var x = confirm("File seems to be valid, do you wish to continue?");
					if (x) {
						config = json;
						uncommited();
					}
				}
			};
			reader.readAsText(input.files[0]);
		}
	}
}

function twoDigits(value) {
	if (value < 10) {
		return "0" + value;
	}
	return value;
}

function restartESP() {
	inProgress("restart");
}

function socketMessageListener(evt) {
	var obj = JSON.parse(evt.data);
	if (obj.hasOwnProperty("command")) {
		switch (obj.command) {
			case "status":
				ajaxobj = obj;
				getContent("#statuscontent");
				break;
			case "gettime":
				utcSeconds = obj.epoch;
				tzoffset = obj.tzoffset;
				deviceTime();
				break;
			case "ssidlist":
				listSSID(obj);
				break;
			case "configfile":
				config = obj;
				if (!('wifipin' in config.hardware)) config.hardware.wifipin = 255;
				if (!('kodipin' in config.hardware)) config.hardware.kodipin = 255;
				break;
			default:
				break;
		}
	}
	if (obj.hasOwnProperty("resultof")) {
		switch (obj.resultof) {
			default: break;
		}
	}
}

function compareDestroy() {
	if (config.general.hostnm === document.getElementById("compare").value) {
		$("#destroybtn").prop("disabled", false);
	} else {
		$("#destroybtn").prop("disabled", true);
	}
}

function destroy() {
	inProgress("destroy");
}

$("#dismiss, .overlay").on("click", function () {
	$("#sidebar").removeClass("active");
	$(".overlay").fadeOut();
});

$("#sidebarCollapse").on("click", function () {
	$("#sidebar").addClass("active");
	$(".overlay").fadeIn();
	$(".collapse.in").toggleClass("in");
	$("a[aria-expanded=true]").attr("aria-expanded", "false");
});

$("#status").click(function () {
	websock.send("{\"command\":\"status\"}");
	return false;
});

$("#network").on("click", (function () {
	getContent("#networkcontent");
	return false;
}));

$("#hardware").click(function () {
	getContent("#hardwarecontent");
	return false;
});

$("#general").click(function () {
	getContent("#generalcontent");
	return false;
});

$("#display").click(function () {
	getContent("#displaycontent");
	return false;
});

$("#ntp").click(function () {
	getContent("#ntpcontent");
	return false;
});

$("#backup").click(function () {
	getContent("#backupcontent");
	return false;
});

$("#reset").click(function () {
	$("#destroy").modal("show");
	return false;
});

$(".noimp").on("click", function () {
	$("#noimp").modal("show");
});

var xDown = null;
var yDown = null;
function handleTouchStart(evt) {
	xDown = evt.touches[0].clientX;
	yDown = evt.touches[0].clientY;
}

function handleTouchMove(evt) {
	if (!xDown || !yDown) {
		return;
	}

	var xUp = evt.touches[0].clientX;
	var yUp = evt.touches[0].clientY;

	var xDiff = xDown - xUp;
	var yDiff = yDown - yUp;

	if (Math.abs(xDiff) > Math.abs(yDiff)) { /*most significant*/
		if (xDiff > 0) {
			$("#dismiss").click();
		} else {
			$("#sidebarCollapse").click();
			/* right swipe */
		}
	} else {
		if (yDiff > 0) {
			/* up swipe */
		} else {
			/* down swipe */
		}
	}
	/* reset values */
	xDown = null;
	yDown = null;
}

function logout() {
	jQuery.ajax({
		type: "GET",
		url: "/login",
		async: false,
		username: "logmeout",
		password: "logmeout",
	})
		.done(function () {
			// If we don"t get an error, we actually got an error as we expect an 401!
		})
		.fail(function () {
			// We expect to get an 401 Unauthorized error! In this case we are successfully
			// logged out and we redirect the user.
			document.location = "index.html";
		});
	return false;
}

function wsConnectionActive() {
	wsConnectionPresent = true;
	websock.send("{\"command\":\"status\"}");
	$("#ws-connection-status").slideUp();
}

function wsConnectionClosed() {
	wsConnectionPresent = false;
	$("#ws-connection-status").slideDown();
	connectWS();
}

function keepWSConnectionOpen() {
	if (!wsConnectionPresent) {
		setTimeout(connectWS, 5000);
	}
}

function connectWS() {
	if (wsConnectionPresent) {
		return;
	}

	if (window.location.protocol === "https:") {
		wsUri = "wss://" + window.location.hostname + ":" + window.location.port + "/ws";
	} else if (window.location.protocol === "file:" || ["0.0.0.0", "localhost", "127.0.0.1"].includes(window.location.hostname)) {
		wsUri = "ws://localhost:8080/ws";
	}
	websock = new WebSocket(wsUri);
	websock.addEventListener("message", socketMessageListener);

	websock.onopen = function (evt) {
		if (!gotInitialData) {
			websock.send("{\"command\":\"getconf\"}");
			gotInitialData = true;
		}
		wsConnectionActive();
	};

	websock.onclose = function (evt) {
		wsConnectionClosed();
	};

	keepWSConnectionOpen();
}

function upload() {
	formData.append("bin", $("#binform")[0].files[0]);
	inProgress("upload");
}

function login() {
	if (document.getElementById("password").value === "neo") {
		$("#signin").modal("hide");
		connectWS();
	} else {
		var username = "admin";
		var password = document.getElementById("password").value;
		var url = "/login";
		var xhr = new XMLHttpRequest();
		xhr.open("get", url, true, username, password);
		xhr.onload = function (e) {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					$("#signin").modal("hide");
					connectWS();
				} else {
					alert("Incorrect password!");
				}
			}
		};
		xhr.send(null);
	}
}

function getLatestReleaseInfo() {
	$("#versionhead").text(version);

	$.getJSON("https://api.github.com/repos/Pako2/esp-oledproc/releases/latest").done(function (release) {
		var asset = release.assets[0];
		var downloadCount = 0;
		for (var i = 0; i < release.assets.length; i++) {
			downloadCount += release.assets[i].download_count;
		}
		var oneHour = 60 * 60 * 1000;
		var oneDay = 24 * oneHour;
		var dateDiff = new Date() - new Date(release.published_at);
		var timeAgo;
		if (dateDiff < oneDay) {
			timeAgo = (dateDiff / oneHour).toFixed(1) + " hours ago";
		} else {
			timeAgo = (dateDiff / oneDay).toFixed(1) + " days ago";
		}

		var releaseInfo = release.name + " was updated " + timeAgo + " and downloaded " + downloadCount.toLocaleString() + " times.";
		$("#downloadupdate").attr("href", asset.browser_download_url);
		$("#releasehead").text(releaseInfo);
		$("#releasebody").text(release.body);
		$("#releaseinfo").fadeIn("slow");
		//$("#versionhead").text(version);
	}).error(function () {
		$("#onlineupdate").html("<h5>Couldn't get release info. Are you connected to the Internet?</h5>");
	});
}

$("#update").on("shown.bs.modal", function (e) {
	getLatestReleaseInfo();
});

function allowUpload() {
	$("#upbtn").prop("disabled", false);
}

function start() {
	espoled = document.createElement("div");
	espoled.id = "mastercontent";
	espoled.style.display = "none";
	document.body.appendChild(espoled);
	$("#signin").on("shown.bs.modal", function () {
		$("#password").focus().select();
	});
	$("#mastercontent").load("espoled.html", function (responseTxt, statusTxt, xhr) {
		if (statusTxt === "success") {
			$("#signin").modal({
				backdrop: "static",
				keyboard: false
			});
			$("[data-toggle=\"popover\"]").popover({
				container: "body"
			});

		}
	});
}

document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);