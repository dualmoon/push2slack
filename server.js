#!/usr/bin/env node
var private = require("./private.js");
var request = require("request")
var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();


client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket client connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('Socket Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
        var msg = JSON.parse(message.utf8Data);
        if(msg.type=="tickle"){
          request({
            uri: private.slackURI,
            method: "POST",
            form: {
              payload: '{"text": "got push..."}'
            }
          }, function(error, response, body) {
              console.log("Response: "+body);
          });
        }
    });
});

client.connect('wss://stream.pushbullet.com/websocket/'+private.pbAPIkey, null);