require('dotenv').config(); //get the environment variables described in .env
const TelegramBot = require('node-telegram-bot-api');
const logger = require('au5ton-logger');
logger.setOption('prefix_date',true);
const util = require('util');
const fs = require('fs');
const git = require('git-last-commit');
const popura = require('popura');
const MAL = popura(process.env.MAL_USER, process.env.MAL_PASSWORD);
const nani = require('nani').init(process.env.ANILIST_CLIENT_ID, process.env.ANILIST_CLIENT_SECRET);
// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
const VERSION = require('./package').version;

// Custom modules
const bot_util = require('./roboruri/bot_util');
const Searcher = require('./roboruri/searcher');
const DataSource = require('./roboruri/enums').DataSource;


// Custom classes
const Resolved = require('./roboruri/classes/Resolved');
const Rejected = require('./roboruri/classes/Rejected');
const Anime = require('./roboruri/classes/Anime');
const Hyperlinks = require('./roboruri/classes/Hyperlinks');
const Synonyms = require('./roboruri/classes/Synonyms');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {
	polling: {
		autoStart: false
	}
});

const DEV_TELEGRAM_ID = parseInt(process.env.DEV_TELEGRAM_ID) || 0;

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
	const chatId = msg.chat.id;

	if(typeof msg.text === 'string' && msg.text.length > 0) {
		if(msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
			//group specific stuff
		}
		if (msg.chat.type === 'private'){
			//when the bot is being talked to one-on-one
			if(msg.text.startsWith('roboruri version')) {
				git.getLastCommit(function(err, commit) {
					// read commit object properties
					bot.sendMessage(chatId, 'version '+VERSION+', commit '+commit['shortHash']+', last updated on '+new Date(parseInt(commit['authoredOn'])*1000).toDateString()+'\n\nhttps://github.com/au5ton/Roboruri/tree/'+commit['hash'],{
						disable_web_page_preview: true
					});
				});
			}
			else if(msg.text.startsWith('roboruri commit')) {
				git.getLastCommit(function(err, commit) {
					// read commit object properties
					bot.sendMessage(chatId, 'https://github.com/au5ton/Roboruri/tree/'+commit['hash']);
				});
			}
		}

		if (msg.text.startsWith('roboruri ping')) {
			bot.sendMessage(chatId, 'pong');
		}
		if (msg.text.startsWith('thanks roboruri')) {
			let catchphrases = ['I\'ll try my best', 'I don\'t know anyone by that name.', '( ´ ∀ `)'];
			bot.sendMessage(chatId, catchphrases[Math.floor(Math.random() * catchphrases.length)]);
		}
		if (msg.text.startsWith('roboruri source code')) {
			bot.sendMessage(chatId, 'https://github.com/au5ton/Roboruri');
		}

		//developer tools
		if(msg.from.id === DEV_TELEGRAM_ID) {
			if (msg.text.startsWith('roboruri debug')) {
				logger.warn('[DEBUG]\nmsg: ', msg, '\nGL:', GL);
			}
			if(msg.text.startsWith('roboruri leave')) {
				bot.sendMessage(chatId, 'Sayōnara').then(() => {
					bot.leaveChat(chatId);
				});
			}
		}

		//summon handlers
		bot_util.isValidBraceSummon(msg).then((query) => {
			//logger.log('q: ', query);
			Searcher.searchAnimes(query).then((result) => {
				bot.sendMessage(chatId, buildAnimeChatMessage(result), {
					parse_mode: 'html',
					disable_web_page_preview: true
				});
			}).catch((r) => {
				//well that sucks
				if(r === 'can\'t findBestMatchForAnimeArray if there are no titles') {
					logger.warn('q: {'+query+'} => '+filled_x)
				}
				else {
					logger.error('failed to search with Searcher: ', r);
				}
			});
		}).catch(()=>{});
		bot_util.isValidBracketSummon(msg).then((query) => {
			MAL.searchAnimes(query).then((animes) => {
				logger.log(animes);
				if (animes[0] !== null) {
					for (let i = 0; i < animes.length; i++) {
						if (animes[i]['type'] === 'OVA' || animes[i]['type'] === 'Movie') {
							bot.sendMessage(chatId, buildAnimeChatMessage(animes[i]), {
								parse_mode: 'html',
								disable_web_page_preview: true
							});
							break;
						}
					}
				}
			}).catch((r) => {
				//well that sucks
				logger.error('failed to search mal: ', r);
			});
		}).catch(()=>{});
		bot_util.isValidPipeSummon(msg).then((query) => {
			MAL.searchAnimes(query).then((animes) => {
				if (animes[0] !== null) {
					for (let i = 0; i < animes.length; i++) {
						if (attempt[1].toLowerCase() === animes[i]['title'].toLowerCase() || attempt[1].toLowerCase() === animes[i]['english'].toLowerCase()) {
							bot.sendMessage(chatId, buildAnimeChatMessage(animes[i]), {
								parse_mode: 'html',
								disable_web_page_preview: true
							});
						}
					}
				}
			}).catch((r) => {
				//well that sucks
				logger.error('failed to search mal: ', r);
			});
		}).catch(()=>{});
		bot_util.isValidLTGTSummon(msg).then((query) => {
			MAL.searchMangas(attempt[1]).then((mangas) => {
				if (mangas[0] !== null) {
					bot.sendMessage(chatId, buildMangaChatMessage(mangas[0]), {
						parse_mode: 'html',
						disable_web_page_preview: true
					});
				}
			}).catch((r) => {
				//well that sucks
				logger.error('failed to search mal: ', r);
			});
		}).catch(()=>{});
	}
});

const star_char = '\u272A';
const filled_x = '\u274C';

function buildHyperlinksForAnime(anime) {
	let message = '';

	let exists = (val) => {
		return (val !== undefined);
	};

	for(let e in DataSource) {
		if(DataSource[e] === DataSource.MAL && exists(anime.hyperlinks.dict[DataSource[e]])) {
			message += '<a href=\"'+anime.hyperlinks.dict[DataSource[e]]+'\">MAL</a>, ';
		}
		else if(DataSource[e] === DataSource.ANILIST && exists(anime.hyperlinks.dict[DataSource[e]])) {
			message += '<a href=\"'+anime.hyperlinks.dict[DataSource[e]]+'\">AL</a>, ';
		}
	}
	return message.substring(0,message.length-2); //remove trailing comma and space
}

function buildAnimeChatMessage(anime, options) {
	options = options || {};
	let message = '';
	message += '<b>' + anime['title'] + '</b>';
	message += ' ('+buildHyperlinksForAnime(anime)+')\n';
	if(anime['score_str'] !== null) {
		message += anime['score_str'] + star_char + ' | ';
	}
	message += anime['media_type'] + ' | Status: ' + anime['status'] + ' | Episodes: ' + anime['episode_count'];
	message += '\n' + anime['synopsis'];
	return message;
}

function buildMangaChatMessage(manga) {
	let message = '';
	if (manga['english'] !== null && manga['english'] !== '') {
		message += '<b>' + manga['english'] + '</b>';
	} else {
		message += '<b>' + manga['title'] + '</b>';
	}
	message += ' (<a href=\"https://myanimelist.net/manga/' + manga['id'] + '\">MAL</a>)\n';
	message += manga['score'] + star_char + ' | ' + manga['type'] + ' | Status: ' + manga['status'] + ' | Volumes: ' + manga['volumes'];
	return message;
}

logger.log('Bot active. Performing startup checks.');

logger.warn('Is our Telegram token valid?');
bot.getMe().then((r) => {

	//doesn't matter who we are, we're good
	logger.success('Telegram token is valid.');
	bot.startPolling().then((r) => {
		logger.success('Telegram bot polling started.');
	}).catch((r) => {
		logger.error('Telegram bot failed to start polling. ', r);
		process.exit();
	})
}).catch((r) => {
	logger.error('Telegram bot invalid token: ', r.code, ' ', r.body);
	process.exit();
});

logger.warn('Is our MAL authentication valid?');
MAL.verifyAuth().then((r) => {
	logger.success('MAL authenticated. ');
}).catch((r) => {
	logger.error('MAL failed to authenticate: ', r.message);
	process.exit();
});
