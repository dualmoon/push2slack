class Pushed
  constructor: (pushData) ->
    # Common push data
    @type       = pushData.type
    @senderName = pushData.sender_name
    @text       = if pushData.body then pushData.body else ""
    @title      = pushData.title
    # Is this a message pushed from a channel?
    @channelMessage  = false
    @channelMessage ?= pushData.channel_iden
    if @type == 'link'
      @url = pushData.url
      
module.exports = Pushed