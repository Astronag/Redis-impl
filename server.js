const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser');
const redis = require('redis');
const client = redis.createClient();
const User = require('./user')

mongoose.connect('mongodb://localhost:27017/seeyou',{ useNewUrlParser: true },()=>{
    console.log('connected to db')
})
mongoose.set('useFindAndModify', false);
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database`)
})

client.on('connect', function() {
  console.log('Connected');
})

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname,"src")));

app.get("/", function(req,res){
	res.status(200);
	res.sendFile(path.join(__dirname,"index.html"));
});

app.post('/auth/signup', async (req, res) => {
    const user = new User(req.body);
    try {
    await user.save();
        return res.status(200).json({
        message: "Successfully signed up!",
        })
    } catch (err) {
        return res.status(400).json({
        error: err,
        });
    }
})

app.post('/auth/signin', async (req, res) => {
    let user = await User.findOne({
      email: req.body.email,
    });

    if (!user)
      return res.status("401").json({
        error: "Invalid Username",
      });
    
    if (user.password != req.body.password) {
      return res.status("401").send({
        error: "Invalid password",
      });
    }
    
    return res.json({
      user: { 
        name: user.name, 
        email: user.email 
      },
    });
})

app.get('/signout', (req, res) => {
    res.clearCookie("tk");
    return res.status("200").json({
      message: "Signed out",
    })
})

app.get('/profilePage', (req, res) => {
    fs.readFile('profile.html', function(err, data) {
      res.write(data);
      res.send();
    })
})

app.post('/profile', async (req, res) => {
  let username;
  client.get('email', (err, reply) => {
    if(err)
      throw err;
    if(reply){
      if(req.body.email == reply){
        let username = client.get('name', (err, reply) => {
          if(err)
            throw err;
          if(reply)
            res.status('200').json({
              name: username, 
              email: req.body.email
            })
          else {
            let user = User.findOne({
              email: req.body.email,
            });
            client.set('name', user.name);
            res.status('200').json({
              name: user.name,
              email: user.email
            })
          }
        })
      }
    }
  })
  let user = await User.findOne({
    email: req.body.email,
  });
  res.status("200").json({
    user: {
      'name': user.name, 
      'email': user.email,
    }, 
  })
})

app.post('/edit', (req, res) => {
  User.findOneAndUpdate({
    email: req.body.email,
  }, {$set: { name : req.body.name}}, function(err, doc) {
      if(err)
        console.log(err);
  });
  return res.status("200").json({
    message: "Updated successfully",
  })
})

app.post('/delete', (req, res) => {
  User.findOneAndDelete({
    email: req.body.email
  }, function(err, doc) {
    if(err)
      console.log(err);
  })
  res.status(200);
	res.sendFile(path.join(__dirname,"index.html"));
})

app.listen(5000, () => {
    console.log('Server started')
})