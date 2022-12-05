import TelegramBot from "node-telegram-bot-api";
import {rastrearEncomendas} from 'correios-brasil';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const token = process.env.API_TELEGRAM_KEY;
const weatherToken = process.env.API_WEATHER_TOKEN;
const bot = new TelegramBot(token, {polling: true});

bot.on('callback_query', query => {
   
   if (query.data == 'cryptoCurrency') {
      cryptoCurrency(query.message)
   }

   if (query.data == 'BTC' || query.data == 'ETH' || query.data == 'MATIC') {
      getCryptoCurrency(query.message, query.data)
   }

   if (query.data == 'weather') {
      handleWeather(query.message)
   }

   if (query.data == 'track') {
      handleTrack(query.message)
   }
})

bot.onText(/\/start/, msg => {
   startMessage(msg);   
})

function startMessage(msg) {
   bot.sendMessage(msg.chat.id, `Olá, ${msg.from.first_name}! Como posso te ajudar?`,{
      reply_markup: {
         inline_keyboard: [
            [
               {text: '💰 Cotação Criptomoedas', callback_data: 'cryptoCurrency'}
            ],
            [
               {text: '🌤 Previsão do Tempo', callback_data: 'weather'}
            ],
            [
               {text: '📦 Rastrear Encomenda', callback_data: 'track'}
            ]
         ]
      }
   })
}

function cryptoCurrency(msg) {
   bot.sendMessage(msg.chat.id, `Você quer receber a cotação de qual moeda?`,{
      reply_markup: {
         inline_keyboard: [
            [
               {text: 'BTC', callback_data: 'BTC'}
            ],
            [
               {text: 'ETH', callback_data: 'ETH'}
            ],
            [
               {text: 'MATIC', callback_data: 'MATIC'}
            ],
         ]
      }
   });
}

function getCryptoCurrency(msg, currency) {
   const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${currency}&tsyms=USD,BRL&api_key=${process.env.API_CRYPTO_TOKEN}`;
   try {
      fetch(url)
      .then(response => response.json())
      .then(data => {
         const answer = `
   Cotação atual: ${currency}
   
- USD: ${data.DISPLAY[currency].USD.PRICE}
- BRL: ${data.DISPLAY[currency].BRL.PRICE}
         `
         bot.sendMessage(msg.chat.id, answer);
         startMessage(msg);
      })
   } catch (error) {
      bot.sendMessage(msg.chat.id, 'Infelizmente, não foi possível buscar as informações atualizadas. Tente novamente!')
   }
}

function handleWeather(msg) {
   bot.sendMessage(msg.chat.id, 'Digite o nome da cidade:', {
      reply_markup: {
         force_reply: true,
         input_field_placeholder: 'nome da cidade'
      }
      }).then( async (response) => {
         bot.onReplyToMessage(response.chat.id, response.message_id, msg => {
         bot.sendMessage(response.chat.id, 'Aguarde... Estamos buscando as informações atualizadas!')
         getWeather(msg);
      })
   })
}

async function getWeather(msg) {
   const link = `https://api.openweathermap.org/data/2.5/weather?q=${msg.text}&appid=${weatherToken}&lang=pt_br`
   try {
      await fetch(link)
      .then(response => response.json())
      .then(data => {
         if (data.cod == '404') {
            bot.sendMessage(msg.chat.id, 'Cidade não encontrada!');
         } else {
            const city = data.name;
            const weather = data.weather[0].description;
            const temp = (data.main.temp - 273.15).toFixed(1);
            const temp_min = (data.main.temp_min - 273.15).toFixed(1);
            const temp_max = (data.main.temp_max - 273.15).toFixed(1);

            const result = `
            Segue a previsão do tempo de hoje para: ${city}

Agora: ${temp}ºC | ${weather}

Mínima prevista: ${temp_min}ºC
Máxima prevista: ${temp_max}ºC
            `

            bot.sendMessage(msg.chat.id, result)
            startMessage(msg);
         }
      })
   } catch (error) {
      bot.sendMessage(msg.chat.id, 'Cidade não encontrada!');
   }
}

function handleTrack(msg) {
   bot.sendMessage(msg.chat.id, 'Informe o código de rastreio:', {
      reply_markup: {
         force_reply: true,
         input_field_placeholder: 'ex.: QB904581813BR'
      }
      }).then( async (response) => {
         bot.onReplyToMessage(response.chat.id, response.message_id, msg => {
         bot.sendMessage(response.chat.id, 'Aguarde... Estamos buscando as informações atualizadas!')
         getTrack(msg);
      })
   })
}

function getTrack(msg) {
   const trackcodes = msg.text.split(",")
   rastrearEncomendas(trackcodes).then(response => {
      if (response[0].mensagem) {
         bot.sendMessage(msg.chat.id, response[0].mensagem)
         startMessage(msg);
         return;
      }

      if (response[0].eventos) {
         let result = '';
         response[0].eventos.map(data => {
            const date = new Date(data.dtHrCriado)
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const day = date.getDate();
            const month = date.getMonth();
            const year = date.getFullYear();
            result += `
Status: ${data.descricao}
Data: ${day}/${month}/${year} | ${hours}:${minutes}
Unidade: ${data.unidade.tipo}

`
         })
         bot.sendMessage(msg.chat.id, result)
         startMessage(msg);
      }
   });
}

//console.log(response[0])