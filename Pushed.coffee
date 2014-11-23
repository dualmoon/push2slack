class Pushed
  constructor: (pushData) ->
    # Common push data
    @type       = pushData.type
    @senderName = pushData.sender_name
    @text       = if pushData.body then pushData.body else ""
    @title      = pushData.title
    # Is this a message pushed from a channel?
    @channelMessage = if pushData.channel_iden then true else false
    if @type == 'link'
      @url = pushData.url
      
module.exports = Pushed