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

// Create connection ----
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
// ------ TABLES -------- //
// DatapointSetup
// RepeatSurveyData
// Site
// Sources
// SourcesAtSite
// SurveyData
// SurveyIdentifier
// Surveyors
// Zones 

//-------JWT-------//
//Username
//UserID
//ClientID

// check tokens for all requests after here
app.use(authenticateToken)
app.use(logger)
app.use(jsonParser)


//Features
app.get('/expiration',(req,res)=>{
  test = new Date(req.user.exp * 1000)
  res.send({"exp":test})
})

//create endpoints 
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
    connection.query('select * from SourcesAtSite where SiteID in (select SiteID from plumemapper.Site where ClientID='+req.user.ClientID+ ' and SiteID='+SiteID+')', function (err, results) {
       res.send(results)
   })}
  else{
      res.sendStatus(400)
    } 
})

app.get("/sources", function(req, res) {
	SourceID = Number(req.query.SourceID)
    if(req.query.SourceID==undefined){
      connection.query('SELECT SourceID, SourceName, OdourCharacter, Address, Longitude, Latitude, Odours, Poly-gon, SiteEasting, SiteNorthing FROM plumemapper.Sources WHERE ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
   })}
    else if((typeof SourceID == "number" && !isNaN(SourceID))){
      connection.query('SELECT SourceID, SourceName, OdourCharacter, Address, Longitude, Latitude, Odours, Polygon, SiteEasting, SiteNorthing FROM plumemapper.Sources WHERE SourceID='+ SourceID+' and ClientID='+req.user.ClientID, function (err, results) {
       res.send(results)
    })}
    else{
      res.sendStatus(400)
    }  
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

	if(SiteName==undefined){SiteName=null}
	if(Comments==undefined){Comments=null}
	if(A == undefined){A=null}
	if(B == undefined){B=null}
	if(C == undefined){C=null}
	if(D == undefined){D=null}
	if(E == undefined){E=null}
	if(F == undefined){F=null}

	insertString+='('+req.user.ClientID+','+SiteName+','+Address+','+Client+','+Longitude+','+Latitude+','+Comments+','+A+','+B+','+C+','+D+','+E+','+F+'),'
  }
   insertString = insertString.slice(0, -1)

  if(insertString.search("undefined") == -1)
  {
    connection.query(insertString, function (err, results) {connection.query("select last_insert_id()", function (err, results) {res.send(results)})})
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
        insertString = insertString+"("+req.body[prop].SiteID+","+req.body[prop].SourceId+"),"
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

app.post('/sources',(req,res)=>{
  var insertString = "insert into plumemapper.Sources(ClientID, SourceName, OdourCharacter, Address, Longitude, Latitude, Odours, Polygon, SiteEasting, SiteNorthing) values ";
  for (var prop in req.body) 
  {

  	SourceName = '"'+req.body[prop].SourceName+'"'
  	OdourCharacter = '"'+req.body[prop].OdourCharacter+'"'
  	Address = '"'+req.body[prop].Address+'"'
  	Longitude = req.body[prop].Longitude
  	Latitude = req.body[prop].Latitude
  	Odours = '"'+req.body[prop].Odours+'"'
  	Polygon = '"'+req.body[prop].Polygon+'"'
  	SiteEasting = req.body[prop].SiteEasting
  	SiteNorthing = req.body[prop].SiteNorthing

	if(Address == '"undefined"'){Address=null}
	if(Longitude == undefined){Longitude=null}
	if(Latitude == undefined){Latitude=null}
	if(Odours == '"undefined"'){Odours=null}
	if(Polygon == '"undefined"'){Polygon=null}
	if(SiteEasting == undefined){SiteEasting=null}
	if(SiteNorthing == undefined){SiteNorthing=null}

	insertString+='('+req.user.ClientID+','+SourceName+','+OdourCharacter+','+Address+','+Longitude+','+Latitude+','+Odours+','+Polygon+','+SiteEasting+','+SiteNorthing+'),'
  }
   insertString = insertString.slice(0, -1)

  if(insertString.search("undefined") == -1)
  {
    connection.query(insertString, function (err, results) {connection.query("select last_insert_id()", function (err, results) {res.send(results)})})
  }
  else
  {
    res.statusCode = 400
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
    	 connection.query(insertString, function (err, results) {res.sendStatus(200)})
  	  }
  	  else
  	  {
          res.statusCode(400)
    	  res.send("non nullable value is null")
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
    SiteEasting = req.body[prop].Longitude
    SiteNorthing = req.body[prop].SiteNorthing

	insertString+='('+SiteID+','+SiteEasting+','+SiteNorthing+'),'
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
  	  else
  	  {
          res.statusCode(400)
    	  res.send("non nullable value is null")
  }
  	}else{
  		res.sendStatus(401)
  	}
  })
})

app.post('/surveyidentifier',(req,res)=>{
  var insertString = "insert into plumemapper.SurveyIdentifier(SiteID, Description, Sunrise, Sunset, Date, StartTime, EndTime) values "
  var jsonData = "(";
  for (var prop in req.body) 
  {
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
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in "+jsonData+")=1,if((SELECT ClientID from plumemapper.Site where SiteID in "+jsonData+" limit 1)="+req.user.ClientID+",true,false),false) as 'query'"
  connection.query(access_query, function (err, results) {
  	access = results[0].query
  	if(access==1){
      if(insertString.search("undefined") == -1)
 	  {
    	 connection.query(insertString, function (err, results) {connection.query("select last_insert_id()", function (err, results) {res.send(results)})})
  	  }
  	  else
  	  {
          res.statusCode(400)
    	  res.send("non nullable value is null")
  }
  	}else{
  		res.sendStatus(401)
  	}
  })
})

app.post('/surveydata',(req,res)=>{
  var insertString = "insert into plumemapper.SurveyData(SurveyID, SurveyorID, Time, MagneticDeclination, SiteEasting, SiteNorthing, Longitude, Latitude, WindDirectionMag, WindDirectionTrue, MinWindSpeed, MaxWindSpeed, AirTemp, WetbulbTemp, Precipitation, CloudCover, CloudType, Duration, PrimaryOdour, PrimaryIntensity, SecondaryOdour, SecondaryIntensity, TertiaryOdour, TertiaryIntensity, HedonicTone, Pressure, Comments) value "
  var jsonData = "(";
  for (var prop in req.body) 
  {
    if(req.body[prop].SurveyID!=undefined){
      jsonData += req.body[prop].SurveyID+','
    }
    //non nullable
    SurveyID = req.body[prop].SurveyID
    Time = '"'+req.body[prop].Time+'"'
    SiteEasting = req.body[prop].SiteEasting
    SiteNorthing = req.body[prop].SiteNorthing
    Duration = '"'+req.body[prop].Duration+'"'

    //nullable strings
    Precipitation= '"'+req.body[prop].Precipitation+'"'
    CloudCover= '"'+req.body[prop].CloudCover+'"'
    CloudType= '"'+req.body[prop].CloudType+'"'
    HedonicTone= '"'+req.body[prop].HedonicTone+'"'
    Comments= '"'+req.body[prop].Comments+'"'
	if(Precipitation== '"undefined"'){Precipitation=null}
	if(CloudCover== '"undefined"'){CloudCover=null}
	if(CloudType== '"undefined"'){CloudType=null}
	if(HedonicTone== '"undefined"'){HedonicTone=null}
	if(Comments== '"undefined"'){Comments=null}

	//nullable int/doubles
	
	MagneticDeclination = req.body[prop].MagneticDeclination
	Longitude = req.body[prop].Longitude
	Latitude = req.body[prop].Latitude
	WindDirectionMag = req.body[prop].WindDirectionMag
	WindDirectionTrue = req.body[prop].WindDirectionTrue
	MinWindSpeed = req.body[prop].MinWindSpeed
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
	if(Longitude== undefined){Longitude=null}
	if(Latitude== undefined){Latitude=null}
	if(WindDirectionMag== undefined){WindDirectionMag=null}
	if(WindDirectionTrue== undefined){WindDirectionTrue=null}
	if(MinWindSpeed== undefined){MinWindSpeed=null}
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

	insertString+='('+SurveyID+','+req.user.UserID+','+Time+','+MagneticDeclination+','+SiteEasting+','+SiteNorthing+','+Longitude+','+Latitude+','+WindDirectionMag+','+WindDirectionTrue+','+MinWindSpeed+','+MaxWindSpeed+','+AirTemp+','+WetbulbTemp+','+Precipitation+','+CloudCover+','+CloudType+','+Duration+','+PrimaryOdour+','+PrimaryIntensity+','+SecondaryOdour+','+SecondaryIntensity+','+TertiaryOdour+','+TertiaryIntensity+','+HedonicTone+','+Pressure+','+Comments+'),'
  }
  jsonData = jsonData.slice(0, -1)+')'
  insertString = insertString.slice(0,-1)
  access_query = "select if((select count(Distinct(ClientID)) from plumemapper.Site where SiteID in (select Distinct(SiteID) from plumemapper.SurveyIdentifier where SurveyId in "+jsonData+"))=1,if((SELECT ClientID from plumemapper.Site where SiteID in (select Distinct(SiteID) from plumemapper.SurveyIdentifier where SurveyId in "+jsonData+") limit 1)="+req.user.ClientID+",true,false),false) as 'query'"

  connection.query(access_query, function (err, results) {
  	access = results[0].query
  	if(access==1){
      if(insertString.search("undefined") == -1)
 	  {
    	 connection.query(insertString, function (err, results) {res.sendStatus(200)})
  	  }
  	  else
  	  {
          res.statusCode(400)
    	  res.send("non nullable value is null")
  }
  	}else{
  		res.sendStatus(401)
  	}
  })
})

app.post('/surveyrepeatdata',(req,res)=>{
	res.sendStatus(200)
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
  if(req.body.SiteID!=undefined){
    var updateString = "UPDATE plumemapper.Site set"
    if(req.body.SiteName!=undefined){updateString+=" SiteName = '"+req.body.SiteName+"',"}
    if(req.body.Address!=undefined){updateString+=" Address = '"+req.body.Address+"',"}
    if(req.body.Client!=undefined){updateString+=" Client = '"+req.body.Client+"',"}
    if(req.body.Longitude!=undefined){updateString+=" Longitude = "+req.body.Longitude+","}
    if(req.body.Latitude!=undefined){updateString+=" Latitude = "+req.body.Latitude+","}
    if(req.body.Comments!=undefined){updateString+=" Comments = '"+req.body.Comments+"',"}
    if(req.body.A!=undefined){updateString+=" A = "+req.body.A+","}
    if(req.body.B!=undefined){updateString+=" B = "+req.body.B+","}
    if(req.body.C!=undefined){updateString+=" C = "+req.body.C+","}
    if(req.body.D!=undefined){updateString+=" D = "+req.body.D+","}
    if(req.body.E!=undefined){updateString+=" E = "+req.body.E+","}
    if(req.body.F!=undefined){updateString+=" F = "+req.body.F+","}

    updateString = updateString.slice(0,-1)
    updateString += " WHERE SiteID ="+req.body.SiteID+" and ClientID="+req.user.ClientID

    connection.query(updateString,(err, results)=>{
      if(err){return res.sendStatus(400)}
    })
    res.sendStatus(200)
  }
  else{
    res.sendStatus(400)
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
  let User = req.user.Username;
  let log = `[${formatted_date}] Method:${method} Route:${url} User:${User} IP:${req.connection.remoteAddress}`;
  console.log(log);
  fs.appendFile('log.txt', log+'\n', function (err) {
  if (err) {
    // append failed
  } else {
    // done
  }})
  next();
};

// connect to server ----
app.listen(listenport, () => {
    console.log(`Listening on ${listenport}...`)
})