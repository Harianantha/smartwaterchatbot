/*----------------------------------------------------------------------------------------
* Azure Functions bot templates use Azure Functions Pack for optimal performance, get 
* familiar with Azure Functions Pack at https://github.com/Azure/azure-functions-pack

* This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
* natural language support to a bot. 
* For a complete walkthrough of creating this type of bot see the article at
* https://aka.ms/abs-node-luis
* ---------------------------------------------------------------------------------------- */

"use strict";
const LUISClient = require("./luis_sdk");
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var http = require('http');



var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
//var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
//var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.




// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

console.log (' appId %s',luisAppId);
var LUISclient = LUISClient({
  appId: 'f80c000d-1065-4738-bb7c-4cea31965eee',
  appKey: '181e01565f894894a05d4eb8c3d342ae',
  verbose: true
});




var bot = new builder.UniversalBot(connector, [
function(session){
	console.log("In default");
	//session.send('Welcome. How may we help you.');
	builder.Prompts.text(session, 'Please let us know how we can help you.');	
},
function (session, args) {
   
	session.conversationData.meterId='1234';
	var intent='NA';
	LUISclient.predict(session.message.text, {
					
						//On success of prediction
							onSuccess: function (response) {
							console.log('Response is %s',response);
								
							intent = response.topScoringIntent.intent;
							console.log('Response is');
							console.log(response.topScoringIntent);
							console.log(response)
							var score= response.topScoringIntent.score;
							
							
							console.log('intent received in start is %s',response.topScoringIntent.intent);
							
							console.log('Intent start is:. %s',intent);
							if(score < 0.2){
								console.log('Setting intent in start to NA as score of top scoring intetnt is %s',score);
								intent='NA';
							}
							
							console.log("Intent received is %s",intent )
							
							var dialog=getDialogForIntent(intent);
							session.beginDialog(dialog);
						},

					//On failure of prediction
							onFailure: function (err) {
							console.error(err);
							
						}
				});
}
]);


//bot.localePath(path.join(__dirname, './locale'));
//bot.set('storage', tableStorage);


const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
//var recognizer = new builder.LuisRecognizer(LuisModelUrl);
//bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 
bot.dialog('GreetingDialog',
    (session) => {
        session.send('You reached the Greeting intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Greeting'
})

bot.dialog('HelpDialog',
    (session) => {
        session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Help'
})

bot.dialog('CancelDialog',
    (session) => {
        session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
        session.endDialog();
    }
).triggerAction({
    matches: 'Cancel'
}) 

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = connector.listen();
}


bot.dialog('handleBilling', [
    function (session) {
		
			builder.Prompts.text(session, 'Please Enter your consumer Id or Meter Id');	
			
		
    },
	function (session,results) {
		var meterId= results.response;
		
		var reg = new RegExp('/^(?:[1-9]\d*|\d)$/');
		var validity=isANumber(meterId);
		if(validity){
			session.conversationData.meterId=meterId;
		}else{
			session.send('Please enter a valid MeterId');
			session.endDialog();
		}
		
	}
]).triggerAction({
    matches: [/billing/i,/bill/i, /billing/],
    onInterrupted: function (session) {
       session.send('Welcome to customer Service');
		session.send('We can help you in Billing related queries');
		session.conversationData.lastops='customerservice';
    }
});





bot.dialog('handleConsumption', [
    function (session) {
		
			builder.Prompts.text(session, 'Please Enter your consumer Id or Meter Id');	
			
		
    },
	function (session,results) {
		var meterId= results.response;
		
		var reg = new RegExp('/^(?:[1-9]\d*|\d)$/');
		var validity=isANumber(meterId);
		var consumptionEndPoint=process.env['ConsumptionServiceEndpoint'];
		if(validity){
			session.conversationData.meterId=meterId;
			var header = {
						'Content-Type': 'application/json; charset=utf8',
						'Accept' : 'application/json'
			}
			var now = new Date();
			var endDate = now.toJSON();
			
			var startDate=new Date(now.getFullYear (),now.getMonth(),1);
			var startJson= startDate.toJSON();
			//var startJson=now.getFullYear ()+'-'+now.getMonth()+'-01';
			var consumption={"vendorId":1,"customerId":5,"blockId":0,"houseId":meterId,"startTime":startJson,"endTime":endDate,"Location_Details":"Yes","sampleDistance": "Day","sampleDistanceValue": 1,"metrics": "readings","defaultValueForMissingData":0};
			//var obj = JSON.parse(consumption);
			//console.log('json is %s',obj);
		/*	var options = {
				host: 'localhost',
				port: 8088,
				path: '/leakage/daily/metrics/',
				method: 'POST',
				form : obj,
				json: true
			};*/
			
			/*http.request(options, function(response) {
					//console.log(response);
					
					response.on('data', function (cbresponse) {
						console.log(cbresponse);

					});
					})*/
					 var request = require('request');
					
			request({
					method: 'POST',
					headers:  {
						'Content-Type': 'application/json',
						'Accept' : 'application/json'
						},
					//url: "http://localhost:8085/telemetry/instance/data",
					url:consumptionEndPoint,
					json: consumption
					//form : consumption
			}, function(error, response, body) {
					console.log('error:', error); // Print the error if one occurred
					//console.log('body:', body);
					var responsejson = body;
					var tempconsumption = getConsumption(body);
					var totalConsumption= precisionRound(tempconsumption,1);
				/*	var length=responsejson[0].series.length;
					var totalConsumption=0;
					if(length>0){
					var startConsumption =responsejson[0].series[0].value;
					var endConsumption= responsejson[0].series[length -1 ].value;
					var tempconsumption = endConsumption - startConsumption;
					
					totalConsumption= precisionRound(tempconsumption,1);
					//totalConsumption=Math.pow(getConsumption(body),1);
					//totalConsumption = getConsumption(body);
					}*/
					session.send('Your total consumption so far for the month  is '+ totalConsumption+' meter cubes.');
					
				
			});

		}else{
			session.send('Please enter a valid MeterId');
			session.endDialog();
		}
		
	}
]).triggerAction({
    matches: [/consumption/i,/water consumption/i, /usage/],
    onInterrupted: function (session) {
       session.send('Welcome to customer Service');
		session.send('We can help you in Billing related queries');
		
    }
});

function precisionRound(number, precision) {
  var factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}
function getConsumption(body){
	
	var responsejson = body;
	var length=responsejson[0].series.length;
	var totalConsumption=0;
	if(length>0){
	var startConsumption =responsejson[0].series[0].value;
	var endConsumption= responsejson[0].series[length -1 ].value;
	var totalConsumption= endConsumption - startConsumption;
	}
	return totalConsumption;
}

bot.dialog('NA', [
    function (session) {
		
		if(session.conversationData.lastops == 'ClosingNotes_Happy' || session.message.text.toUpperCase() == 'OK'){
					session.send("Thanks");
					session.endDialog();
		}else{
			
			session.conversationData.lastops='handleNA';
		
			//builder.Prompts.text(session, "Please enter the new address to which you would like to ship your product(Enter in a signle line)");
			session.send("We are sorry, you have typed a request we could not help you");
			session.send("Please type a question related to your jcrew.com experience");
			//session.endConversation();
			session.endDialog();
		}
    }
]);

function getDialogForIntent(intentVal){
  var chosendialog='NA';

  if(intentVal == 'checkbilling'){
    chosendialog='handleBilling';
  }
  
  if(intentVal == 'checkconsumption'){
    chosendialog='handleConsumption';
  }
  if(intentVal == 'NA'){
    chosendialog='NA';
  }
  
   
  
  
   
  return chosendialog;
}

function isANumber( n ) {
    var numStr = /^-?(\d+\.?\d*)$|(\d*\.?\d+)$/;
    return numStr.test( n.toString() );
}
