var TelegramBot = require('node-telegram-bot-api');

var token = '188837433:AAERzRXh8Lo7-o18TX9WZ46ImmaruvYbaSY';
// Setup polling way
var bot = new TelegramBot(token, {polling: true});
var me;
var strikes = 0;
var that = this;

var userList = {};

var boldAnswers = [
  'Stay away from me!',
  'Shut up!',
  'You are not funny',
  'Fuck you',
  'Fuck off!',
  'ಠ_ಠ',
  'Get a life',
  'I don\'t want to',
  'Go away',
  'Don\'t touch me'
];

var bannedUsers = [];
var resetTimeInMinutes = 1;


bot.getMe().then(function (me) {
  console.log('Hi! my name is %s!', me.username);
  that.me = me;
  console.log('message: ', JSON.stringify(me));
});

// Matches /echo [whatever]
bot.onText(/\/echo (.+)/, function (msg, match) {
  console.log('echo: ', JSON.stringify(msg));
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});

// Matches /echo [whatever]
bot.onText(/\/adri (.+)/, function (msg, match) {
  console.log('echo: ', JSON.stringify(msg));
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});

// Any kind of message
bot.on('message', function (msg) {
  console.log('message: ', JSON.stringify(msg));

  var chatId = msg.chat.id;

  if (msg.text){
    if (containsURL(msg.text)) {
      addStrike(msg.from, msg.chat);
      bot.sendMessage(chatId, 'Strike ' + userList[msg.from.id].strikes + ' for @' + msg.from.username);
    }

    if (msg.text.toLowerCase().indexOf(that.me.username.toLowerCase()) !== -1) {
      console.log('---> Mention!');
      var response = boldAnswers[Math.floor(Math.random() * boldAnswers.length)];
      bot.sendMessage(chatId, response);

      // var fromId = msg.from.id;
      // bot.sendMessage(fromId, 'Stay away from me!'); // Respuesta directa a user
    }
  }
});

function containsURL(string) {
  var expression = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;
  var regex = new RegExp(expression);

  return string.match(regex);
}

function addStrike(user, chat){
  if(!userList[user.id] || minutesPassed(userList[user.id].lastStrike) > resetTimeInMinutes){
    userList[user.id] = {
      username: user.username,
      strikes: 0
    }
  }

  userList[user.id].lastStrike = new Date();
  userList[user.id].strikes++;

  console.log('Strike added to', userList[user.id].username);
  console.log('==========================');
  console.log(JSON.stringify(userList));
  console.log('==========================');

  if (userList[user.id].strikes >= 3) {
    banUser(user, chat, userList[user.id].lastStrike);
  }
}

function banUser(user, chat, lastStrike){
  // if(user.username === 'mattog') return;

  bot.sendMessage(chat.id, '@' + user.username + ', you have reached the maximum count of allowed links and you are now banned for 10 minutes.\nIf you want to receive a notification when you are allowed to join this group again, send me a direct message with the text "/start". Otherwise, just come back in 10 minutes and chill about the links, ok?');
  bannedUsers.push({
    userId: user.id,
    username: user.username,
    chatId: chat.id,
    chatName: chat.title,
    lastStrike: lastStrike
  });

  bot.kickChatMember(chat.id, user.id); // Kick the user
}

function unBanUser(user){
  bot.unbanChatMember(user.chatId, user.userId); // Un-Ban user

  // Try to send direct message to the user first
  bot.sendMessage(user.userId, 'You can come back to ' + user.chatName + ', pal.');

  // Send a message to the group
  bot.sendMessage(user.chatId, '@' + user.username + ' is now allowed to join this group again.');
}

function minutesPassed(since){
  var now = new Date(); 
  var diff = now.getTime() - since.getTime();
  return Math.floor(diff / (1000 * 60));
}

function allowBannedUsers(){
  if(bannedUsers.length){
    bannedUsers.forEach(function(user, index){
      if(minutesPassed(user.lastStrike) > resetTimeInMinutes){
        unBanUser(user);
        bannedUsers.splice(index, 1); // Remove the user from bannedUsers list
      }
    });
  }
}

// Init timer
setInterval(function(){
  allowBannedUsers();
}, 1000);
