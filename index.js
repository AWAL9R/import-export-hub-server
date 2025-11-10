const express=require("express")
const cors = require('cors');

require('dotenv').config()

port=process.env.PORT || 3000;
const DB_USER=process.env.DB_USER;
const DB_PASSWORD=process.env.DB_PASSWORD;


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.x53dmvk.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyFireBaseUser = (req, res, next)=>{
    if(req.headers.authorization){
next()
    }

    req.status(401).send({message:"Unauthorized access."})
}


const app=express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res)=>{
    res.send("Server is running...")
})




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

const database = client.db('import_export');
const exports = database.collection('exports');
const imports = database.collection('imports');
const users = database.collection('users');


app.post('/addExport', verifyFireBaseUser, async(req, res)=>{
    const r= await exports.insertOne(req.body)
    console.log(r)
    res.send(JSON.stringify(r))
})




  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}

run().catch(console.dir);





app.listen(port, ()=>{
    console.log(`Server is running on port => ${port}`)
})