#!/usr/bin/env coffee

priv = require './private'
Request = require 'request'
WebSocketClient = require('websocket').client
Log = require 'log'
Pushed = require './Pushed'

date = new Date()
client = new WebSocketClient()
log = new Log()

String::trunc = (length, useWordBoundary) ->
  tooLong = @length > length
  s = if tooLong then @substr 0, length-1 else @
  s = if useWordBoundary and tooLong then s.substr 0, s.lastIndexOf(' ') else s
  return if tooLong then "#{s}…" else s

class PushClient
  constructor: ->

    @client = new WebSocketClient()

    @client.on 'connectFailed', (error) =>
      @onError error

    @client.on 'connect', (connection) =>
      @onClientConnect connection

    @latestPush = false

  onClientConnect: (connection) ->
    log.notice "Websocket connected"
    @connection = connection
    @connection.on 'error', (error) =>
      @onError error
    @connection.on 'close', ->
      #TODO: make this try to reconnect
      log.error "Connection closed"
    @connection.on 'message', (message) =>
      @receiveMessage message
  
  onError: (error) ->
    log.error "Connection error: #{error.toString()}"

  startClient: ->
    @client.connect "wss://stream.pushbullet.com/websocket/#{priv.pbAPIkey}", null
  
  receiveMessage: (message) ->
    parsedMessage = JSON.parse message.utf8Data
    log.debug "Received message. Parsed: #{JSON.stringify parsedMessage}"
    
    channel = false
    
    if parsedMessage.type == 'nop'
      return 0
      
    if parsedMessage.type == 'tickle'
      @getLatestPush()

  getLatestPush: ->
    log.debug "Getting latest push."
    returnValue = false
    requestOptions =
      uri: 'https://api.pushbullet.com/v2/pushes?modified_after=0'
      method: 'GET'
      auth: {
        user: priv.pbAPIkey
      }
    Request requestOptions, (err, res, body) =>
      log.debug "Requested push. Statuscode: #{res.statusCode}"
      if not err and res.statusCode is 200
        log.debug "Return value is currently: #{JSON.stringify returnValue}. Return value and @latest push are #{if returnValue==@latestPush then 'equal' else 'not equal'}"
        @sendPush @latestPush = new Pushed JSON.parse(body).pushes[0]
      else
        log.error "Could not retrieve pushes: #{err}"

  sendPush: (push) ->
    # Default payload data
    payload =
      unfurl_links: true
      color: 'good'
      pretext: "Push from #{push.senderName}"
      fields: [
        title: push.title
        short: true  
      ]
    log.debug "Push is: #{JSON.stringify(push)}"
    #TODO: optionalize this somehow
    if push.channelMessage
      payload.channel = "#internet_deals"
    else if push.text == "test"
      payload.channel = "#development"
    if push.type is 'link'
      payload.fallback = "Push from #{push.senderName}: <#{push.url}|#{push.title}> #{push.text.trunc 30, true}"
      payload.fields[0].value = "<#{push.url}|#{push.url}>\n#{push.text}"
    else if push.type is 'note'
      payload.fallback = "Push from #{push.senderName}: *#{push.title}* — #{push.text.trunc 50, true}"
      payload.fields[0].value = push.text
    else return 1
    # Payload is built, let's build request options
    log.debug "Payload is: #{JSON.stringify payload}"
    requestOptions =
      uri: priv.slackURI
      method: 'POST'
      form: {
        payload: JSON.stringify payload
      }
    
    Request requestOptions, (err, res, body) ->
      if not err and res.statusCode is 200
        log.notice "Send to slack response: #{body}"
      else
        log.error "Send to slack failed: #{body}"

pushClient = new PushClient()
pushClient.startClient()