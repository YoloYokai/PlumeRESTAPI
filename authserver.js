const express = require('express')
const app = express()
const sql = require('mysql')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const config = require('./db.config')
const secrets = require('./SECRET')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const listenport = 4000

const tokenlife='1d'

const connection = sql.createConnection({
    host: config.HOST,
    user: config.USER,
    password: config.PASSWORD,
    port: config.PORT,
    database: config.DB
})
// start connection ----
connection.connect(function(err) {
    if (err) throw err
    console.log('Connected to Database..')
})

var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'application/*+json' }))
app.use(jsonParser)

app.post('/users/login',async (req, res) => {
  console.log(req.body)
  
  connection.query('SELECT * FROM plumemapper.Surveyors WHERE Username="'+req.body.Username+'"',async function (err, results) {
    await results
    if(err){return res.sendStatus(500)}
    if(results[0]==undefined){return res.sendStatus(400)}
    var cUser=results[0]
  try{
    if(await bcrypt.compare(req.body.Password,cUser.Password)){
      const user = {Username:cUser.Username,UserID:cUser.SurveyorID,ClientID:cUser.ClientID}
      const accessToken = jwt.sign(user,secrets.ACCESS_TOKEN_SECRET,{expiresIn:tokenlife})
      const refreshToken = jwt.sign(user,secrets.REFRESH_TOKEN_SECRET)
      connection.query('INSERT INTO JWT VALUES ("'+refreshToken+'")')
      res.status(200).json({accessToken: accessToken,refreshToken:refreshToken})
    }
    else{
      res.status(400).send("Username or Password is incorrect")
    }
  }
  catch{
    res.status(500).send("")
  }
})})

app.post('/users/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken
  connection.query('SELECT * FROM JWT WHERE Token = "'+refreshToken+'"',(err, results) =>{
  if(results[0].Token==refreshToken){
      
      jwt.verify(refreshToken,secrets.REFRESH_TOKEN_SECRET,(err,cUser)=>{
      if (err){return res.sendStatus(403)}
      else{
        const accessToken = jwt.sign({Username:cUser.Username,UserID:cUser.UserID,ClientID:cUser.ClientID},secrets.ACCESS_TOKEN_SECRET,{expiresIn:tokenlife})
        res.status(200).json({accessToken:accessToken})
      }
      
      }
      )
    }else{
      return res.sendStatus(403)
    }
})})

app.delete('/users/logout',(req,res)=>{
  connection.query('delete from JWT WHERE token ="'+req.body.Token+'"')
  res.sendStatus(200)
})

app.post('/users/create', async (req, res) =>{
  console.log(req.connection.remoteAddress)
  if(req.connection.remoteAddress!="::1"){
    return res.status(500).send("wrong ip")
  }
  try{
    const hashedPassword = await bcrypt.hash(req.body.Password, 10)
    console.log(hashedPassword)
    console.log(req.body)
    var createstring = 'insert into Surveyors(ClientID,Firstname,Lastname,Phonenumber,Email,Username,Password) values ("'+req.body.ClientID+'","'+req.body.Firstname+'","'+req.body.Lastname+'","'+req.body.Phonenumber+'","'+req.body.Email+'","'+req.body.Username+'","'+hashedPassword+'")'
    console.log(createstring)
    connection.query(createstring)
    res.status(201).send(results)
  }
  catch{
    res.sendStatus(500)
  }
})

app.post('/users/pchange',authenticateToken,async(req,res)=>{
  if(req.body.Password==undefined){
    res.sendStatus(400)
  }else{
  const hashedPassword = await bcrypt.hash(req.body.Password, 10)
  connection.query('UPDATE plumemapper.Surveyors SET password = "'+hashedPassword+'" Where SurveyorID ='+req.user.UserID)
  res.sendStatus(200)
  }
})

function authenticateToken(req,res,next){
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(" ")[1]

  if(token == null) return res.sendStatus(401)

  jwt.verify(token,secrets.ACCESS_TOKEN_SECRET,(err,user)=>{
    if(err) return res.sendStatus(403)

  req.user = user
  next()
  })
}
// connect to server ----
app.listen(listenport, () => {
    console.log(`Listening on ${listenport}...`)
})