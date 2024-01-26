const express = require('express')
const app = express()
const axios = require('axios')
const mqtt = require('mqtt');
require('dotenv').config();



app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const uri = process.env.DB_CONNECTION_STRING;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let collection = null
let db = null

const brokerUrl = process.env.BROKEN_URL;
const channelToSubscribe = 'humidityrate';
async function run() {
    try {
       var con =  await client.connect();
        await client.db("admin").command({ ping: 1 });
        db = con.db("project")
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

run().catch(console.dir);

const clientMqtt = mqtt.connect(brokerUrl);

clientMqtt.on('connect', () => {
    console.log('Connecté au broker MQTT');
    clientMqtt.subscribe(channelToSubscribe, (err) => {
        if (!err) {
            console.log(`Abonné au canal ${channelToSubscribe}`);
        } else {
            console.error(`Erreur lors de l'abonnement au canal ${channelToSubscribe}:`, err);
        }
    });
    clientMqtt.subscribe("temp", (err) => {
        if (!err) {
            console.log(`Abonné au canal ${channelToSubscribe}`);
        } else {
            console.error(`Erreur lors de l'abonnement au canal ${channelToSubscribe}:`, err);
        }
    });
});

clientMqtt.on('message', async (topic, message) => {
    console.log(`Message reçu sur le canal ${topic}: ${message}`);

    const binaryData = Buffer.from(message);
    const numberValue = binaryData.toString('utf-8');
    switch (topic){
        case 'humidityrate':
            const dataWater = {
                "water-rate": numberValue,
                date: getDate()
            };
            await saveData(dataWater,"water-rate")
            break;
        case 'temp':
            const dataTemp = {
                "temp": numberValue,
                date: getDate()
            };
            await saveData(dataTemp,"temp")
            break;
        default:
            break;
    }
});

app.post('/water-rate', async (req, res) => {
    try {
        let waterrate = req.body.rate;

        const newDocument = {
            "water-rate": waterrate,
            date: getDate()
        };
        collection = await db.collection("water-rate")
        let result = await collection.insertOne(newDocument);

        if (result == null) {
            res.status(500).json({ success: false });
        } else {
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error('Error processing water-rate post request:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.get('/water-rate/last', async (req,res) => {
    let results;

    try{
        collection = await db.collection("water-rate")
        results = await collection.find({})
            .sort({ _id: -1 })
            .limit(1)
            .toArray();

    }catch (err){
        res.status(500).json({success: false,data: "erreur serveur"})
        return
    }


    if (results.length > 0) {
        const lastInsertedDocument = results[0];


        res.status(200).json({success: true,data: lastInsertedDocument})
    } else {
        res.status(404).json({success: false,message:  "Aucun valeur trouvé"})
    }

})

app.post('/trigger-water', async (req, res) => {
    console.log(req.body.status)
    var open = req.body.status
    clientMqtt.subscribe("triggerwater", (err) => {
        if (!err) {
            clientMqtt.publish("triggerwater", open);
            res.status(200).json({success: true})
        }else{
            res.status(500).json({success: false, msg : "Erreur lors de l'appel du service externe"})
        }

    });

})

app.get('/water-rate/:date', async (req, res) => {
    try {
        const requestedDate = req.params.date;
        collection = await db.collection("water-rate")
        const results = await collection.find({ date: requestedDate }).toArray();
        res.status(200).json({ data: results });
    } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
        res.status(500).json({ error: 'erreur du serveur' });
    }
});


app.get('/temp/last', async (req,res) => {
    let results;

    try{
        collection = await db.collection("temp")
        results = await collection.find({})
            .sort({ _id: -1 })
            .limit(1)
            .toArray();

    }catch (err){
        res.status(500).json({success: false,data: "erreur serveur"})
        return
    }


    if (results.length > 0) {
        const lastInsertedDocument = results[0];


        res.status(200).json({success: true,data: lastInsertedDocument})
    } else {
        res.status(404).json({success: false,message:  "Aucun valeur trouvé"})
    }

})


app.listen(8080, () => {  console.log("Serveur à l'écoute")})


function getDate(){
    const currentDate = new Date();

    const day = currentDate.getDate().toString().padStart(2, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const year = currentDate.getFullYear().toString().slice(2);

    return  `${day}-${month}-${year}`;
}

async function saveData(data , collection ){
    try {
        collection = await db.collection(collection)
        await collection.insertOne(data);
    } catch (error) {
        console.error('Error processing water-rate post request:', error);
    }
}