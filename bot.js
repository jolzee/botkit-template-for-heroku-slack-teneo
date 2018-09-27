/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 Botkit Basic Template for Heroku, Connecting SLack with Teneo

 Author: Peter Joles (https://github.com/jolzee)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!process.env.token) {
  console.log("Error: Specify a Slack bot token in environment");
  process.exit(1);
}

if (!process.env.engine_host) {
  console.log("Error: Specify a Teneo Engine Host");
  process.exit(1);
}

if (!process.env.engine_path) {
  console.log("Error: Specify a Teneo Engine Path");
  process.exit(1);
}

if (!process.env.engine_params) {
  console.log("Info: YOu can specify optional Teneo engine parameters");
}

var Botkit = require("botkit");
var os = require("os");

// this is needed to maintain user sessions
var cookieStorage = {};

var controller = Botkit.slackbot({
  debug: true
});

var bot = controller
  .spawn({
    token: process.env.token
  })
  .startRTM();

controller.hears("", "direct_message,direct_mention,mention,ambient", function(
  bot,
  message
) {
  console.log("message: ");
  console.log(message);

  console.log("message.user: ");
  console.log(message.user);

  var userId = message.user;
  var userInput = encodeURIComponent(message.text);

  sendUserInput(userInput, userId, function(engineResponse) {
    // send reply
    if (engineResponse.attachments) {
      bot.replyWithTyping(message, {
        text: engineResponse.answer,
        attachments: engineResponse.attachments
      });
    } else {
      bot.reply(message, engineResponse.answer);
    }
  });
});

controller.on("message_received", function(bot, message) {
  // carefully examine and
  // handle the message here!
  // Note: Platforms such as Slack send many kinds of messages, not all of which contain a text field!
  console.log(message);
});

function sendUserInput(userInput, userId, callback) {
  console.log("cookieStorage");
  console.log(cookieStorage);

  console.log("engine_params");
  console.log(process.env.engine_params);
  var engine_params = "";
  if (process.env.engine_params) {
    engine_params = process.env.engine_params;
  }

  return https.get(
    {
      host: process.env.engine_host,
      path:
        process.env.engine_path +
        "?viewname=STANDARDJSON&channel=slack" +
        engine_params +
        "&userinput=" +
        userInput,
      //This is what changes the request to a POST request
      method: "GET",
      headers: {
        Cookie: cookieStorage[userId] != undefined ? cookieStorage[userId] : ""
      }
    },
    function(response) {
      // Continuously update stream with data
      var body = "";
      response.on("data", function(d) {
        body += d;
      });
      response.on("end", function() {
        // Data reception is done, do whatever with it!
        var parsed = JSON.parse(body);
        console.log("Parsed body: ");
        console.log(parsed);
        if (response.headers["set-cookie"]) {
          cookieStorage[userId] = response.headers["set-cookie"];
        }
        var attachments = [];
        if (parsed.responseData.extraData.extensions) {
          var attachment = parsed.responseData.extraData.extensions;
          var parsedAttachments = JSON.parse(unescape(attachment));
          attachments = parsedAttachments.attachments;
          console.log(attachments);
        }
        callback({
          //cookieHeaders: cookieHeaders,
          answer: decodeURIComponent(parsed.responseData.answer),
          attachments: attachments
        });
      });
    }
  );
}
