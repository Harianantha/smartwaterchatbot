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
		var consumptionEndPoint=process.env['ConsumptionServiceEndpoint'];
		var supplyEndPoint=process.env['supplyServiceEndpoint'];
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
			console.log('Invoking supply/last');
			//var startJson=now.getFullYear ()+'-'+now.getMonth()+'-01';
			var consumption={"vendorId":1,"customerId":5,"blockId":0,"houseId":meterId,"startTime":startJson,"endTime":endDate,"Location_Details":"Yes","sampleDistance": "Day","sampleDistanceValue": 1,"metrics": "readings","defaultValueForMissingData":0};
		   var request = require('request');
			var url= supplyEndPoint+meterId;		
			request({
					method: 'GET',
					headers:  {
						'Content-Type': 'application/json',
						'Accept' : 'application/json'
						},
					//url: "http://localhost:8085/telemetry/instance/data",
					url:url
					//json: consumption
					//form : consumption
			}, function(error, response, body) {
					console.log('error:', error); // Print the error if one occurred
					/*console.log('body:', body);
					console.log('Projeted consumption:', body.projectedCurrentMonthConsumption);*/
					var respObj=JSON.parse(body);
					var responsejson = body;
					
					
					var projectedconsumption=respObj.projectedCurrentMonthConsumption;
					var totalConsumption= respObj.currentMonthConsumptionTillDate;
					var billSoFar=precisionRound((totalConsumption*10),1);
					var projectedbill=respObj.projectedRevenueThisMonth;
				
					session.send('Your consumption till date far for this month  is '+ totalConsumption+' meter cubes.');
					session.send('Your projected consumption for this month  is '+ projectedconsumption+' meter cubes.');
					session.send('Your bill till date  for this month  is '+ billSoFar+' rupees.');
					session.send('Your projected bill for this month  is '+ projectedbill+' rupees.');
					session.endDialog();
				
			});

		}else{
			session.send('MeterId enter is invalid');
			session.beginDialog('handleBilling');
		}
		
	}
]);


bot.dialog('handleLastMonthBilling', [
    function (session) {
		
			builder.Prompts.text(session, 'Please Enter your consumer Id or Meter Id');	
			
		
    },
	function (session,results) {
		var meterId= results.response;
		
		var reg = new RegExp('/^(?:[1-9]\d*|\d)$/');
		var validity=isANumber(meterId);
		var consumptionEndPoint=process.env['ConsumptionServiceEndpoint'];
		var supplyEndPoint=process.env['supplyServiceEndpoint'];
		if(validity){
			session.conversationData.meterId=meterId;
			var header = {
						'Content-Type': 'application/json; charset=utf8',
						'Accept' : 'application/json'
			}
			var startDate = new Date();
			
			startDate.setMonth(startDate.getMonth()-1);
			startDate.setDate(1);

			
			var startJson= startDate.toJSON();
			
			var endDate = new Date();
			
			endDate.setMonth(endDate.getMonth()-1);
			endDate.setDate(30);

			
			var startJson= startDate.toJSON();
			
			var endJson= endDate.toJSON();
			var url= supplyEndPoint+meterId;		
			//var startJson=now.getFullYear ()+'-'+now.getMonth()+'-01';
			var consumption={"vendorId":1,"customerId":5,"blockId":0,"houseId":meterId,"startTime":startJson,"endTime":endJson,"Location_Details":"Yes","sampleDistance": "Day","sampleDistanceValue": 1,"metrics": "readings","defaultValueForMissingData":0};
		   var request = require('request');
					
			request({
					method: 'GET',
					headers:  {
						'Content-Type': 'application/json',
						'Accept' : 'application/json'
						},
					//url: "http://localhost:8085/telemetry/instance/data",
					url:url
					//json: consumption
					//form : consumption
			}, function(error, response, body) {
					console.log('error:', error); // Print the error if one occurred
					
					var respObj=JSON.parse(body);
					
					
					var totalConsumption= respObj.lastMonthConsumption;
					var billSoFar = respObj.revenueLastMonth;
					
					session.send('Your last month consumption   is '+ totalConsumption+' meter cubes.');
					session.send('Your bill for last  month  is '+ billSoFar+' rupees.');
					session.endDialog();
				
			});

		}else{
			session.send('MeterId enter is invalid');
			session.beginDialog('handleBilling');
		}
		
	}
]);





bot.dialog('handleConsumption', [
    function (session) {
		
			builder.Prompts.text(session, 'Please Enter your consumer Id or Meter Id');	
			
		
    },
	function (session,results) {
		var meterId= results.response;
		
		var reg = new RegExp('/^(?:[1-9]\d*|\d)$/');
		var validity=isANumber(meterId);
		var consumptionEndPoint=process.env['ConsumptionServiceEndpoint'];
		var supplyEndPoint=process.env['supplyServiceEndpoint'];
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
		   var request = require('request');
			var url= supplyEndPoint+meterId;			
			request({
					method: 'GET',
					headers:  {
						'Content-Type': 'application/json',
						'Accept' : 'application/json'
						},
					//url: "http://localhost:8085/telemetry/instance/data",
					url:url
					
			}, function(error, response, body) {
					console.log('error:', error); // Print the error if one occurred
					//console.log('body:', body);
					
					var respObj=JSON.parse(body);
					
					var totalConsumption=respObj.currentMonthConsumptionTillDate;
					var projectedconsumption=respObj.projectedCurrentMonthConsumption;
					
				
					session.send('Your consumption till date far for this month  is '+ totalConsumption+' meter cubes.');
					session.send('Your estimated consumption for this month  is '+ projectedconsumption+' meter cubes.');
					session.endDialog();
				
			});

		}else{
			session.send('MeterId enter is invalid');
			session.beginDialog('handleConsumption');
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
	var totalConsumption=0;
	
	if(responsejson && responsejson.length > 0 && responsejson[0].series){
	var length=responsejson[0].series.length;
	
		if(length>0){
		var startConsumption =responsejson[0].series[0].value;
		var endConsumption= responsejson[0].series[length -1 ].value;
		var totalConsumption= endConsumption - startConsumption;
		}
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
			session.send("We could help you in your billing and consumption related questions.");
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
  if(intentVal == 'lastmonthbill'){
    chosendialog='handleLastMonthBilling';
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
