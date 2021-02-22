const express = require('express')
const app = express()
const sql = require('mysql')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const config = require('./db.config')
const secrets = require('./SECRET')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const listenport = 3000;
const fs = require('fs')
const tokenlife='7d'

//connection details
const connection = sql.createConnection({
    host: config.HOST,
    user: config.USER,
    password: config.PASSWORD,
    port: config.PORT,
    database: config.DB
})

//Start connection
connection.connect(function(err) {
    if (err) throw err
    console.log('Connected to Database..')
})

var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'application/*+json' }))
app.use(jsonParser)
app.use(logger)
app.use(Cleaner)

//functions

//clear text of symbols
function clean(str){
  return str.replace(/[^-.(:,)\w\s]/gi, '')
}

//Authenticate JWT token
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

//Logging function that records some information of each request
function logger(req, res, next){
  let current_datetime = new Date();
  let formatted_date =
    current_datetime.getFullYear() +
    "-" +
    (current_datetime.getMonth() + 1) +
    "-" +
    current_datetime.getDate() +
    " " +
    current_datetime.getHours() +
    ":" +
    current_datetime.getMinutes() +
    ":" +
    current_datetime.getSeconds();
  let method = req.method;
  let url = req.url;
  if(req.user == undefined)
  {
    log = `[${formatted_date}] Method:${method} Route:${url} IP:${req.connection.remoteAddress}`
  }
  else{
    User = req.user.Username;
    log = `[${formatted_date}] Method:${method} Route:${url} User:${User} IP:${req.connection.remoteAddress}`

  }
  console.log(log);
  fs.appendFile('log.txt', log+'\n', function (err) {
  if (err) {
    // append failed
  } else {
    // done
  }})
  next();
}

//Clean bodies of user input
function Cleaner(req,res,next){
  if(req.body!={}){
  for(var i in req.body){
    console.log(i)
    for(var j in req.body[i]){
      if(!isNaN(Number(req.body[i][j]))){
        req.body[i][j]=Number(req.body[i][j])
      }
      else{
        req.body[i][j] = clean(req.body[i][j])
      }
    }
  }}
  next()
}

//User login and refresh methods
app.post('/users/login',async (req, res) => {  
  connection.query('SELECT * FROM plumemapper.Surveyors WHERE Username="'+clean(req.body.Username)+'"',async function (err, results) {
    await results
    if(err){return res.sendStatus(500)}
    if(results[0]==undefined){return res.sendStatus(400)}
    var cUser=results[0]
  console.log(clean(req.body.Username))
  try{
    if(await bcrypt.compare(req.body.Password,cUser.Password)){
      console.log('works')
      const user = {Username:cUser.Username,UserID:cUser.SurveyorID,ClientID:cUser.ClientID}
      const accessToken = jwt.sign(user,secrets.ACCESS_TOKEN_SECRET,{expiresIn:tokenlife})
      //const refreshToken = jwt.sign(user,secrets.REFRESH_TOKEN_SECRET)
      //connection.query('INSERT INTO JWT VALUES ("'+refreshToken+'")')
      res.status(200).json({accessToken: accessToken})//,refreshToken:refreshToken})
    }
    else{
      res.status(400).send("Username or Password is incorrect")
    }
  }
  catch{
    res.status(500).send("")
  }
})})







app.post('/test',(req,res)=>{
  res.send(req.body)
})

//app.post('/users/refresh', (req, res) => {
//  const refreshToken = req.body.refreshToken
//  connection.query('SELECT * FROM JWT WHERE Token = "'+refreshToken+'"',(err, results) =>{
//  if(results[0].Token==refreshToken){
//      
//      jwt.verify(refreshToken,secrets.REFRESH_TOKEN_SECRET,(err,cUser)=>{
//      if (err){return res.sendStatus(403)}
//      else{
//        const accessToken = jwt.sign({Username:cUser.Username,UserID:cUser.UserID,ClientID:cUser.ClientID},secrets.ACCESS_TOKEN_SECRET,{expiresIn:tokenlife})
//        res.status(200).json({accessToken:accessToken})
//      }
//      
//      }
//      )
//    }else{
//      return res.sendStatus(403)
//    }
//})})

//app.delete('/users/logout',(req,res)=>{
//  connection.query('delete from JWT WHERE token ="'+req.body.Token+'"')
//  res.sendStatus(200)
//})


app.get('/users/free',(req,res)=>{
  connection.query('select (select count(SurveyorID) from plumemapper.Surveyors where Username="'+req.query.Username+'") as "count";', function (err, results) {
       console.log(results[0].count)
       if(results[0].count==0){
        res.send("free")
       }else{
        res.send("taken")
       }
   })
})

app.post('/users/create', async (req, res) =>{
  console.log(req.connection.remoteAddress)
  if(req.connection.remoteAddress!="::1"){
    return res.sendStatus(401)
  }
  try{
    req.body.password
    const hashedPassword = await bcrypt.hash(req.body.Password, 10)
    var createstring = 'insert into Surveyors(ClientID,Firstname,Lastname,Phonenumber,Email,Username,Password) values ("'+req.body.ClientID+'","'+req.body.Firstname+'","'+req.body.Lastname+'","'+req.body.Phonenumber+'","'+req.body.Email+'","'+req.body.Username+'","'+hashedPassword+'")'
    console.log(createstring)
    connection.query(createstring, function (err, results) {res.status(201).send(results)})
  }
  catch{
    res.sendStatus(500)
  }
})

//all methods here on require JWT auth token
app.use(authenticateToken)

app.post('/users/pchange',async(req,res)=>{
  if(req.body.Password==undefined){
    res.sendStatus(400)
  }else{
  const hashedPassword = await bcrypt.hash(req.body.Password, 10)
  connection.query('UPDATE plumemapper.Surveyors SET password = "'+hashedPassword+'" Where SurveyorID ='+req.user.UserID)
  res.sendStatus(200)
  }
})




//Features
app.get('/expiration',(req,res)=>{
  test = new Date(req.user.exp * 1000)
  res.send({"exp":test})
})

//Get Requests
app.get("/sites",function(req, res) {
  SiteID = Number(req.query.SiteID)
  Client = req.query.Client
    if(req.query.SiteID==undefined){
      connection.query('SELECT SiteID,SiteName,Address,Client,Longitude,Latitude,Comments,A,B,C,D,E,F FROM Site WHERE ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
   })}
    else if((typeof SiteID == "number" && !isNaN(SiteID))){
      connection.query('SELECT SiteID,SiteName,Address,Client,Longitude,Latitude,Comments,A,B,C,D,E,F FROM Site WHERE SiteID='+ SiteID+' and ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
    })} 
    else{
      res.sendStatus(400)
    } 
})

app.get("/Surveyors", function(req, res) {
  SurveyorID = Number(req.query.SurveyorID)
    if(req.query.SurveyorID==undefined){
    connection.query('select SurveyorID,Firstname,Lastname,Phonenumber,Email,Username from plumemapper.Surveyors where ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
   })}
    else if((typeof SurveyorID == "number" && !isNaN(SurveyorID))){
      connection.query('select SurveyorID,Firstname,Lastname,Phonenumber,Email,Username from plumemapper.Surveyors where ClientID='+req.user.ClientID+' and SurveyorID='+req.query.SurveyorID, function (err, results) {
       res.send(results)
   })}
    else{
      res.sendStatus(400)
    } 
})

app.get("/SiteSources", function(req, res) {
  SiteID = Number(req.query.SiteID)
  if(req.query.SiteID==undefined){
    connection.query('select * from plumemapper.SourcesAtSite where SiteID in (select SiteID from plumemapper.Site where ClientID='+req.user.ClientID+')', function (err, results) {
       res.send(results)
   })}
  else if((typeof SiteID == "number" && !isNaN(SiteID))){
    connection.query('select * from plumemapper.SourcesAtSite where SiteID in (select SiteID from plumemapper.Site where ClientID='+req.user.ClientID+ ' and SiteID='+SiteID+')', function (err, results) {
       res.send(results)
   })}
  else{
      res.sendStatus(400)
    } 
})

app.get("/charactersatsite", function(req, res) {
  SiteID = Number(req.query.SiteID)
  if(req.query.SiteID==undefined){
    connection.query('select * from plumemapper.CharacteratSite where SiteID in (select SiteID from plumemapper.Site where ClientID='+req.user.ClientID+')', function (err, results) {
       res.send(results)
   })}
  else if((typeof SiteID == "number" && !isNaN(SiteID))){
    connection.query('select * from plumemapper.CharacteratSite where SiteID in (select SiteID from plumemapper.Site where ClientID='+req.user.ClientID+ ' and SiteID='+SiteID+')', function (err, results) {
       res.send(results)
   })}
  else{
      res.sendStatus(400)
    } 
})
app.get("/sources", function(req, res) {
  SourceID = Number(req.query.SourceID)
  SiteID = Number(req.query.SiteID)
  console.log("here?")
  console.log(req.query.SourceID)
    if((typeof SourceID == "number" && !isNaN(SourceID))){
      connection.query('SELECT SourceID, SourceName, Longitude, Latitude, Polygon FROM plumemapper.Sources WHERE SourceID='+ SourceID+' and ClientID='+req.user.ClientID, function (err, results) {
        res.send(results)
      })
      }
      else if((typeof SiteID == "number" && !isNaN(SiteID))){
        connection.query('SELECT SourceID, SourceName, Longitude, Latitude, Polygon FROM plumemapper.Sources WHERE SourceID in (select SourceID from plumemapper.SourcesAtSite where SiteID in(select SiteID from plumemapper.Site where siteID = '+SiteID+' and clientID='+req.user.ClientID+'))', function (err, results) {
        res.send(results)
      })
      }
    else{
      console.log("test")
      connection.query('SELECT SourceID, SourceName, Longitude, Latitude, Polygon FROM plumemapper.Sources WHERE ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
      })}
})

app.get("/zones", function(req, res) {
  SiteID = Number(req.query.SiteID)
  ZoneID = Number(req.query.ZoneID)
  selectquery = 'SELECT * from plumemapper.Zones where SiteID in (select SiteID from plumemapper.Site where ClientID ='+req.user.ClientID+')'
    if((typeof ZoneID == "number" && !isNaN(ZoneID))){
      selectquery+=" and ZoneID="+ZoneID
    }
    if((typeof SiteID == "number" && !isNaN(SiteID))){
      selectquery+=" and SiteID="+SiteID
    }
    connection.query(selectquery, function (err, results) {
      res.send(results)
    })  
})

app.get("/pointsetup", function(req, res) {
  SiteID = Number(req.query.SiteID)
  DatapointID = Number(req.query.DatapointID)
  selectquery = 'SELECT * from plumemapper.DatapointSetup where SiteID in (select SiteID from plumemapper.Site where ClientID ='+req.user.ClientID+')'

    if((typeof SiteID == "number" && !isNaN(SiteID))){
      selectquery+=" and SiteID="+SiteID
    }
    if((typeof DatapointID == "number" && !isNaN(DatapointID))){
      selectquery+=" and DatapointID="+DatapointID
    }
    connection.query(selectquery, function (err, results) {
      res.send(results)
    })  
})

app.get("/surveyidentifier", function(req, res) {
  SiteID = Number(req.query.SiteID)
  selectquery = 'SELECT * from plumemapper.SurveyIdentifier where SiteID in (select SiteID from plumemapper.Site where ClientID ='+req.user.ClientID+')'

    if((typeof SiteID == "number" && !isNaN(SiteID))){
      selectquery+=" and SiteID="+SiteID
    }
    connection.query(selectquery, function (err, results) {
      res.send(results)
    })
})

app.get("/surveydata", function(req, res) {
  SurveyID = Number(req.query.SurveyID)
  SurveyorID = Number(req.query.SurveyorID)
  selectquery = 'SELECT * FROM plumemapper.SurveyData where SurveyID in(SELECT SurveyID from plumemapper.SurveyIdentifier where SiteID in (select SiteID from plumemapper.Site where ClientID ='+req.user.ClientID+'))'

    if((typeof SurveyID == "number" && !isNaN(SurveyID))){
      selectquery+=" and SurveyID="+SurveyID
    }
    if((typeof SurveyorID == "number" && !isNaN(SurveyorID))){
      selectquery+=" and SurveyorID="+SurveyorID
    }
    connection.query(selectquery, function (err, results) {
      res.send(results)
    })
})

app.get("/surveyrepeatdata", function(req, res) {
  SurveyID = Number(req.query.SurveyID)
  SurveyorID = Number(req.query.SurveyorID)
  GroupID = Number(req.query.GroupID)
  selectquery = 'SELECT * FROM plumemapper.SurveyData where SurveyID in(SELECT SurveyID from plumemapper.SurveyIdentifier where SiteID in (select SiteID from plumemapper.Site where ClientID ='+req.user.ClientID+'))'

    if((typeof SurveyID == "number" && !isNaN(SurveyID))){
      selectquery+=" and SurveyID="+SurveyID
    }
    if((typeof SurveyorID == "number" && !isNaN(SurveyorID))){
      selectquery+=" and SurveyorID="+SurveyorID
    }
    if((typeof GroupID == "number" && !isNaN(GroupID))){
      selectquery+=" and GroupID="+GroupID
    }
    connection.query(selectquery, function (err, results) {
      res.send(results)
    })
})


//Post Requests
app.post('/sites',(req,res)=>{
  var insertString = "insert into plumemapper.Site(ClientID, SiteName, Address, Client, Longitude, Latitude, Comments, A, B, C, D, E, F) values ";
  for (var prop in req.body) 
  {

    SiteName = '"'+req.body[prop].SiteName+'"'
    Address = '"'+req.body[prop].Address+'"'
    Client = '"'+req.body[prop].Client+'"'
    Longitude = req.body[prop].Longitude
    Latitude = req.body[prop].Latitude
    Comments = '"'+req.body[prop].Comments+'"'
    A = req.body[prop].A
    B = req.body[prop].B
    C = req.body[prop].C
    D = req.body[prop].D
    E = req.body[prop].E
    F = req.body[prop].F

  if(Address=="undefined"||req.body[prop].Address==undefined){Address=null}
  if(Comments=="undefined"||req.body[prop].Comments==undefined){Comments=null}
  if(A == undefined){A=null}
  if(B == undefined){B=null}
  if(C == undefined){C=null}
  if(D == undefined){D=null}
  if(E == undefined){E=null}
  if(F == undefined){F=null}

  insertString+='('+req.user.ClientID+','+SiteName+','+Address+','+Client+','+Longitude+','+Latitude+','+Comments+','+A+','+B+','+C+','+D+','+E+','+F+'),'
  }
  
   insertString = insertString.slice(0, -1)
  console.log(insertString)
  if(insertString.search("undefined") == -1)
  {
    connection.query(insertString, function (err, results) {
      console.log(err+results)
        connection.query("select last_insert_id()", function (err, results) {res.send(results)})
      })
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.post('/SiteSources', function(req, res){
  var insertString = "INSERT INTO SourcesAtSite VALUES ";
  for (var prop in req.body) 
  {
  if (req.body[prop].hasOwnProperty('SiteID')) 
    {
        insertString = insertString+"("+req.body[prop].SiteID+","+req.body[prop].SourceID+"),"
    }
   }
   insertString = insertString.slice(0, -1)

  if(insertString.search("undefined") == -1)
  {
    connection.query(insertString, function (err, results) {

       res.send(results)
   })
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.post('/charactersatsite', function(req, res){
  var insertString = "INSERT INTO plumemapper.CharacteratSite VALUES ";
  for (var prop in req.body) 
  {
  if (req.body[prop].hasOwnProperty('SiteID')) 
    {
        insertString = insertString+"("+req.body[prop].SiteID+',"'+req.body[prop].Character+'"),'
    }
   }
   insertString = insertString.slice(0, -1)

  if(insertString.search("undefined") == -1)
  {
    console.log(insertString)
    connection.query(insertString, function (err, results) {

       res.send(results+err)
   })
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})
app.post('/sources',(req,res)=>{
  var insertString = "insert into plumemapper.Sources(ClientID, SourceName, Longitude, Latitude, Polygon) values ";
  for (var prop in req.body) 
  {
    SourceName = '"'+req.body[prop].SourceName+'"'
    Longitude = req.body[prop].Longitude
    Latitude = req.body[prop].Latitude
    Odours = '"'+req.body[prop].Odours+'"'
    Polygon = '"'+req.body[prop].Polygon+'"'

  
  if(Longitude == undefined){Longitude=null}
  if(Latitude == undefined){Latitude=null}
  if(Polygon == '"undefined"'){Polygon=null}
    
  insertString+='('+req.user.ClientID+','+SourceName+','+Longitude+','+Latitude+','+Polygon+'),'
  }
   insertString = insertString.slice(0, -1)

   console.log(insertString)
  if(insertString.search("undefined") == -1)
  {
    connection.query(insertString, function (err, results) {
        connection.query("select last_insert_id()", function (err, results) {res.send(results)})
       })  
  }
  else
  {
    res.send("non nullable value is null")
  }
})

app.post('/zones',(req,res)=>{
  var insertString = "insert into plumemapper.Zones(SiteID, Type, Polygon) values "
  var jsonData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SiteID!=undefined){
      jsonData += req.body[prop].SiteID+','
    }
    
    SiteID = req.body[prop].SiteID
    Type = '"'+req.body[prop].Type+'"'
    Polygon = '"'+req.body[prop].Polygon+'"'

  insertString+='('+SiteID+','+Type+','+Polygon+'),'
  }
  jsonData = jsonData.slice(0, -1)+')'
  insertString = insertString.slice(0,-1)
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+jsonData+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+jsonData+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'"
  connection.query(access_query, function (err, results) {
    access = results[0].query
    if(access==1){
      if(insertString.search("undefined") == -1)
      {
        connection.query(insertString, function (err, results) {
          connection.query("select last_insert_id()", function (err, results) {res.send(results)})
        })}
      else{
        res.sendStatus(400)
      }
    }else{
      res.sendStatus(401)
    }
  })
})

app.post('/pointsetup',(req,res)=>{
  var insertString = "insert into plumemapper.DatapointSetup(SiteID, Longitude, Latitude) values "
  var jsonData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SiteID!=undefined){
      jsonData += req.body[prop].SiteID+','
    }
    
    SiteID = req.body[prop].SiteID
    Longitude = req.body[prop].Longitude
    Latitude = req.body[prop].Latitude

  insertString+='('+SiteID+','+Longitude+','+Latitude+'),'
  }
  jsonData = jsonData.slice(0, -1)+')'
  insertString = insertString.slice(0,-1)
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+jsonData+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+jsonData+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'"
  connection.query(access_query, function (err, results) {
    access = results[0].query
    if(access==1){
      if(insertString.search("undefined") == -1)
      {
        connection.query(insertString, function (err, results) {res.sendStatus(200)})
      }
      else{
        res.sendStatus(400)
      }
    }
    else{
      res.sendStatus(401)
    }
  })
})

app.post('/surveyidentifier',(req,res)=>{
  var insertString = "insert into plumemapper.SurveyIdentifier(SiteID, Description, Sunrise, Sunset, Date, StartTime, EndTime) values "
  var jsonData = "(";
  for (var prop in req.body){
    if(req.body[prop].SiteID!=undefined){
      jsonData += req.body[prop].SiteID+','
    }
    
    SiteID = req.body[prop].SiteID
    Description = '"'+req.body[prop].Description+'"'
    Sunrise = '"'+req.body[prop].Sunrise+'"'
    Sunset = '"'+req.body[prop].Sunset+'"'
    vDate = '"'+req.body[prop].Date+'"'
    StartTime = '"'+req.body[prop].StartTime+'"'
    EndTime = '"'+req.body[prop].EndTime+'"'
  
  if(Description== '"undefined"'){Description=null}
  if(Sunrise== '"undefined"'){Sunrise=null}
  if(Sunset== '"undefined"'){Sunset=null}
  if(vDate== '"undefined"'){vDate=null}
  if(StartTime== '"undefined"'){StartTime=null}
  if(EndTime== '"undefined"'){EndTime=null}
  insertString+='('+SiteID+','+Description+','+Sunrise+','+Sunset+','+vDate+','+StartTime+','+EndTime+'),'
  }
  jsonData = jsonData.slice(0, -1)+')'
  insertString = insertString.slice(0,-1)
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+jsonData+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+jsonData+" limit 1)="+req.user.ClientID+",true,false),false) as 'query';"
  if(access_query.search("undefined") == -1){
  connection.query(access_query, function (err, results) {
    access = results[0].query
    if(access==1){
      if(insertString.search("undefined") == -1)
    {
       connection.query(insertString, function (err, results) {
        connection.query("select last_insert_id()", function (err, results) {res.send(results)})
       })
      }
      else
      {
          res.sendStatus(400)
  }
    }else{
      res.sendStatus(401)
    }
  })}else{}
})

app.post('/surveydata',(req,res)=>{
  var insertString = "insert into plumemapper.SurveyData (SurveyID, SurveyorID, StartTime,EndTime, MagneticDeclination, SiteEasting, SiteNorthing, Longitude, Latitude, WindDirectionMag, WindDirectionTrue, MinWindSpeed, AvgWindSpeed, MaxWindSpeed, AirTemp, WetbulbTemp, Precipitation, CloudCover, CloudType, PrimaryOdour, PrimaryIntensity, PrimaryHedonicTone, PrimaryDuration, PrimaryCharacter, SecondaryOdour, SecondaryIntensity, SecondaryHedonicTone, SecondaryDuration, SecondaryCharacter, TertiaryOdour, TertiaryIntensity, TertiaryHedonicTone, TertiaryDuration, TertiaryCharacter, Pressure, Comments) value "
  var jsonData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SurveyID!=undefined){
      jsonData += req.body[prop].SurveyID+','
    }
    //non nullable
    SurveyID = req.body[prop].SurveyID
    StartTime = '"'+req.body[prop].StartTime+'"'
    EndTime = '"'+req.body[prop].EndTime+'"'
    SiteEasting = req.body[prop].SiteEasting
    SiteNorthing = req.body[prop].SiteNorthing
    Longitude = req.body[prop].Longitude
    Latitude = req.body[prop].Latitude

    //nullable strings
    PrimaryDuration = '"'+req.body[prop].PrimaryDuration+'"'
    SecondaryDuration = '"'+req.body[prop].SecondaryDuration+'"'
    TertiaryDuration = '"'+req.body[prop].TertiaryDuration+'"'
    PrimaryHedonicTone= '"'+req.body[prop].PrimaryHedonicTone+'"'
    SecondaryHedonicTone= '"'+req.body[prop].SecondaryHedonicTone+'"'
    TertiaryHedonicTone= '"'+req.body[prop].TertiaryHedonicTone+'"'
    PrimaryCharacter= '"'+req.body[prop].PrimaryCharacter+'"'
    SecondaryCharacter= '"'+req.body[prop].SecondaryCharacter+'"'
    TertiaryCharacter= '"'+req.body[prop].TertiaryCharacter+'"'

    if(PrimaryDuration== '"undefined"'){PrimaryDuration=null}
    if(SecondaryDuration== '"undefined"'){SecondaryDuration=null}
    if(TertiaryDuration== '"undefined"'){TertiaryDuration=null}
    if(PrimaryHedonicTone== '"undefined"'){PrimaryHedonicTone=null}
    if(SecondaryHedonicTone== '"undefined"'){SecondaryHedonicTone=null}
    if(TertiaryHedonicTone== '"undefined"'){TertiaryHedonicTone=null}
    if(PrimaryCharacter== '"undefined"'){PrimaryCharacter=null}
    if(SecondaryCharacter== '"undefined"'){SecondaryCharacter=null}
    if(TertiaryCharacter== '"undefined"'){TertiaryCharacter=null}

    Precipitation= '"'+req.body[prop].Precipitation+'"'
    CloudCover= '"'+req.body[prop].CloudCover+'"'
    CloudType= '"'+req.body[prop].CloudType+'"'
    Comments= '"'+req.body[prop].Comments+'"'

  if(Precipitation== '"undefined"'){Precipitation=null}
  if(CloudCover== '"undefined"'){CloudCover=null}
  if(CloudType== '"undefined"'){CloudType=null}
  if(Comments== '"undefined"'){Comments=null}

  //nullable int/doubles
  
  MagneticDeclination = req.body[prop].MagneticDeclination
  WindDirectionMag = req.body[prop].WindDirectionMag
  WindDirectionTrue = req.body[prop].WindDirectionTrue
  MinWindSpeed = req.body[prop].MinWindSpeed
  AvgWindSpeed = req.body[prop].AvgWindSpeed
  MaxWindSpeed = req.body[prop].MaxWindSpeed
  AirTemp = req.body[prop].AirTemp
  WetbulbTemp = req.body[prop].WetbulbTemp
  PrimaryOdour = req.body[prop].PrimaryOdour
  PrimaryIntensity = req.body[prop].PrimaryIntensity
  SecondaryOdour = req.body[prop].SecondaryOdour
  SecondaryIntensity = req.body[prop].SecondaryIntensity
  TertiaryOdour = req.body[prop].TertiaryOdour
  TertiaryIntensity = req.body[prop].TertiaryIntensity
  Pressure = req.body[prop].Pressure

  if(MagneticDeclination== undefined){MagneticDeclination=null}
  if(WindDirectionMag== undefined){WindDirectionMag=null}
  if(WindDirectionTrue== undefined){WindDirectionTrue=null}
  if(MinWindSpeed== undefined){MinWindSpeed=null}
  if(AvgWindSpeed== undefined){AvgWindSpeed=null}
  if(MaxWindSpeed== undefined){MaxWindSpeed=null}
  if(AirTemp== undefined){AirTemp=null}
  if(WetbulbTemp== undefined){WetbulbTemp=null}
  if(PrimaryOdour== undefined){PrimaryOdour=null}
  if(PrimaryIntensity== undefined){PrimaryIntensity=null}
  if(SecondaryOdour== undefined){SecondaryOdour=null}
  if(SecondaryIntensity== undefined){SecondaryIntensity=null}
  if(TertiaryOdour== undefined){TertiaryOdour=null}
  if(TertiaryIntensity== undefined){TertiaryIntensity=null}
  if(Pressure== undefined){Pressure=null}

  insertString+='('+SurveyID+','+req.user.UserID+','+StartTime+','+EndTime+','+MagneticDeclination+','+SiteEasting+','+SiteNorthing+','+Longitude+','+Latitude+','+WindDirectionMag+','+WindDirectionTrue+','+MinWindSpeed+','+AvgWindSpeed+','+MaxWindSpeed+','+AirTemp+','+WetbulbTemp+','+Precipitation+','+CloudCover+','+CloudType+','+PrimaryOdour+','+PrimaryIntensity+','+PrimaryHedonicTone+','+PrimaryDuration+','+PrimaryCharacter+','+SecondaryOdour+','+SecondaryIntensity+','+SecondaryHedonicTone+','+SecondaryDuration+','+SecondaryCharacter+','+TertiaryOdour+','+TertiaryIntensity+','+TertiaryHedonicTone+','+TertiaryDuration+','+TertiaryCharacter+','+Pressure+','+Comments+'),'
  }
  jsonData = jsonData.slice(0, -1)+')'
  insertString = insertString.slice(0,-1)
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select Distinct(SiteID) from plumemapper.SurveyIdentifier where SurveyID in "+jsonData+"))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select Distinct(SiteID) from plumemapper.SurveyIdentifier where SurveyID in "+jsonData+") limit 1)="+req.user.ClientID+",true,false),false) as 'query'"
  console.log(access_query)
  if(access_query.search("undefined") == -1){
  connection.query(access_query, function (err, results) {
    access = results[0].query
    if(access==1){
      console.log(insertString)
      if(insertString.search("undefined") == -1)
    {console.log(insertString)
       connection.query(insertString, function (err, results) {res.send(results+err)})
      }
      else
      {
          res.sendStatus(400)
  }
    }else{
      res.sendStatus(401)
    }
  })}else{res.sendStatus(400)}
})





//delete functions
app.delete('/sites',(req,res)=>{
  var deleteData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SiteID!=undefined){
      deleteData += req.body[prop].SiteID+','
    }
  }

  deleteData = deleteData.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.Site where SiteID in "+deleteData+" and ClientID = "+req.user.ClientID;

  if(deleteString.search("undefined") == -1)
  {
    connection.query(deleteString, function (err, results) {res.sendStatus(200)})
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.delete('/sitesources',(req,res)=>{
  var deleteData = "(";
  var authcheckSite = "(";
  var authcheckSource = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SourceID!=undefined){
      authcheckSite += req.body[prop].SiteID+','
      authcheckSource += req.body[prop].SourceID+','
      deleteData += "("+req.body[prop].SourceID+','+req.body[prop].SiteID+"),"
    }
  }

  deleteData = deleteData.slice(0, -1)+")"
  authcheckSource =authcheckSource.slice(0, -1)+")"
  authcheckSite = authcheckSite.slice(0, -1)+")"
  var authStringSite ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+authcheckSite+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+authcheckSite+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'";
  var authStringSource ="select if((select count(Distinct(ClientID)) from plumemapper.Sources where SourceID in "+authcheckSource+")=1,if((SELECT ClientID from plumemapper.Sources where SourceID in "+authcheckSource+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'";
  var deleteString = "delete from plumemapper.SourcesAtSite where (SourceID,SiteID) in "+deleteData+" and ClientID = "+req.user.ClientID;

  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSite,(err, results)=>{
      if(results[0].query==1){
        connection.query(authStringSource,(err, out)=>{
          if(out[0].query==1){
            connection.query(deleteString, function (err, results) {res.sendStatus(200)})
          }else{res.sendStatus(401)}
        })
      }
      else{res.sendStatus(401)}
    })
    
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.delete('/charactersatsite',(req,res)=>{
  var deleteData = "(";
  var authcheckSite = "(";
  var authcheckSource = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].Character!=undefined){
      authcheckSite += req.body[prop].SiteID+','
      deleteData += "("+req.body[prop].SiteID+',"'+req.body[prop].Character+'"),'
    }
  }

  deleteData = deleteData.slice(0, -1)+")"
  authcheckSite = authcheckSite.slice(0, -1)+")"
  var authStringSite ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+authcheckSite+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+authcheckSite+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'";
  var deleteString = "delete from plumemapper.CharacteratSite where (SiteID,`Character`) in "+deleteData
  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSite,(err, results)=>{
      if(results[0].query==1){
        console.log(deleteString)
          connection.query(deleteString, function (err, results) {res.sendStatus(200)})
      }
      else{res.sendStatus(401)}
    })
    
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.delete('/sources',(req,res)=>{
  var deleteData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SourceID!=undefined){
      deleteData += req.body[prop].SourceID+','
    }
  }

  deleteData = deleteData.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.Source where SourceID in "+deleteData+" and ClientID = "+req.user.ClientID;

  if(deleteString.search("undefined") == -1)
  {
    connection.query(deleteString, function (err, results) {res.sendStatus(200)})
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.delete('/zones',(req,res)=>{
  var deleteData = "(";
  var authcheckSite = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].ZoneID!=undefined){
      deleteData += req.body[prop].ZoneID+','
    }
  }
  if(deleteData=="("){
    res.sendStatus(400)
  }else{
  deleteData = deleteData.slice(0, -1)+")"
  authcheckSite = authcheckSite.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.Zones where ZoneID in "+deleteData;
  var authStringSite ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select SiteID from plumemapper.Zones where ZoneID in "+deleteData+"))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select SiteID from plumemapper.Zones where ZoneID in "+deleteData+") limit 1)="+req.user.ClientID+",true,false),false) as 'query';";

  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSite,(err, results)=>{
      if(results[0].query==1){
        connection.query(deleteString, function (err, results) {res.sendStatus(200)})
      }
      else{res.sendStatus(401)}
    })
    
  }
  else
  {
    res.statusCode = 400
    res.send("non nullable value is null")
  }
}})

app.delete('/pointsetup',(req,res)=>{
  var deleteData = "(";
  var authcheckSite = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].DatapointID!=undefined){
      deleteData += req.body[prop].DatapointID+','
    }
  }

  deleteData = deleteData.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.DatapointSetup where DatapointID in "+deleteData
  var authStringSite ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select SiteID from plumemapper.DatapointSetup where DatapointID in "+deleteData+"))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select SiteID from plumemapper.DatapointSetup where DatapointID in "+deleteData+") limit 1)="+req.user.ClientID+",true,false),false) as 'query'";

  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSite,(err, results)=>{
      if(results[0].query==1){
        connection.query(deleteString, function (err, results) {res.sendStatus(200)})
        }else{res.sendStatus(401)}
      })
  }
  else{
    res.statusCode = 400
    res.send("non nullable value is null")
  }
})

app.delete('/surveyidentifier',(req,res)=>{
  var deleteData = "(";
  var authcheckSite = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SurveyID!=undefined){
      deleteData += req.body[prop].SurveyID+','
    }
  }
  if(deleteData=="("){
    res.sendStatus(400)
  }else{
  deleteData = deleteData.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.SurveyIdentifier where SurveyID in "+deleteData
  var authStringSite ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select SiteID from plumemapper.SurveyIdentifier where SurveyID in "+deleteData+"))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select SiteID from plumemapper.SurveyIdentifier where SurveyID in "+deleteData+") limit 1)="+req.user.ClientID+",true,false),false) as 'query'";

  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSite,(err, results)=>{
      if(results[0].query==1){
        connection.query(deleteString, function (err, results) {res.sendStatus(200)})
        }else{res.sendStatus(401)}
      })
  }
  else{
    res.statusCode = 400
    res.send("non nullable value is null")
  }}
})

app.delete('/surveydata',(req,res)=>{
  var deleteData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].DatapointID!=undefined){
      deleteData += req.body[prop].DatapointID+','
    }
  }
  if(deleteData=="("){
    res.sendStatus(400)
  }else{
  deleteData = deleteData.slice(0, -1)+")"
  var deleteString = "delete from plumemapper.SurveyData where DatapointID in "+deleteData
  var authStringSurvey ="select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select SiteID from plumemapper.SurveyIdentifier where SurveyID in (select SurveyID from plumemapper.SurveyData where DatapointID in "+deleteData+")))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select SiteID from plumemapper.SurveyIdentifier where SurveyID in (select SurveyID from plumemapper.SurveyData where DatapointID in "+deleteData+")) limit 1)="+req.user.ClientID+",true,false),false) as 'query'";
  if(deleteString.search("undefined") == -1)
  {
    connection.query(authStringSurvey,(err, results)=>{
      if(results[0].query==1){
        connection.query(deleteString, function (err, results) {res.sendStatus(200)})
        }else{res.sendStatus(401)}
      })
  }
  else{
    res.statusCode = 400
    res.send("non nullable value is null")
  }}
})

app.delete('/surveyrepeatdata',(req,res)=>{
  res.sendStatus(200)
})



//Patch commands
app.patch('/sites',(req,res)=>{
  if(req.body[0].SiteID!=undefined){
    if(req.body[0].SiteName!=undefined){updateString+=" SiteName = '"+req.body[0].SiteName+"',"}
    if(req.body[0].Address!=undefined){updateString+=" Address = '"+req.body[0].Address+"',"}
    if(req.body[0].Client!=undefined){updateString+=" Client = '"+req.body[0].Client+"',"}
    if(req.body[0].Longitude!=undefined){updateString+=" Longitude = "+req.body[0].Longitude+","}
    if(req.body[0].Latitude!=undefined){updateString+=" Latitude = "+req.body[0].Latitude+","}
    if(req.body[0].Comments!=undefined){updateString+=" Comments = '"+req.body[0].Comments+"',"}
    if(req.body[0].A!=undefined){updateString+=" A = "+req.body[0].A+","}
    if(req.body[0].B!=undefined){updateString+=" B = "+req.body[0].B+","}
    if(req.body[0].C!=undefined){updateString+=" C = "+req.body[0].C+","}
    if(req.body[0].D!=undefined){updateString+=" D = "+req.body[0].D+","}
    if(req.body[0].E!=undefined){updateString+=" E = "+req.body[0].E+","}
    if(req.body[0].F!=undefined){updateString+=" F = "+req.body[0].F+","}

    updateString = updateString.slice(0,-1)
    updateString += " WHERE SiteID ="+req.body[0].SiteID+" and ClientID="+req.user.ClientID

    connection.query(updateString,(err, results)=>{
      if(err){return res.sendStatus(400)}
    })
    res.sendStatus(200)
  }
  else{
    res.sendStatus(400)
  }
})

app.patch('/surveyidentifier',(req,res)=>{
  console.log(req.body)
  if(req.body[0].SurveyID!=undefined){
    updateString = 'UPDATE plumemapper.SurveyIdentifier SET'

    if(req.body[0].Description!=undefined){updateString+=" Description = '"+req.body[0].Description+"',"}
    if(req.body[0].StartTime!=undefined){updateString+=" StartTime = '"+req.body[0].StartTime+"',"}
    if(req.body[0].EndTime!=undefined){updateString+=" EndTime = '"+req.body[0].EndTime+"',"}


    updateString = updateString.slice(0,-1)
    updateString += " WHERE SurveyID ="+req.body[0].SurveyID
  

    access_query = "select if((select ClientID from plumemapper.Site where SiteID in (select SiteID from plumemapper.SurveyIdentifier where SurveyID = "+req.body[0].SurveyID+"))="+req.user.ClientID+",true,false) as 'query';"
    console.log("working")
    console.log(access_query)
    connection.query(access_query,(err, results)=>{
      console.log("access")
      console.log(results)
      if(results[0].query==1){
        console.log(updateString)
        connection.query(updateString, function (err, results) {res.sendStatus(200)})
        }else{res.sendStatus(401)}
      })
  }
})

app.patch('/sources',(req,res)=>{
  if(req.body[0].SourceID!=undefined){
    updateString = 'UPDATE plumemapper.Source SET'

    if(req.body[0].Polygon!=undefined){updateString+=" Polygon = '"+req.body[0].Polygon+"'"}
    updateString += " WHERE SurveyID = "+req.body[0].SourceID+" and ClientID = "+req.user.ClientID
    connection.query(updateString, function (err, results) {res.sendStatus(200)})
  }
})


// Start listening for input
app.listen(listenport, () => {
    console.log(`Listening on ${listenport}...`)
})