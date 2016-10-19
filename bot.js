var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');

var token = '188837433:AAERzRXh8Lo7-o18TX9WZ46ImmaruvYbaSY';
// Setup polling way
var bot = new TelegramBot(token, {polling: true});
var me;
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
var banTimeInMinutes = 10;
var strikesResetTimeInMinutes = 60;
var maxStrikes = 3;
var chatLinks = {};
var messageOptions = {'parse_mode': 'Markdown'};


bot.getMe().then(function (me){
  // console.log('Hi! my name is @%s!', me.username);
  that.me = me;

  init();
});

function init(){
  var asciiRobot = '\n\n';

  asciiRobot += '                  ,--.    ,--.\n';
  asciiRobot += '                 ((O ))--((O ))\n';
  asciiRobot += '               ,\'_`--\'____`--\'_`.\n';
  asciiRobot += '              _:  ____________  :_\n';
  asciiRobot += '             | | ||::::::::::|| | |\n';
  asciiRobot += '             | | ||::::::::::|| | |\n';
  asciiRobot += '             | | ||::::::::::|| | |\n';
  asciiRobot += '             |_| |/__________\\| |_|\n';
  asciiRobot += '               |________________|\n';
  asciiRobot += '            __..-\'            `-..__\n';
  asciiRobot += '         .-| : .----------------. : |-.\n';
  asciiRobot += '       ,\\ || | |\\______________/| | || /.\n';
  asciiRobot += '      /`.\\:| | ||  __  __  __  || | |;/,\'\\\n';
  asciiRobot += '     :`-._\\;.| || \'--\'\'--\'\'--\' || |,:/_.-\':\n';
  asciiRobot += '     |    :  | || .----------. || |  :    |\n';
  asciiRobot += '     |    |  | || \'----------\' || |  |    |\n';
  asciiRobot += '     |    |  | ||   _   _   _  || |  |    |\n';
  asciiRobot += '     :,--.;  | ||  (_) (_) (_) || |  :,--.;\n';
  asciiRobot += '     (`-\'|)  | ||______________|| |  (|`-\')\n';
  asciiRobot += '      `--\'   | |/______________\\| |   `--\'\n';
  asciiRobot += '             |____________________|\n';
  asciiRobot += '              `.________________,\'\n';
  asciiRobot += '               (_______)(_______)\n';
  asciiRobot += '               (_______)(_______)\n';
  asciiRobot += '               (_______)(_______)\n';
  asciiRobot += '               (_______)(_______)\n';
  asciiRobot += '              |        ||        |\n';
  asciiRobot += '              \'--------\'\'--------\'\n';

  console.log(asciiRobot);
  console.log('\n            Hi! my name is @%s!\n\n', that.me.username);

  // We add a strike because the first one doesn't count
  maxStrikes++;

  getLinks();
}

// Command: /setlink
bot.onText(/\/setlink (.+)/, function (msg, match){
  var chatId = msg.chat.id;

  if(match[1] && containsURL(match[1])){
    chatLinks[chatId] = {};
    chatLinks[chatId].inviteLink = match[1];
    saveLinks();
    bot.sendMessage(chatId, 'Invite link set for this group: ' + match[1]);
    console.log('Invite link set for group ' + chatId + ': ' + match[1]);
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
    bot.sendMessage(chatId, 'No invite link found for this group. Please set one using `/setlink`', messageOptions);
  }
});

// Any kind of message
bot.on('message', function (msg){
  // console.log('message: ', JSON.stringify(msg));

  var chatId = msg.chat.id;

  if(msg.text){
    // Strike detected
    if(msg.text.indexOf('/setlink') == -1 && containsURL(msg.text)){
      addStrike(msg.from, msg.chat);
    }

    // Mention detected
    if(that.me && msg.text.toLowerCase().indexOf(that.me.username.toLowerCase()) !== -1){
      var response = boldAnswers[Math.floor(Math.random() * boldAnswers.length)];
      bot.sendMessage(chatId, response);
      console.log('The bot was mentioned');
    }
  }
});

// A new user joined the group
bot.on('new_chat_participant', function (msg){
  var chatId = msg.chat.id;

  console.log('A user joined the group ' + chatId + ': ' + msg.new_chat_member.username);

  // Check if the new user is banned
  if(bannedUsers.length){
    bannedUsers.forEach(function(user, index){
      if(msg.new_chat_member.id == user.userId){
        // Ban the user again, but keep original ban start time
        banUser({'id': user.userId, 'username': user.username}, {'id': user.chatId, 'title': user.chatName}, user.lastStrike, true);
      }
    });
  }
});

function containsURL(string){
  var expression = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi;
  var regex = new RegExp(expression);

  return string.match(regex);
}

function addStrike(user, chat){
  if(!userList[user.id] || minutesPassed(userList[user.id].lastStrike) > banTimeInMinutes){
    userList[user.id] = {
      username: user.username,
      strikes: 0
    }
  }

  userList[user.id].lastStrike = new Date();
  userList[user.id].strikes++;

  console.log('Strike ' + (userList[user.id].strikes - 1) + ' for ' + user.username);

  // The first strike doesn't count
  if(userList[user.id].strikes > 1){
    // We show strikes - 1 because the first one doesn't count
    bot.sendMessage(chat.id, 'Strike ' + (userList[user.id].strikes - 1) + ' for @' + user.username)
      .then(function(){
        if(userList[user.id].strikes >= maxStrikes){
          banUser(user, chat, userList[user.id].lastStrike, false);
        }
      });
  }
}

function banUser(user, chat, lastStrike, returningEarly){
  var banMessage = '';

  if(returningEarly){
    banMessage = 'Hey @' + user.username + '! You are not allowed here yet, buddy.\nYou are still grounded for ' + (banTimeInMinutes - minutesPassed(lastStrike)) + ' more minutes.';
  } else {
    banMessage = '@' + user.username + ', you have reached the maximum count of allowed links and you are now banned for ' + (banTimeInMinutes - minutesPassed(lastStrike)) + ' minutes.'
    if(chatLinks[chat.id] && chatLinks[chat.id].inviteLink){
      banMessage += '\nAfter that period, you can join this group again using this link: ' + chatLinks[chat.id].inviteLink;
    } else {
      banMessage += '\nAfter that period you can join this group again.'
    }
    banMessage += '\nIf you want to receive a notification when you are allowed to join this group again, send me a direct message with the text `/start`. Otherwise, just come back in 10 minutes and chill about the links, ok?\nIn the meantime, think about what you\'ve done.';

    // Add user to the banned users list
    bannedUsers.push({
      userId: user.id,
      username: user.username,
      chatId: chat.id,
      chatName: chat.title,
      lastStrike: lastStrike
    });
  }

  bot.sendMessage(chat.id, banMessage, messageOptions)
    .then(function(){
      // Don't kick me. I'M THE MASTER
      if(user.username !== 'mattog'){
        bot.kickChatMember(chat.id, user.id); // Kick the user
        console.log('User banned: ' + user.username);
      }
    })
    .catch(function(err){
      console.log(JSON.parse(err));
      console.log(banMessage);
    });
}

function unBanUser(user){
  // Reset user strikes
  userList[user.userId].strikes = 0;

  // This method is available for supergroup chats only
  // bot.unbanChatMember(user.chatId, user.userId); // Un-Ban user

  // Try to send direct message to the user first
  var comeBackMessage = 'You can come back to ' + user.chatName + ', pal.'
  if(chatLinks[user.chatId] && chatLinks[user.chatId].inviteLink){
    comeBackMessage += '\nTo join the group again follow this link: ' + chatLinks[user.chatId].inviteLink;
  } else {
    comeBackMessage += '\nTo join the group again ask an administrator to invite you.';
  }

  bot.sendMessage(user.userId, comeBackMessage);

  // Send a message to the group
  bot.sendMessage(user.chatId, '@' + user.username + ' is now allowed to join this group again.');

  console.log('User is now allowed to join the group again: ' + user.username);
}

function minutesPassed(since){
  var now = new Date(); 
  var diff = now.getTime() - since.getTime();
  return Math.floor(diff / (1000 * 60));
}

function allowBannedUsers(){
  if(bannedUsers.length){
    bannedUsers.forEach(function(user, index){
      if(minutesPassed(user.lastStrike) >= banTimeInMinutes){
        unBanUser(user);
        bannedUsers.splice(index, 1); // Remove the user from bannedUsers list
      }
    });
  }
}

function resetStrikes(){
  if(userList){
    // Loop through all of the users
    Object.keys(userList).forEach(function(key) {
      if(userList[key].strikes > 0 && minutesPassed(userList[key].lastStrike) >= strikesResetTimeInMinutes){
        userList[key].strikes = 0;
        console.log('Strikes reset for ' + userList[key].username);
      }
    });
  }
}

function saveLinks() {
  fs.writeFileSync('storage/chatLinks.json', JSON.stringify(chatLinks), 'utf8');
  console.log('The invite links file has been saved');
}

function getLinks() {
  chatLinks = JSON.parse(fs.readFileSync('storage/chatLinks.json'));
}

// Init timer
setInterval(function(){
  allowBannedUsers();
  resetStrikes();
}, 1000);
