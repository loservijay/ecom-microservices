const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(bodyParser.json());
const products = {};
// seed product
const p1 = uuidv4(); products[p1] = { id: p1, name: 'Sample Product', price: 1999, stock: 100 };
app.get('/health', (req, res) => res.json({status:'ok', service:'product'}));
app.get('/products', (req, res) => res.json(Object.values(products)));
app.get('/products/:id', (req, res) => {
  const p = products[req.params.id]; if(!p) return res.status(404).json({error:'not found'}); res.json(p);
});
app.post('/reduce-stock', (req, res) => {
  const { productId, qty } = req.body;
  const p = products[productId];
  if(!p) return res.status(404).json({error:'product not found'});
  if(p.stock < qty) return res.status(400).json({error:'insufficient stock'});
  p.stock -= qty;
  res.json({ok:true, product:p});
});
const port = process.env.PORT || 3002;
app.listen(port,()=>console.log('Product service listening on',port));
