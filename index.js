const express = require('express');
const app = express()
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);



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
        const paymentCollection = client.db('OiTech').collection('payments')


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

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

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

        // app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
        //     const result = await userCollection.find().toArray()
        //     res.send(result);
        // })

        // app.delete('/users/:id', verifyAdmin, verifyToken, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await userCollection.deleteOne(query);
        //     res.send(result);
        // })

        // app.patch('/users/admin/:id', verifyAdmin, verifyToken, async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) }
        //     const updatedDoc = {
        //         $set: { role: 'admin' }
        //     }
        //     const result = await userCollection.updateOne(filter, updatedDoc);
        //     res.send(result)
        // })

        // chack admin or not
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        // features api
        app.post('/features', verifyToken, async (req, res) => {
            const featuresItem = req.body;
            const result = await featureCollection.insertOne(featuresItem);
            res.send(result)
        })

        // features all products get
        app.get('/features', async (req, res) => {
            const result = await featureCollection.find().toArray()
            res.send(result)
        })

        // for product details route
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

        // trendings all data get
        app.get('/trendings', async (req, res) => {
            const result = await trendingCollection.find().toArray()
            res.send(result)
        })

        // for product details route
        app.get('/trending/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await trendingCollection.findOne(query)
            res.send(result);
        })

        // for user product show in email
        app.get('/trendings/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'owner.email': email }
            const result = await trendingCollection.find(query).toArray()
            res.send(result);
        })

        // update products one item api
        app.patch('/trendings/:id', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: item.name,
                    image: item.image,
                    description: item.description,
                    tags: item.tags,
                    externalLinks: {
                        officialSite: item.officialSite,
                        documentation: item.documentation,
                        github: item.github
                      }
                }
            }
            const result = await trendingCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        // product sort by upVote
        app.get('/sort', async (req, res) => {
            const { sort } = req.query;
            if (sort) {
                const result = await trendingCollection.find().sort({ upvotes: -1 }).toArray()
                res.send(result)
                return
            }
            res.send('invalid request')
        })

        // create-payment-intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            if (!price || amount < 1) return;
            const { client_secret } = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: client_secret });
        });

        // Save classInfo in enrolledClassesCollection
        app.post("/subscribers", async (req, res) => {
            const info = req.body;
            const result = await paymentCollection.insertOne(info);
            res.send(result);
        });

        app.get('/subscribers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.findOne(query)
            res.send(result)
        })

        // app.get('/payments/:email', verifyToken, async (req, res) => {
        //     const query = { email: req.params.email }
        //     if (req.params.email !== req.decoded.email) {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }
        //     const result = await paymentCollection.find(query).toArray()
        //     res.send(result)
        // })


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