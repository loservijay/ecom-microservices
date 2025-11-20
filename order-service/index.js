const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(bodyParser.json());
const orders = {};
app.get('/health', (req, res) => res.json({status:'ok', service:'order'}));
// create order -> reduce stock -> call payment (mock)
app.post('/order', async (req, res) => {
  const { userId, productId, qty } = req.body;
  try {
    // reduce stock
    await axios.post(process.env.PRODUCT_URL + '/reduce-stock', { productId, qty });
    // create order
    const id = uuidv4();
    orders[id] = { id, userId, productId, qty, status: 'CREATED' };
    // call payment
    const payResp = await axios.post(process.env.PAYMENT_URL + '/pay', { orderId: id, amount: 100 });
    orders[id].status = payResp.data.status || 'PAID';
    res.json(orders[id]);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});
app.get('/order/:id', (req, res) => {
  const o = orders[req.params.id]; if(!o) return res.status(404).json({error:'not found'}); res.json(o);
});
const port = process.env.PORT || 3003;
app.listen(port,()=>console.log('Order service listening on',port));
