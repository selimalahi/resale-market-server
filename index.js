const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());
 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tlsdvvb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});



function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}



async function run() {
  try {
    const categoriesDataCollection = client
      .db("resalesPortal")
      .collection("categoriesData");
    const products = client.db("resalesPortal").collection("products");
    const bookingsCollection = client.db("resalesPortal").collection("booking");
    const usersCollection = client.db("resalesPortal").collection("users");

    app.get("/categoriesData", async (req, res) => {
      const query = {};
      const datas = await categoriesDataCollection.find(query).toArray();
      res.send(datas);
    });

    app.get("/", async (req, res) => {
      const query = {};
      const cursor = products.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/product/:id", async (req, res) => {
        const id = req.params.id;
        const query = { category_id: id };
        const product = await products.find(query).toArray();
        res.send(product);
      });

    // bookink collection
     
    app.post('/bookings', async(req, res) =>{
        const booking =req.body
        console.log(booking);
        const result =await bookingsCollection.insertOne(booking);
        res.send(result);
    })

    // my booking 
    app.get('/bookings', verifyJWT, async (req, res) =>{
        const email = req.query.email;
        const decodedEmail = req.decoded.email;

        if (email !== decodedEmail) {
            return res.status(403).send({ message: 'forbidden access' });
        }
    
        const query ={ email: email };
        const booking = await bookingsCollection.find(query).toArray();
        res.send(booking);
    })

    // get all users    
    app.get('/users', async (req, res) => {
        const query = {};
        const users = await usersCollection.find(query).toArray();
        res.send(users);
    });
     

    // create token

    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            return res.send({ accessToken: token });
        }
        res.status(403).send({ accessToken: '' })
    });

    app.post('/users', async (req, res) => {
        const user = req.body;
        console.log(user);
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });
    

  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("resale server is running");
});

app.listen(port, () => console.log(`Resale portal running on ${port}`));
