pipeline {
  agent any
  stages {
    stage('Build & Test') {
      steps {
        sh 'echo "Build step - in this sample repo there are no tests"'
      }
    }
    stage('Build Images') {
      steps {
        sh '''
        docker build -t vijaykumarvkn/user-service:latest ./user-service
        docker build -t vijaykumarvkn/product-service:latest ./product-service
        docker build -t vijaykumarvkn/order-service:latest ./order-service
        docker build -t vijaykumarvkn/payment-service:latest ./payment-service
        '''
      }
    }
    stage('Push Images') {
      steps {
        echo 'Configure Docker Hub credentials in Jenkins and push images'
      }
    }
    stage('Deploy to K8s') {
      steps {
        echo 'kubectl apply -f ./user-service/k8s.yaml ... (repeat for all services)'
      }
    }
  }
}
