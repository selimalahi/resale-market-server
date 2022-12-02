const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")('STRIPE_SECRET');

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
  console.log(authHeader, "authheader");
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    console.log(err);
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesDataCollection = client
      .db("resalesPortal")
      .collection("categoriesData");
    const products = client.db("resalesPortal").collection("products");
    const bookingsCollection = client.db("resalesPortal").collection("booking");
    const usersCollection = client.db("resalesPortal").collection("users");
    const paymentsCollection = client.db("resalesPortal").collection("payment");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
       
    // verifyBuyer

    const verifyBuyer = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "buyer") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
     
    //   veryfy Seller

    const verifySeller= async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/categoriesData", async (req, res) => {
      const query = {};
      const datas = await categoriesDataCollection.find(query).toArray();
      res.send(datas);
    });

    // app.get("/", async (req, res) => {
    //   const query = {};
    //   const cursor = products.find(query);
    //   const services = await cursor.toArray();
    //   res.send(services);
    // });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const product = await products.find(query).toArray();
      res.send(product);
    });

    // add a product

    app.get('/addproducts', async (req, res) => {
      const query = {}
      const result = await products.find(query).project({ category_name: 1 }).toArray();
      res.send(result);
  })

    //  payment method get single id
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });


    // payment colection 

    app.post('/payments', async (req, res) =>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId
      const filter = {_id: ObjectId(id)}
      const updatedDoc = {
          $set: {
              paid: true,
              transactionId: payment.transactionId
          }
      }
      const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
      res.send(result);
  })


    // booking collection

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // my booking
    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking);
    });

    // all seller get

    // app.get('/allseller', verifyJWT, async (req, res) =>{
    //     const role = req.query.role;
    //     const decodedEmail = req.decoded.role;

    //     if (role !== decodedEmail) {
    //         return res.status(403).send({ message: 'forbidden access' });
    //     }

    //     const query ={ role: role };
    //     const result = await bookingsCollection.find(query).toArray();
    //     res.send(result);
    // })

    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // get all seller
    app.get("/allusers", async (req, res) => {
      const role = req.query.role;
      const query = { role: role };
      const allusers = await usersCollection.find(query).toArray();
      console.log(allusers);
      res.send(allusers);
    });

    // create token

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // admin check ?
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // Buyer check

    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };      
      const user = await usersCollection.findOne(query);
      // console.log({ isBuyer: user?.role === "buyer" })
      res.send({ isBuyer: user?.role === "buyer" });
    });

    // seller check

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };      
      const user = await usersCollection.findOne(query);
      // console.log({ isBuyer: user?.role === "seller" })
      res.send({ isSeller: user?.role === "seller" });
    });

    // make admin 

    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // make seller
    // app.put("/users/buyer/:id", verifyJWT, verifyBuyer, async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       role: "buyer",
    //     },f
    //   };

    //   const result = await usersCollection.updateOne(
    //     filter,
    //     updateDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    // delete user

    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // delete seller 

    app.delete("/seller/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // payment
    app.post('/create-payment-intent', async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          "payment_method_types": [
              "card"
          ]
      });
      res.send({
          clientSecret: paymentIntent.client_secret,
      });
  });
 

  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("resale server is running");
});

app.listen(port, () => console.log(`Resale portal running on ${port}`));
