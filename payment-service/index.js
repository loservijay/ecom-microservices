const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(bodyParser.json());
const payments = {};
app.get('/health', (req, res) => res.json({status:'ok', service:'payment'}));
// mock payment processing
app.post('/pay', (req, res) => {
  const id = uuidv4();
  const { orderId, amount } = req.body;
  payments[id] = { id, orderId, amount, status: 'PAID' };
  res.json({ id, status: 'PAID' });
});
const port = process.env.PORT || 3004;
app.listen(port,()=>console.log('Payment service listening on',port));
