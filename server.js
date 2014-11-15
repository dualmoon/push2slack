#!/usr/bin/env node

var private = require("./private.js");
var request = require("request")
var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();
var lastTickle = new Date().getTime();

String.prototype.trunc =
     function(n,useWordBoundary){
         var toLong = this.length>n,
             s_ = toLong ? this.substr(0,n-1) : this;
         s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
         return  toLong ? s_ + '…' : s_;
      };

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
        if (msg.type == "tickle") {
            request({
                uri: 'https://api.pushbullet.com/v2/pushes?modified_after=0',
                method: "GET",
                auth: {
                    'user': private.pbAPIkey
                }
            }, function(err, res, body) {
                var push = JSON.parse(body).pushes[0];
                //TODO:
                //support file pushes
                if(push.type!="link"&&push.type!="note") return 1;
                var fallback,value = "";
                var text = "";
                if(push.body) text = push.body;
                if(push.type=="link"){
                    fallback = "New push from "+push.sender_name+": <"+push.url+"|"+push.title+"> "+text.trunc(30,true);
                    value = "<"+push.url+"|"+push.url+">\n"+text;
                }
                if(push.type=="note"){
                    fallback = "New push from "+push.sender_name+": "+push.title+" -- "+text.trunc(50,true);
                    value = text;
                }
                request({
                    uri: private.slackURI,
                    method: "POST",
                    form: {
                        payload: JSON.stringify({
                            unfurl_links: true,
                            fallback: fallback,
                            pretext: fallback,
                            color: 'good',
                            fields: [{
                                title: push.title,
                                value: value,
                                short: true
                            }]
                        })
                    }
                }, function(error, response, body) {
                    console.log("Response: " + body);
                });
            });
        }
    });
});

client.connect('wss://stream.pushbullet.com/websocket/' + private.pbAPIkey, null);