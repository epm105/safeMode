/*-----------------------------------------------------------------------------
Code own by Esteban Posada and Francisco Mendoza
Project name: SafeMode
NOTE: This code is currently under a lot of development.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

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
            if (session.message.sourceEvent.sender.id == estebanId) {
                session.beginDialog('uploadInfo');
            } else {
                session.endDialog("Access Denied. Please contact us if you want to be verified to upload criminal records.");
            }
        }
    },
    function(session, results) {
        if (!results.check) {
            var imageUrl = results.response[0].contentUrl;
            console.log(imageUrl);
            session.send("We are analyzing the information...");
            const params = {
                'returnFaceAttributes': 'age,smile,gender,facialHair,emotion,hair,accessories,exposure'
            };
            const headers = {
                'Content-type': 'application/json'
            };
            const body = {
                "url": results.response[0].contentUrl,
            };
            faceAPICLient.detect({
              params,
              headers,
              body
            }).then((result) => {
               console.log(result);
                if (result.length == 0) {
                    // no face detected
                    session.send("Given image/video doesn't seem to reflect a criminal incident. If you feel that our system might not be classifying your information correctly, please contact us.");
                } else {
                    session.send("Checking if we can recognize any known criminals in the image/video...");
                    //console.log(result[0].faceId);
                    session.send("A known criminal was identified, we reported these information to the police and warned people close by to this incident!");
                    const body = {
                        "faceId": result[0].faceId,
                        "faceIds": ["0520493b-ff55-4ab7-82b6-677d943922ba", "7f6108fa-983b-45f0-ab8b-b4f06ce64937"]
                    };
                    faceAPICLient.findSimilar({
                      body
                    }).then((result) => {
                       console.log(result);
                       if (result.length == 0) {
                           session.send("We couldn't recognize a known criminal, but we have reported the police.");
                       } else if (result[0].confidence > 0.5) {
                         session.send("We detected a known criminal, we just reported this to the police!");
                       } else {
                         session.send("We couldn't recognize a known criminal, but we have reported the police.");
                       }
                    }).catch((err)=>{
                        throw err;
                    });
                }
            }).catch((err)=>{
                throw err;
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
        // session.send("Thanks for submitting the information!");
        // session.send("We are analyzing it...");
        // var result = analyzeInfo(info);
        // //console.log(result);
        // session.endDialog();
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
        session.userData.newCriminalImage = results.response;
        const params = {
            'returnFaceAttributes': 'age,smile,gender,facialHair,emotion,hair,accessories,exposure'
        };
        const headers = {
            'Content-type': 'application/json'
        };
        const body = {
            "url": results.response[0].contentUrl,
        };
        faceAPICLient.detect({
          params,
          headers,
          body
        }).then((result) => {
           console.log(result);
           if (result.length == 0) {
                // no face detected
                session.send("We couldn't recognize any face(s) in the image/video you just uploaded.");
                session.endDialogWithResult({check: true});
            } else {
                session.send("We were able to identity face(s) in the image/video uploaded! Thanks for cotributing towards the the security of all!");
                session.send("Criminal's Name: " + session.userData.newCriminalName);
                session.send("Criminal's Age: " + session.userData.newCriminalAge);
                session.send("Criminal's Gender: Male");
                session.send("Criminal's Hair Color: Black");
                
                builder.Prompts.confirm(session, "Is this information correct?");
            }
        }).catch((err)=>{
            throw err;
        });
    },
    function (session, results) {
        console.log(results.response);
        if (results.response) {
            session.send("Thanks for submitting the information!");
            session.endDialogWithResult({check: true});
        } else if (results.response == false){
            session.send("Let's try again...");
            session.replaceDialog('uploadInfo');
        } else {
            session.endDialogWithResult({check: true});
        }
    }
])
.endConversationAction('endConversationAction', 'Okay, Bye!', {
    matches: /^exit$/i,
    confirmPrompt: "Are you sure you want to quit this conversation?"
});

var api = require('cognitive-services');
var faceAPICLient = new api.face({
        apiKey: "fb9baf3bc1ee4429883fdf59576d7544",
        endpoint: "southcentralus.api.cognitive.microsoft.com"
});

function faceInfo(info) {
    var faceInf = null;
    const params = {
        'returnFaceAttributes': 'age,smile,gender,facialHair,emotion,hair,accessories,exposure'
    };
    const headers = {
        'Content-type': 'application/json'
    };
    const body = {
        "url": info,
    };
    faceAPICLient.detect({
      params,
      headers,
      body
    }).then((result) => {
       console.log(result);
       faceInf = result;
    }).catch((err)=>{
        throw err;
    });
    // const request = require('request');
    // const rp = require('request-promise');
    
    // return new Promise((resolve, reject) => {
    //     var body = {
    //     url: info
    //  };
    // var options = {
    //     'Ocp-Apim-Subscription-Key': 'fb9baf3bc1ee4429883fdf59576d7544', 
    //     'Content-type': 'application/json',
    //     'url': 'https://southcentralus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceAttributes=age,smile,gender,facialHair,emotion,hair,accessories,exposure',
    //     'method': 'POST',
    //     'body': body
    //  };
    //  return rp(options).then(body => {
    //     console.log("we replied sucessfully");
    //     console.log(body);
    //     resolve({status: "OK"});
    //  }).catch(err => {
    //     console.log("We couldn't send the response: ", err);
    //     reject({status: "Error"});
    //  });
    // });
}

function faceCompare() {
    const body = {
        "faceId": "0520493b-ff55-4ab7-82b6-677d943922ba",
        "faceIds": ["48ad8af4-8d71-42fd-9839-e8e204c102a0", "0520493b-ff55-4ab7-82b6-677d943922ba"]
    };
    faceAPICLient.findSimilar({
      body
    }).then((result) => {
       console.log(result);
       if (result[0].confidence > 0.5) {
           isCriminal = true;
       } else {
           isCriminal = false;
       }
    }).catch((err)=>{
        throw err;
    });
}
