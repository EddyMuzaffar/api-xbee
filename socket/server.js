var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
require('dotenv').config()
var humidity_rate;


const SERIAL_PORT = process.env.SERIAL_PORT;
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://test.mosquitto.org");

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});

let serialport = new SerialPort(SERIAL_PORT, {
  baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600,
}, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
});

serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

client.on("connect", () => {
  client.subscribe("triggerwater", (err) => {
    if (!err) {
    } else {
        console.error(`Erreur lors de l'abonnement au canal triggerwater:`, err);
    }
    });
    xbeeAPI.parser.on("data", function (frame) {
      if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
        console.log("C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET");
        let dataReceived = String.fromCharCode.apply(null, frame.data);
        console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived);
      }
    
      if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
        console.log("NODE_IDENTIFICATION");
      } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {
        humidity_rate = (frame.analogSamples.AD2*100/1024);
        var kelvin = (frame.analogSamples.AD3 * 500.0) / 1024.0; 
        var degres = kelvin - 273.15;
        client.subscribe("humidityrate", (err) => {
          if (!err) {
            if(humidity_rate < 100) {
              client.publish("humidityrate", humidity_rate.toString());
            }
          } else {
            console.error(`Erreur lors de l'abonnement au canal triggerwater:`, err);
          }
        });
        client.subscribe("temp", (err) => {
          if (!err) {
            client.publish("temp", degres.toString());
          } else {
            console.error(`Erreur lors de l'abonnement au canal temp:`, err);
          }
        });
    } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
      console.log("REMOTE_COMMAND_RESPONSE")
      // console.log(frame);
    } else {
      console.debug(frame);
      let dataReceived = String.fromCharCode.apply(null, frame.commandData)
      console.log(dataReceived);
    }

  });

  client.on("message", (topic, message) => {
    console.log(topic + ":" + message.toString("utf-8"));
    if (message.toString("utf-8") === "ON") {
      var remoteCommandFrame = {
        type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
        destination64: process.env.DEST_MAC_ADDR,
        command: "D1",
        commandParameter: [0x04],
      };
      
      xbeeAPI.builder.write(remoteCommandFrame)
      setTimeout(() => {
        var remoteCommandFrame = {
          type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
          destination64: process.env.DEST_MAC_ADDR,
          command: "D1",
          commandParameter: [0x05],
        };
        
        xbeeAPI.builder.write(remoteCommandFrame)
      }, "5000");
    }
  });
});