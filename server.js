#!/usr/bin/env node

var private = require("./private.js");
var request = require("request")
var WebSocketClient = require('websocket').client;

var date = new Date()
var client = new WebSocketClient();

String.prototype.trunc =
     function(n,useWordBoundary){
         var toLong = this.length>n,
             s_ = toLong ? this.substr(0,n-1) : this;
         s_ = useWordBoundary && toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
         return  toLong ? s_ + '…' : s_;
      };

function log(type, timestamp, message){
    var types = {
        error: "[EE]",
        debug: "[--]",
        notice: "[++]",
        warning: "[!!]"
    };
    var stamp,prefix = "";
    if(types.hasOwnProperty(type)){
        prefix = types[type];
    }
    if(timestamp){
        stamp = date.getMonth()+"."+date.getDate()+"."+date.getFullYear()+" "+date.toLocaleTimeString()+"\t";
    }else{
        stamp = "                   \t";
    }
    console.log(stamp+prefix+" "+message);
}

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    log('notice',true,'WebSocket connected.');
    connection.on('error', function(error) {
        log('error',true,"Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        log('error'+true+'Socket Connection Closed');
    });
    connection.on('message', function(message) {
        
        // Parse the incoming message as JSON data
        var msg = JSON.parse(message.utf8Data);
        
        // Decide how to log the message received
        //assume it's an error unless otherwise noted
        var noteType = "error";
        //assume we want timestamps unless otherwise noted
        var noteStamp = true;
        if(msg.type=="nop"){
            noteType = "debug";
            noteStamp = false;
        }else if(msg.type=="tickle"){
            noteType = "notice";
        }
        //log the received message
        log(noteType,false,'Received '+msg.type);
        
        // If we received a tickle, respond by sending the last push to Slack
        if (msg.type == "tickle") {
            //get pushes
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
                
                //only react if we get a link or note
                if(push.type!="link"&&push.type!="note") return 1;
                
                var fallback,value,text,pretext = "";
                //if we have a body, set `text` to that
                if(push.body) text = push.body;
                //format outgoing messages for received link pushes
                if(push.type=="link"){
                    fallback = "Push from "+push.sender_name+": <"+push.url+"|"+push.title+"> "+text.trunc(30,true);
                    value = "<"+push.url+"|"+push.url+">\n"+text;
                }
                //format outgoing messages for received note pushes
                if(push.type=="note"){
                    fallback = "Push from "+push.sender_name+": "+push.title+" -- "+text.trunc(50,true);
                    value = text;
                }
                pretext = "Push from "+push.sender_name
                request({
                    uri: private.slackURI,
                    method: "POST",
                    form: {
                        payload: JSON.stringify({
                            unfurl_links: true,
                            fallback: fallback,
                            pretext: pretext,
                            color: 'good',
                            fields: [{
                                title: push.title,
                                value: value,
                                short: true
                            }]
                        })
                    }
                }, function(err, res, body) {
                    log('notice',true,"Push response: "+body);
                });
            });
        }
    });
});

client.connect('wss://stream.pushbullet.com/websocket/' + private.pbAPIkey, null);