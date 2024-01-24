var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
//var storage = require("./storage")
require('dotenv').config()


const SERIAL_PORT = process.env.SERIAL_PORT;

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

serialport.on("open", function () {
  // frame_obj = { // AT Request to be sent
  //   type: C.FRAME_TYPE.AT_COMMAND,
  //   command: "DH",
  //   commandParameter: [],
  // };

  // xbeeAPI.builder.write(frame_obj);

  // frame_obj = { // AT Request to be sent
  //   type: C.FRAME_TYPE.AT_COMMAND,
  //   command: "DL",
  //   commandParameter: [],
  // };

  // xbeeAPI.builder.write(frame_obj);
});

// All frames parsed by the XBee will be emitted here

// storage.listSensors().then((sensors) => sensors.forEach((sensor) => console.log(sensor.data())))
client.on("connect", () => {
  client.subscribe("triggerwater", (err) => {
    if (!err) {
      console.log(`Abonné au canal triggerwater`);
  } else {
      console.error(`Erreur lors de l'abonnement au canal triggerwater:`, err);
  }
  });
  xbeeAPI.parser.on("data", function (frame) {

    //on new device is joined, register it
    // console.log(C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET);
    //on packet received, dispatch event
    // let dataReceived = String.fromCharCode.apply(null, frame.data);
    if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
      console.log("C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET");
      let dataReceived = String.fromCharCode.apply(null, frame.data);
      console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived);
  
    }
  
    if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
      // let dataReceived = String.fromCharCode.apply(null, frame.nodeIdentifier);
      console.log("NODE_IDENTIFICATION");
      //storage.registerSensor(frame.remote64)
  
    } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {
      client.subscribe("humidityrate", (err) => {
        if (!err) {
          client.publish("humidityrate", (frame.analogSamples.AD2*100/1024).toString());
        } else {
          console.error(`Erreur lors de l'abonnement au canal triggerwater:`, err);
        }
      });
      if (frame.analogSamples.AD2*100/1024 < 0) {
        
      }
      else if (frame.analogSamples.AD2*100/1024 >= 80) {
        // frame_obj = { // AT Request to be sent
        // type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
        // destination64: "FFFFFFFFFFFFFFFF",
        //   command: "D0",
        //   commandParameter: [0o5],
        // };
      
        // xbeeAPI.builder.write(frame_obj);
      }
      // try {
      //   const response = axios.post(`${apiURL}/water-rate`, { 
      //     rate : waterrate 
      //   });
      //   console.log(response.data);
      // } catch (error) {
      //     console.error('Error sending water rate:', error.message);
      // }


      // frame_obj = {
      //   type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      //   destination64: "0030A2003R2F24F5",
      //   command: "D0",
      //   commandParameter: [0o4],
      // };

      // xbeeAPI.builder.write(frame_obj);

  } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
    console.log("REMOTE_COMMAND_RESPONSE")
  } else {
    console.debug(frame);
    let dataReceived = String.fromCharCode.apply(null, frame.commandData)
    console.log(dataReceived);
  }

});

client.on("message", (topic, message) => {
  // message is Buffer
  console.log(topic);
  console.log(message.toString());
  if(topic === "triggerwater" && message === "open") {
    var remoteCommandFrame = {
      type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      destination64: "FFFFFFFFFFFFFFFF",
      command: "D1",
      commandParameter: [0x04],
    };
    
    xbeeAPI.builder.write(remoteCommandFrame)
  }
  else if (topic === "triggerwater" && message === "close") {
    var remoteCommandFrame = {
      type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      destination64: "FFFFFFFFFFFFFFFF",
      command: "D1",
      commandParameter: [0x05],
    };
    
    xbeeAPI.builder.write(remoteCommandFrame)
  }
});

});