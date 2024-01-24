const express = require('express')
const app = express()
const axios = require('axios')

app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const uri = "mongodb+srv://waterate:vOndAQfmY5PFOcK3@cluster0.7fw2ar9.mongodb.net/?retryWrites=true&w=majority";

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

// Move the client.close() outside the finally block
run().catch(console.dir);


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

app.post('trigger-water', async (req, res) => {

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
app.listen(8080, () => {  console.log("Serveur à l'écoute")})


function getDate(){
    const currentDate = new Date();

    const day = currentDate.getDate().toString().padStart(2, '0'); // jour avec zéro initial s'il est inférieur à 10
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // mois avec zéro initial s'il est inférieur à 10
    const year = currentDate.getFullYear().toString().slice(2); // année avec seulement les deux derniers chiffres

    return  `${day}-${month}-${year}`;
}