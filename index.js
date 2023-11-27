const express = require('express');
const app = express()
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// middleWare
app.use(cors())
app.use(express.json())


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
        const userCollection = client.db('OiTech').collection('users')


        // jwt releted api 
    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
        res.send({ token });
      })
  
      // middleware varify token
      const verifyToken = (req, res, next) => {
        // console.log('inside verify token',req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorize access' })
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
          if (error) {
            return res.status(401).send({ message: 'unauthorize access' })
          }
          req.decoded = decoded;
          next()
        })
      }

        // features api
        app.post('/features', verifyToken, async (req, res) => {
            const featuresItem = req.body;
            const result = await featureCollection.insertOne(featuresItem);
            res.send(result)
        })

        app.get('/features', async (req, res) => {
            const result = await featureCollection.find().toArray()
            res.send(result)
        })

        app.get('/features/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await featureCollection.findOne(query)
            res.send(result);
        })

        // Trending Products api
        app.post('/trendings', verifyToken, async (req, res) => {
            const featuresItem = req.body;
            const result = await trendingCollection.insertOne(featuresItem);
            res.send(result)
        })

        app.get('/trendings', async (req, res) => {
            const result = await trendingCollection.find().toArray()
            res.send(result)
        })

        app.get('/trendings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await trendingCollection.findOne(query)
            res.send(result);
        })

        // product sort by upVote
        app.get('/sort', async (req, res) => {
            const {sort} = req.query;
            if (sort) {
                const result = await trendingCollection.find().sort({ upvotes: -1 }).toArray()
                res.send(result)
                return
            }
            res.send('invalid request')
        })

        // user releted apis
    app.post('/users', async (req, res) => {
        const user = req.body;
        // insert email if user exists:
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists', insertedId: null })
        }
        const result = await userCollection.insertOne(user)
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