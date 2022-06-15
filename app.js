const got = require('got');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var options = require('./options.js');
const colorService = require('./colorService.js')(options);

app.use(bodyParser.json())

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.level = 'debug';
logger.info("FloatPod automation start");
logger.error("FloatPod automation error start");


require('./cronService.js')(options,got,logger,options.apiKey);
/*
 * Commands:
"ping",
"get_water_temperature",
"get_controller_temperature",
"get_relay_status",
"get_silence_status",
"set_silence_on",
"set_silence_off",
"get_session_status",
"set_session_start",
"set_session_cancel",
*/

app.get('/', function (req, res) {
    res.send('200');
});

app.post('/color', function (req, res) { 
    // logger.debug('body',req.body);
	var roomColor = null;
    try{
		if (req.body['room_title']=="Dream Cabin"){
			roomColor = colorService.nearestColor(req.body['room_lighting_color']);
			options.floatDevices[req.body['room_title']].lightStripColor = roomColor.name;
			logger.info('color',options.floatDevices[req.body['room_title']].lightStripColor);
		}

    } catch (ex){
		logger.debug('req.body',req.body);
        logger.error("failed to parse room_lighting_color", ex);
    }

    //wait until next light on event starts before updating light color
    res.send("OK");
    // res.send('welcome, ' + req.body.color)
});

app.listen(2336);
