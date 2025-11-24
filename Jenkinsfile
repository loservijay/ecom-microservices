// Jenkinsfile for ecom-microservices — Docker Hub: vja304786038
pipeline {
  agent any

  environment {
    DOCKERHUB_CRED_ID = 'dockerhub-creds'
    DOCKERHUB_NAMESPACE = 'vja304786038'
    GIT_CRED_ID = 'github-loservijay-pat'  // you already have this
  }

  options {
    skipDefaultCheckout()
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM',
          branches: [[name: "*/${env.BRANCH_NAME ?: 'main'}"]],
          userRemoteConfigs: [[url: 'https://github.com/loservijay/ecom-microservices.git', credentialsId: env.GIT_CRED_ID]]
        ])
      }
    }

    stage('Detect Services') {
      steps {
        script {
          SERVICE_DIRS = sh(script: "find . -maxdepth 2 -type f -name pom.xml -printf '%h\\n' | sort -u", returnStdout: true).trim()
          if (!SERVICE_DIRS) {
            error "No services found (no pom.xml detected). Adjust detection logic."
          }
          SERVICE_DIRS = SERVICE_DIRS.split('\\n')
          echo "Services: ${SERVICE_DIRS}"
        }
      }
    }

    stage('Build & Package') {
      steps {
        script {
          for (dir in SERVICE_DIRS) {
            dir(dir) {
              echo "Building ${dir}"
              sh 'mvn -B clean package -DskipTests=false'
              stash includes: "target/*.jar", name: "jar-${dir.replaceAll(/\\W/,'_')}", allowEmpty: true
            }
          }
        }
      }
    }

    stage('Docker Build & Push') {
      steps {
        script {
          // login once
          withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
            sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          }

          for (dir in SERVICE_DIRS) {
            def svcName = dir.tokenize('/').last()
            def tag = "${env.DOCKERHUB_NAMESPACE}/${svcName}:${env.BRANCH_NAME ?: 'main'}-${env.BUILD_NUMBER}"
            dir(dir) {
              echo "Building docker image for ${svcName}"
              sh "docker build -t ${tag} ."
              sh "docker push ${tag}"
              // also push branch latest
              sh "docker tag ${tag} ${env.DOCKERHUB_NAMESPACE}/${svcName}:latest || true"
              sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svcName}:latest || true"
            }
          }
        }
      }
    }

    stage('Archive Artifacts') {
      steps {
        script {
          for (dir in SERVICE_DIRS) {
            def stashName = "jar-${dir.replaceAll(/\\W/,'_')}"
            unstash stashName
          }
          archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true, allowEmptyArchive: true
        }
      }
    }
  }

  post {
    always {
      sh 'docker logout || true'
    }
    success { echo "Pipeline success" }
    failure { echo "Pipeline failed" }
  }
}

