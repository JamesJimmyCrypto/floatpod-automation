module.exports = function(got,logger, apiKey) {
        const lightFanService = require('./lightFanService.js')(got,logger);
        async function checkFloatStatus(deviceName,floatDevice,floatStatus){
            logger.debug(`${deviceName}: floatStatus ${JSON.stringify(floatStatus)}`);
            const deviceNewSession = floatStatus.status == 1;
            const deviceActiveSession = floatStatus.status==3;
            const idleScreen = floatStatus.status == 0;
           
            if(deviceActiveSession){
                const minsTillSessionEnds = floatStatus.duration/60 - 5;
                const activeSessionNonLast5Min = floatStatus.duration/60 != 5;
        
                logger.debug(`${deviceName}: mins in session ${floatDevice.minutesInSession}`);
                logger.debug(`${deviceName}: mins till session ends ${minsTillSessionEnds}`);
                logger.debug(`${deviceName}: duration mins ${floatStatus.duration/60}`);
        
                if(activeSessionNonLast5Min){
                    if(floatDevice.minsSincePreFloatLightOn > floatDevice.preFloatLightOnMins && floatDevice.needToTurnOffPreFloatLight){
                        lightFanService.turnLightOff(deviceName, floatDevice);
                    }
                    if(floatDevice.minutesInSession >= minsTillSessionEnds){
                        logger.info(`${deviceName}: turning light and fan on end of session`);
                        await lightFanService.lightAndFanOnOffPostSessionTimer(deviceName,floatDevice);
                        floatDevice.minutesInSession = 1;
                    } else if (floatDevice.minutesInSession == 0) {
                        logger.info(`${deviceName}: turning fan off 0 mins into active session`);
                        await got.get(floatDevice.fanOffUrl);
                        floatDevice.needToTurnOffPreFloatLight = true;
                        await lightFanService.turnLightOn(deviceName, floatDevice);
                        floatDevice.minutesInSession = 1
                    }
                    floatDevice.minutesInSession++;
                    floatDevice.minsSincePreFloatLightOn++;
                } else if(floatDevice.minutesInSession > -1){
                    logger.info(`${deviceName} turning light and fan on manual 5 min timer`);
                    await lightFanService.lightAndFanOnOffPostSessionTimer(deviceName, floatDevice);
                    floatDevice.minutesInSession = -1;
                }
            } else if (deviceNewSession){
                await checkForOverNightSession(deviceName, floatDevice);
                //only want to turn off fan once when in new session screen
                logger.debug(`mins in session  now${floatDevice.minutesInSession}`);
                if(floatDevice.minsSincePreFloatLightOn > floatDevice.preFloatLightOnMins && floatDevice.needToTurnOffPreFloatLight){
                    lightFanService.turnLightOff(deviceName, floatDevice);
                }
                floatDevice.minsSincePreFloatLightOn++;
                if(floatDevice.minutesInSession==0){
                    logger.info(`${deviceName}: turning fan off when in new session screen`);
                    await got.get(floatDevice.fanOffUrl);
                    floatDevice.needToTurnOffPreFloatLight = true;
                    await lightFanService.turnLightOn(deviceName, floatDevice);
                    floatDevice.minutesInSession = 1;
                }
            } else if (idleScreen) {
                logger.debug(`${deviceName}: no session active screen.`);
                floatDevice.minutesInSession = 0;
                floatDevice.minsSincePreFloatLightOn = 0;
                floatDevice.needToTurnOffPreFloatLight = true;
            }
        }
        async function checkForOverNightSession(deviceName, floatDevice){
            const theTime = new Date();
            if(theTime.getHours() >= 0 && theTime.getHours() < 7){
                logger.debug(`checkForOverNightSession time passed ${floatDevice.minutesInSession}`);
                if(floatDevice.minutesInSession > 5){
                    //send request to take out of session
                    logger.info(`${deviceName}: taking out of session overnight`);
                    await got.post(floatDevice.url, {
                        form:{
                            "api_key": apiKey,
                            "command":"set_session_cancel"
                        }
                    });
                } else {
                    logger.debug(`else`)
                    floatDevice.minutesInSession++;
                    logger.debug(`mins in session ${floatDevice.minutesInSession}`);
                }
                
            } 
        }
        return {
            checkFloatStatus: checkFloatStatus
        }
};