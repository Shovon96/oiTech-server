const express = require('express');
const app = express()
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;

// ZDgWxpyElyTwfSVR
// OiTech

// middleWare
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.riywk8u.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // collections
        const featureCollection = client.db('OiTech').collection('features')
        const trendingCollection = client.db('OiTech').collection('trendings')


        // features api
        app.post('/features', async (req, res) => {
            const featuresItem = req.body;
            const result = await featureCollection.insertOne(featuresItem);
            res.send(result)
        })

        app.get('/features', async (req, res) => {
            const result = await featureCollection.find().toArray()
            res.send(result)
        })

        // Trending Products api
        app.post('/trendings', async (req, res) => {
            const featuresItem = req.body;
            const result = await trendingCollection.insertOne(featuresItem);
            res.send(result)
        })

        app.get('/trendings', async (req, res) => {
            const result = await trendingCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("OiTech is running")
})

app.listen(port, () => {
    console.log(`OiTech is runnin on ${port}`);
})