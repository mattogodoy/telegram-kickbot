var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');

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
var chatLinks = {};
var messageOptions = {'parse_mode': 'Markdown'};


bot.getMe().then(function (me){
  console.log('Hi! my name is %s!', me.username);
  that.me = me;
  
  init();
});

function init(){
  getLinks();
}

// Matches /echo [whatever]
bot.onText(/\/echo (.+)/, function (msg, match){
  console.log('echo: ', JSON.stringify(msg));
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});

// Command: /setlink
bot.onText(/\/setlink (.+)/, function (msg, match){
  var chatId = msg.chat.id;

  if(match[1] && containsURL(match[1])){
    chatLinks[chatId] = {};
    chatLinks[chatId].inviteLink = match[1];
    saveLinks();
    bot.sendMessage(chatId, 'Invite link set for this group: ' + match[1]);
  } else {
    bot.sendMessage(chatId, 'Parameter missing or incorrect. It has to be a URL.\nUsage: `/setlink https://telegram.me/joinchat/invitehash`', messageOptions);
  }
});

// Command: /getlink
bot.onText(/\/getlink/, function (msg, match){
  var chatId = msg.chat.id;

  if(chatLinks && chatLinks[chatId]){
    bot.sendMessage(chatId, 'The invite link for this group is: ' + chatLinks[chatId].inviteLink);
  } else {
    bot.sendMessage(chatId, 'No invite link found for this group. Please set one using `/setlink', messageOptions);
  }
});

// Any kind of message
bot.on('message', function (msg){
  console.log('message: ', JSON.stringify(msg));

  var chatId = msg.chat.id;

  if(msg.text){
    // Strike detected
    if(msg.text.indexOf('/setlink') == -1 && containsURL(msg.text)){
      addStrike(msg.from, msg.chat);
      bot.sendMessage(chatId, 'Strike ' + userList[msg.from.id].strikes + ' for @' + msg.from.username);
    }

    // Mention detected
    if(that.me && msg.text.toLowerCase().indexOf(that.me.username.toLowerCase()) !== -1){
      var response = boldAnswers[Math.floor(Math.random() * boldAnswers.length)];
      bot.sendMessage(chatId, response);
    }
  }
});

function containsURL(string){
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

  if(userList[user.id].strikes >= 3){
    banUser(user, chat, userList[user.id].lastStrike);
  }
}

function banUser(user, chat, lastStrike){
  var banMessage = '@' + user.username + ', you have reached the maximum count of allowed links and you are now banned for 10 minutes.'
  if(chatLinks[chat.id] && chatLinks[chat.id].inviteLink){
    banMessage += '\nAfter that period, you can join this group again using this link: ' + chatLinks[chat.id].inviteLink;
  } else {
    banMessage += '\nAfter that period you can join this group again.'
  }

  banMessage += '\nIf you want to receive a notification when you are allowed to join this group again, send me a direct message with the text `/start. Otherwise, just come back in 10 minutes and chill about the links, ok?\nIn the meantime, think about what you\'ve done.';

  bot.sendMessage(chat.id, banMessage, messageOptions);
  bannedUsers.push({
    userId: user.id,
    username: user.username,
    chatId: chat.id,
    chatName: chat.title,
    lastStrike: lastStrike
  });

  // Don't kick me. I'M THE MASTER
  if(user.username !== 'mattog'){
    bot.kickChatMember(chat.id, user.id); // Kick the user
  }
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

function saveLinks() {
  fs.writeFileSync('storage/chatLinks.json', JSON.stringify(chatLinks), 'utf8');
}

function getLinks() {
  chatLinks = JSON.parse(fs.readFileSync('storage/chatLinks.json'));
  console.log(JSON.stringify(chatLinks));
}

// Init timer
setInterval(function(){
  allowBannedUsers();
}, 1000);
