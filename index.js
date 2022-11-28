const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    const categoriesDataCollection = client
      .db("resalesPortal")
      .collection("categoriesData");
    const products = client.db("resalesPortal").collection("products");

    const bookingsCollection = client.db("resalesPortal").collection("booking");

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
    

  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("resale server is running");
});

app.listen(port, () => console.log(`Resale portal running on ${port}`));
