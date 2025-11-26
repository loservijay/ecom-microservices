// Jenkinsfile for ecom-microservices — Docker Hub: vja304786038
pipeline {
  agent any

  environment {
    DOCKERHUB_CRED_ID     = 'dockerhub-creds'
    DOCKERHUB_NAMESPACE   = 'vja304786038'
    GIT_CRED_ID           = 'github-loservijay-pat'  // ensure this exists in Jenkins
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
          // find directories that contain a pom.xml (strip leading ./)
          def raw = sh(script: "find . -maxdepth 2 -type f -name pom.xml -printf '%h\\n' | sed 's#^\\./##' | sort -u", returnStdout: true).trim()
          if (!raw) {
            error "No services found (no pom.xml detected). Adjust detection logic."
          }
          SERVICE_DIRS = raw.split('\\n').collect { it.trim() }.findAll{ it }
          echo "Services: ${SERVICE_DIRS}"
        }
      }
    }

    stage('Build & Package') {
      steps {
        script {
          for (dirPath in SERVICE_DIRS) {
            dir(dirPath) {
              echo "Building ${dirPath}"
              // run maven (adjust -DskipTests as you need)
              sh 'mvn -B clean package -DskipTests=true'
              // stash artifact with a safe name
              def stashName = "jar-${dirPath.replaceAll(/[^A-Za-z0-9_.-]/, '_')}"
              stash includes: "target/*.jar", name: stashName, allowEmpty: true
            }
          }
        }
      }
    }

    stage('Docker Build & Push') {
      steps {
        script {
          // docker login once
          withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
            sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          }

          for (dirPath in SERVICE_DIRS) {
            def svcName = dirPath.tokenize('/').last()
            def tag = "${env.DOCKERHUB_NAMESPACE}/${svcName}:${env.BRANCH_NAME ?: 'main'}-${env.BUILD_NUMBER}"
            dir(dirPath) {
              if (fileExists('Dockerfile')) {
                echo "Building docker image for ${svcName}"
                sh "docker build -t ${tag} ."
                sh "docker push ${tag}"
                sh "docker tag ${tag} ${env.DOCKERHUB_NAMESPACE}/${svcName}:latest || true"
                sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svcName}:latest || true"
              } else {
                echo "No Dockerfile in ${dirPath} — skipping docker build"
              }
            }
          }
        }
      }
    }

    stage('Archive Artifacts') {
      steps {
        script {
          // restore stashes (works only on same node where stashes were stored)
          for (dirPath in SERVICE_DIRS) {
            def stashName = "jar-${dirPath.replaceAll(/[^A-Za-z0-9_.-]/, '_')}"
            try { unstash stashName } catch(e) { echo "unstash ${stashName} failed: ${e}" }
          }
          archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true, allowEmptyArchive: true
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
    success { echo "Pipeline success" }
    failure { echo "Pipeline failed" }
  }
}

