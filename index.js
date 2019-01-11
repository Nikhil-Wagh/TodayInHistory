// lambda-local -l index.js -h handler -t 10 -e Requests/LaunchRequest.json

const Alexa = require('ask-sdk-core');
// const xml = require('xml-parse');
const template = require('./apl_template_export.json');

const GetRemoteDataHandler =  {
	canHandle (handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
		&& handlerInput.requestEnvelope.request.intent.name === 'GetTodaysFact';
	},
	async handle(handlerInput) {
		let outputSpeech, title;
		let urlParams = getUrlParams(handlerInput.requestEnvelope.request.intent.slots);
		await getRemoteData(getUrl(urlParams))
			.then((response) => {
				// console.log(response);
				var DOMParser = require('xmldom').DOMParser;
				var parser = new DOMParser();
				var doc = parser.parseFromString(response, "text/xml");
				var elements = doc.getElementsByTagName("event");
	
				outputSpeech = "On ";
				for (var index = 0; index < elements.length; index++) {
					outputSpeech += elements[index].getAttribute("date") + " " +
							elements[index].getAttribute("content");
				}
				if (urlParams.type === 'birth') 
					outputSpeech += " was born";
				console.log(outputSpeech);
		  })
		  .catch((err) => {
			console.log("Error occurred:", err);
			outputSpeech = "I'm sorry for inconvenience, please try again.";
			return handlerInput.responseBuilder
				.speak(outputSpeech)
				.getResponse();
		  });
	
		// console.log(template)
		return handlerInput.responseBuilder
				.addDirective(getDirective(getTitle(urlParams.type), outputSpeech))
				.speak(outputSpeech)
				.getResponse();
	}
};

const LaunchRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    //   || (handlerInput.requestEnvelope.request.type === 'IntentRequest'
    //   && handlerInput.requestEnvelope.request.intent.name === 'GetTodaysFact');
  },
  async handle(handlerInput) {
	let outputSpeech = "Welcome, you can ask me about events happened today in past.";
	let repromptSpeech = "You can also ask about births, deaths and aviation";
	return handlerInput.responseBuilder
		.speak(outputSpeech)
		.reprompt(repromptSpeech)
		.addDirective(getDirective("Welcome", "Events include: \n1. Birth \n2. Death \n3. Aviation \n4. Event"))
		.getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
	const speechText = 'You can ask about events occured in past, events include birth, death, aviation and event';

    return handlerInput.responseBuilder
      .speak(speechText)
	  .reprompt(speechText)
	  .withShouldEndSession(false)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
	  .reprompt('Sorry, I can\'t understand the command. Please say again.')
	  .addDirective(getDirective("Apologies", "You can try again if you want."))
      .getResponse();
  },
};

const getRemoteData = function (url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed with status code: ' + response.statusCode));
      }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => {
		console.log("Error: ", err);
		reject(err);
	});
  });
};

const getDirective = function(title, outputSpeech) {
	return {
		type: 'Alexa.Presentation.APL.RenderDocument',
		version: '1.0',
		document: template,
		datasources: getDataSources(title, outputSpeech)
	};
}

const getDataSources = function(title, outputSpeech) {
	return {
		"bodyTemplate1Data": {
			"type": "object",
			"objectId": "bt1Sample",
			"backgroundImage": {
				"contentDescription": null,
				"smallSourceUrl": null,
				"largeSourceUrl": null,
				"sources": [
					{
						"url": "https://s3.amazonaws.com/trendingbucket/TodayInHistory/Background.jpeg",
						// "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT1_Background.png",
						"size": "small",
						"widthPixels": 0,
						"heightPixels": 0
					},
					{
						"url": "https://s3.amazonaws.com/trendingbucket/TodayInHistory/Background.jpeg",
						// "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT1_Background.png",
						"size": "large",
						"widthPixels": 0,
						"heightPixels": 0
					}
				]
			},
			"title": title,
			"textContent": {
				"primaryText": {
					"type": "PlainText",
					"text": outputSpeech
				}
			},
			"logoUrl": "https://s3.amazonaws.com/trendingbucket/TodayInHistory/calendar.png"
		}
	};
}

const getUrl = function (urlParams) {
    // http://api.hiztory.org/date/event/09/24/api.xml
    const baseUrl = "http://api.hiztory.org/date/";
    let url = baseUrl + urlParams.type + "/" + urlParams.month + "/" + urlParams.day + "/api.xml";
    console.log("getUrl:", url);
    return url;
}

const getUrlParams = function (slots) {
	let type, month, day;
	var items = ["birth", "death", "event", "aviation"];
	type = items[Math.floor(Math.random()*items.length)];
	if (slots != null) {
		if (slots.Type != null) {
			if (slots.Type.name == 'Type' && slots.Type.value != null) {
				type = slots.Type.value;
			}
			if (slots.Type.resolutions != null) {
				if ((value = slots.Type.resolutions.resolutionsPerAuthority[0].values[0].value) != null) {
					type = value.name.toLowerCase();
				}
			}
		}
	}
	var date = new Date();
	month = date.getMonth() + 1;
	day = date.getDate();
	var urlParams = {
		"type": type,
		"month": month,
		"day": day
	};
	console.log(urlParams);
	return urlParams;
		// type: ["birth", "death", "event", "aviation"]
}

const getTitle = function(type) {
	return type[0].toUpperCase() + type.slice(1);
}

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
	LaunchRequest,
    GetRemoteDataHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .withApiClient(new Alexa.DefaultApiClient())
  .addErrorHandlers(ErrorHandler)
  .lambda();

