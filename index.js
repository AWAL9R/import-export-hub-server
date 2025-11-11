const express = require("express")
const cors = require('cors');

require('dotenv').config()

port = process.env.PORT || 3000;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;


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







const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.x53dmvk.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
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



        const verifyFireBaseUser = async (req, res, next) => {
            // console.log(req)
            if (req.headers.authorization) {
                const token = req.headers.authorization.split(" ")[1]
                if (!token) {
                    res.status(401).send({ message: "Unauthorized access." })
                }
                try {
                    const userInfo = await admin.auth().verifyIdToken(token)
                    const user = await usersCol.findOne({ email: userInfo.email })
                    //add user to the database if not exists
                    //TODO you may need to update user infos when user updates his profile
                    if (!user) {
                        const userInsert = await usersCol.insertOne(userInfo);
                        if (!userInsert.insertedId) {
                            return res.status(503).send({ message: "Service unavailable" })
                        }
                    }
                    req.this_user = user;
                    return next()
                } catch (err) {
                    // console.log(err)
                    return res.status(503).send({ message: "Service unavailable." })
                }
            }

            return res.status(401).send({ message: "Unauthorized access." })
        }




        app.get('/myExports', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)

            const cursor = exportsCol.find({ user_id: req.this_user._id })
            result = await cursor.toArray()
            // console.log(r)
            res.send(result)
        })

        app.get('/myImports', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)
            // find({ user_id: req.this_user._id })
            const cursor = importsCol.aggregate([
                { $match: { user_id: req.this_user._id } },
                {
                    $lookup: {
                        from: "exports",          // foreign collection
                        localField: "product_id",  // field in orders
                        foreignField: "_id",       // matching field in products
                        as: "product"              // output array field
                    }
                },
                {
                    $lookup: {
                        from: "users",          // foreign collection
                        localField: "user_id",  // field in orders
                        foreignField: "_id",       // matching field in products
                        as: "user"              // output array field
                    }
                },
                { $unwind: "$product" },       // optional: flatten product array
                { $unwind: "$user" }
            ])
            result = await cursor.toArray()
            // console.log(r)
            res.send(result)
        })

        app.get('/products', async (req, res) => {
            // console.log(req.this_user)

            const cursor = exportsCol.find().sort({ createdAt: -1 })

            if (req.query.limit) {
                let limit = 0;
                try {
                    limit = parseInt(req.query.limit)
                } catch (err) { }
                cursor.limit(limit)
            }

            const result = await cursor.toArray()
            // console.log(r)
            res.send(result)
        })

        app.post('/products', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)
            req.body.user_id = req.this_user._id
            req.body.createdAt = new Date().getTime()

            //do not change id by hackers
            delete req.body._id;

            const result = await exportsCol.insertOne(req.body)
            // console.log(r)
            res.send(result)
        })

        app.get('/products/:id', async (req, res) => {
            // console.log(req.this_user)

            const result = await exportsCol.findOne({ _id: new ObjectId(req.params.id) })
            // console.log(r)
            res.send(result)
        })

        app.delete('/products/:id', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)

            const result = await exportsCol.findOne({ _id: new ObjectId(req.params.id) })
            if (!result) {
                return res.status(404).send({ message: "Product Not found." })
            }
            if (!result.user_id.equals(req.this_user._id)) {
                return res.status(403).send({ message: "Forbidden access. Insufficient permission to access this resource." })
            }

            const result2 = await exportsCol.deleteOne({ _id: new ObjectId(req.params.id) })
            // console.log(r)
            res.send(result2)
        })

        app.patch('/products/:id', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)

            const result = await exportsCol.findOne({ _id: new ObjectId(req.params.id) })
            if (!result) {
                return res.status(404).send({ message: "Product Not found." })
            }
            if (!result.user_id.equals(req.this_user._id)) {
                return res.status(403).send({ message: "Forbidden access. Insufficient permission to access this resource." })
            }

            //do not change id by hackers
            delete req.body._id;

            const result2 = await exportsCol.updateOne({ _id: new ObjectId(req.params.id) }, [{ $set: req.body }])
            // console.log(r)
            res.send(result2)
        })


        app.post('/imports', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)

            const newImport = {
                user_id: req.this_user._id,
                createdAt: new Date().getTime(),
                quantity: req.body.quantity,
                product_id: new ObjectId(req.body.product_id)
            }

            const product = await exportsCol.findOne({ _id: new ObjectId(req.body.product_id) })

            const newQuantity = parseInt(product.quantity) - parseInt(req.body.quantity)

            if (newQuantity >= 0) {
                const update = await exportsCol.updateOne({ _id: new ObjectId(req.body.product_id) }, [{ $set: { quantity: newQuantity } }])
                // console.log(update)
                if (update.modifiedCount) {
                    product.quantity = newQuantity;
                    const insert = await importsCol.insertOne(newImport)
                    if (insert.insertedId) {
                        return res.send({ ...insert, success: true, product, message: "You imported " + product.name + ". see more on My imports page" })
                    }
                }
            }

            return res.status(200).send({ message: "Unable to fulfil your request", product })
        })

        app.delete('/imports/:id', verifyFireBaseUser, async (req, res) => {
            // console.log(req.this_user)

            const result = await importsCol.findOne({ _id: new ObjectId(req.params.id) })
            if (!result) {
                return res.status(404).send({ message: "Import Not found." })
            }
            if (!result.user_id.equals(req.this_user._id)) {
                return res.status(403).send({ message: "Forbidden access. Insufficient permission to access this resource." })
            }

            const result2 = await importsCol.deleteOne({ _id: new ObjectId(req.params.id) })
            // console.log(r)
            res.send(result2)
        })




    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);





app.listen(port, () => {
    console.log(`Server is running on port => ${port}`)
})