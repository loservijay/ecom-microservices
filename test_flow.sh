#!/usr/bin/env bash
set -e
if ! command -v jq &>/dev/null; then
  echo "jq not found. Install with: sudo apt install -y jq"
  exit 1
fi
product_json=$(curl -s http://localhost:3002/products)
echo "$product_json" | jq .
productId=$(echo "$product_json" | jq -r '.[0].id')
echo "productId=$productId"

user_json=$(curl -s -X POST http://localhost:3001/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Vijay","email":"v@example.com"}')
echo "$user_json" | jq .
userId=$(echo "$user_json" | jq -r '.id')
echo "userId=$userId"

order_json=$(curl -s -X POST http://localhost:3003/order \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$userId\",\"productId\":\"$productId\",\"qty\":1\"}")
echo "$order_json" | jq .
orderId=$(echo "$order_json" | jq -r '.id')
echo "orderId=$orderId"
curl -s http://localhost:3003/order/"$orderId" | jq .
