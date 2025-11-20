const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(bodyParser.json());
const users = {};
app.get('/health', (req, res) => res.json({status:'ok', service:'user'}));
app.post('/register', (req, res) => {
  const id = uuidv4();
  const {name,email} = req.body;
  users[id] = { id, name, email };
  res.json(users[id]);
});
app.get('/user/:id', (req, res) => {
  const u = users[req.params.id];
  if(!u) return res.status(404).json({error:'not found'});
  res.json(u);
});
const port = process.env.PORT || 3001;
app.listen(port,()=>console.log('User service listening on',port));
