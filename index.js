const express=require("express")
const cors = require('cors');

require('dotenv').config()

port=process.env.PORT || 3000;
const DB_USER=process.env.DB_USER;
const DB_PASSWORD=process.env.DB_PASSWORD;


// // encode.js
// const fs = require("fs");
// const key = fs.readFileSync("./import-export-lab-firebase-adminsdk-fbsvc-29b22348b6.json", "utf8");
// const base64 = Buffer.from(key).toString("base64");
// console.log(base64);


//firebase
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FIREBASE_ADMIN, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});







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
const exportsCol = database.collection('exports');
const importsCol = database.collection('imports');
const usersCol = database.collection('users');



const verifyFireBaseUser = async(req, res, next)=>{
    // console.log(req)
    if(req.headers.authorization){
    const token=req.headers.authorization.split(" ")[1]
    if(!token){
        res.status(401).send({message:"Unauthorized access."})
    }
    try{
        const userInfo =await admin.auth().verifyIdToken(token)
        const user=await usersCol.findOne({email:userInfo.email})
        //add user to the database if not exists
        if(!user){
            const userInsert=await usersCol.insertOne(userInfo);
            if(!userInsert.insertedId){
                return res.status(503).send({message:"Service unavailable"})
            }
        }
        req.this_user=user;
        return next()
    }catch(err){
        // console.log(err)
       return res.status(503).send({message:"Service unavailable."})
    }
    }

    return res.status(401).send({message:"Unauthorized access."})
}


app.post('/addExport', verifyFireBaseUser, async(req, res)=>{
    console.log(req.this_user)
    const r= await exportsCol.insertOne(req.body)
    // console.log(r)
    res.send(r)
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