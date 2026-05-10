require('dotenv').config()

const expres= require('express')
const mongoose =require('mongoose')
const cors = require('cors')
const bycrpt = require('bcrypt')

const app = expres()

app.use(expres.json())
app.use(cors())


const url = 'mongodb://localhost:27017/modee4'

mongoose.connect(url)
.then(()=>{
    console.log("Db is connecting")
})
.catch((err)=>{
    console.log("db is not connecting",err)
})

const userroute =require('./Route/userRoute')
app.use('/users',userroute)


const cartRoute= require('./Route/cartRoute')
app.use('/cartUser',cartRoute)

const authRoute = require('./Route/authRoute')
app.use('/auth',authRoute)

const productRoute = require('./Route/productRoute')
app.use('/products',productRoute)

const taskRoute = require('./Route/taskRoute')
app.use('/tasks',taskRoute)

const activityRoute = require('./Route/activityRoute')
app.use('/activities',activityRoute)


const port = 5000

app.listen(port,()=>{
    console.log(`server is running in port ${port}`)
})
