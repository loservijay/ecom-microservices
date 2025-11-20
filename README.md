# E-commerce Microservices (sample repo)

This is a lightweight, **sample** microservices monorepo for demo and testing purposes.
It contains 4 minimal Node.js services:
- user-service (port 3001)
- product-service (port 3002)
- order-service (port 3003)
- payment-service (port 3004)

Each service has:
- index.js (Express app)
- package.json
- Dockerfile
- k8s.yaml (simple Deployment + Service)

## How to run locally (fast)
Requirements: Docker & Docker Compose

1. Clone or download this repo.
2. In repo root run:
   ```
   docker-compose up --build
   ```
3. Test endpoints:
   - Register user:
     ```
     curl -X POST localhost:3001/register -H 'Content-Type: application/json' -d '{"name":"Vijay","email":"v@example.com"}'
     ```
   - List products:
     ```
     curl localhost:3002/products
     ```
   - Create order:
     ```
     curl -X POST localhost:3003/order -H 'Content-Type: application/json' -d '{"userId":"<userId>","productId":"<productId>","qty":1}'
     ```

## How to push to GitHub
1. Initialize git:
   ```
   git init
   git add .
   git commit -m "Initial commit - sample ecom microservices"
   ```
2. Create a GitHub repo (on github.com) and follow instructions to push:
   ```
   git remote add origin https://github.com/youruser/your-repo.git
   git branch -M main
   git push -u origin main
   ```

## How to deploy to Kubernetes
1. Build images and push to Docker Hub (tag appropriately).
2. Update image names in k8s.yaml if needed.
3. `kubectl apply -f user-service/k8s.yaml`
   Repeat for product-service, order-service, payment-service.
4. Use port-forwarding or expose via Ingress.

## Notes
- This is a demo repo. Replace mock logic and add persistence for production use.
- Jenkinsfile is a sample skeleton for CI/CD.

Enjoy! — If you want, I can:
- create a GitHub-ready repo and give you the exact `git` commands to push,
- add Helm charts,
- convert services to Spring Boot instead of Node.js,
- or expand tests and CI stages.
