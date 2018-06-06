/*-----------------------------------------------------------------------------
Code own by Esteban Posada and Francisco Mendoza
Project name: SafeMode
NOTE: This code is currently under a lot of development.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request')
var fs = require('fs');
var rp = require('request-promise');

var URI = "https://327c8865.ngrok.io";

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

/*----------------------------------------------------------------------------------------*/
// Some metadata:
var options = ["Submit Incident", "Upload Record"];
var estebanId = '1883610031657548';
/* ---------------------------------------------------------------------------------------- */

// console.log(session.message.sourceEvent.sender);
// console.log(session.message.sourceEvent.recipient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('main');
    },
    function (session, results) {
        var ans = results.response.entity;
        session.userData.option = results.response.entity;
        if (ans == options[0]) {
            session.beginDialog('submitInfo');
        } else if (ans == options[1]) {
            if (true/*session.message.sourceEvent.sender.id == estebanId*/) {
                session.beginDialog('uploadInfo');
            } else {
                session.endDialog("Access Denied. Please contact us if you want to be verified to upload criminal records.");
            }
        }
    },
    function(session, results) {
        if (!results.check) {
            console.log("submit section---------------------------------------------");
            var imageUrl = results.response[0].contentUrl;
            console.log(imageUrl);
            var options = {
                method: 'POST',
                uri: URI + "/employees",
                body: {
                    img_url: imageUrl
                },
                json: true // Automatically stringifies the body to JSON
            };

            rp(options)
                .then(function (parsedBody) {
                    // var buffer = new Buffer(im, 'base64').toString();
                    //"contentType": "image/png",
                    //"contentUrl": "data:image/png;base64,iVBORw0KGgo…",
                    // var bitmap = new Buffer(parsedBody, 'base64');
                    // var h = "result.jpg";
                    // fs.writeFileSync(h, bitmap);
                    session.send({
                        text: "We detected a known criminal with the red box named Esteban Posada, the police and users have been alerted!",
                        attachments: [
                            {
                               //contentType: 'application/octet-stream',
                                //contentType: "image/jpg",
                                contentType: "image/jpg",
                                //contentUrl: ";base64," + parsedBody,
                                //contentUrl: "http://dreamatico.com/data_images/people/people-2.jpg"
                                contentUrl: "https://webchat.botframework.com/attachments/B8HJVZZWJ095EPomBrcgQT/0000004/0/ouput.jpg?t=02wUD5V2Fms.dAA.QgA4AEgASgBWAFoAWgBXAEoAMAA5ADUARQBQAG8AbQBCAHIAYwBnAFEAVAAtADAAMAAwADAAMAAwADQA.j5Jt7HD90wE.Dwwbq_oz2hA.4pqCtOjNKATiH6XAsO4STIsBViwBOJQ-cSBZ_vSWwIk"
                                // name: "hello.jpg"
                            }
                        ]
                    });

                })
                .catch(function (err) {
                    console.log(err);
                });
        }
    }
]).set('storage', tableStorage);

bot.dialog('main', [
   function(session) {
      builder.Prompts.choice(session, "What do you want to do?", ["Submit Incident", "Upload Record"]);
   },
   function (session, results) {
        session.endDialogWithResult(results);
   }
]).endConversationAction('endConversationAction', 'Okay, Bye!', {
    matches: /^exit$/i,
    confirmPrompt: "Are you sure you want to quit this conversation?"
});


bot.dialog('submitInfo', [
    function (session) {
        builder.Prompts.attachment(session, "Please submit the video/image:");
    },
    function (session, results) {
        var info = results.response;
        session.userData.info = info[0].contentUrl;
        session.endDialogWithResult(results);
    }
])
.endConversationAction('endConversationAction', 'Okay, Bye!', {
    matches: /^exit$/i,
    confirmPrompt: "Are you sure you want to quit this conversation?"
});

bot.dialog('uploadInfo', [
    function (session) {
        builder.Prompts.text(session, "Name of the criminal:");
    },
    function (session, results) {
        session.userData.newCriminalName = results.response;
        builder.Prompts.number(session, "Age of the criminal:");
    },
    function (session, results) {
        session.userData.newCriminalAge = results.response;
        builder.Prompts.attachment(session, "Please upload a photo of the crimal:");
        
    },
    function (session, results) {
        var imageUrl = results.response[0].contentUrl;
        console.log("upload section---------------------------------------------");
        console.log(imageUrl);
        var options = {
                method: 'POST',
                uri: URI + "/new_criminal",
                body: {
                    img_url: imageUrl
                },
                json: true // Automatically stringifies the body to JSON
            };
        rp(options)
            .then(function (parsedBody) {
                if (results.response) {
                    session.send("Thanks for submitting the information!");
                    session.endDialogWithResult({check: true});
                } else if (results.response == false){
                    session.send("Let's try again...");
                    session.replaceDialog('uploadInfo');
                } else {
                    session.endDialogWithResult({check: true});
                }
            })
            .catch(function (err) {
                console.log(err);
            });
    }
])
.endConversationAction('endConversationAction', 'Okay, Bye!', {
    matches: /^exit$/i,
    confirmPrompt: "Are you sure you want to quit this conversation?"
});

