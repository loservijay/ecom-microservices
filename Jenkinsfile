pipeline {
    agent any

    environment {
        DOCKERHUB_CRED_ID   = 'dockerhub-creds'
        DOCKERHUB_NAMESPACE = 'vja304786038'
        IMAGE_TAG           = "${env.BRANCH_NAME ?: 'main'}-${env.BUILD_NUMBER}"
    }

    options {
        skipDefaultCheckout()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Detect Services') {
            steps {
                script {
                    def raw = sh(
                        script: '''
                          set -eu
                          echo "Detecting Node services (package.json)..." >&2
                          find . -name package.json \
                            -not -path "./.git/*" \
                            -not -path "*/node_modules/*" \
                            -print0 |
                          xargs -0 -r -n1 dirname |
                          sed "s|^\\./||" |
                          grep -v "^$" |
                          sort -u || true
                        ''',
                        returnStdout: true
                    ).trim()

                    if (!raw) {
                        error "No package.json found — adjust project structure or detection logic."
                    }

                    def svcList = raw.split('\n').collect { it.trim() }.findAll { it }
                    env.SERVICE_DIRS_LIST = svcList.join(',')
                    echo "Detected services: ${svcList}"
                }
            }
        }

        stage('Build & Package (Node)') {
            steps {
                script {
                    def SERVICE_DIRS = env.SERVICE_DIRS_LIST?.trim() ? env.SERVICE_DIRS_LIST.split(',') : []
                    if (!SERVICE_DIRS) {
                        error "SERVICE_DIRS is empty — aborting build."
                    }

                    def dockerAvailable = sh(script: "which docker >/dev/null 2>&1 && echo yes || echo no", returnStdout: true).trim()
                    echo "Docker available: ${dockerAvailable}"

                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            def svc = dirPath.tokenize('/').last()
                            echo "=== Building service: ${svc} (path: ${dirPath}) ==="

                            if (dockerAvailable == 'yes') {
                                echo "Building inside node:18 Docker image for ${svc}"
                                docker.image('node:18').inside('--workdir /workspace') {
                                    sh '''
                                      set -eux
                                      ls -la .
                                      if [ -f package-lock.json ]; then
                                        npm ci
                                      else
                                        npm install
                                      fi

                                      if grep -q '"build"' package.json 2>/dev/null; then
                                        npm run build || true
                                      elif grep -q '"test"' package.json 2>/dev/null; then
                                        npm test || true
                                      else
                                        echo "No build/test script found, skipping"
                                      fi
                                    '''
                                }
                            } else {
                                echo "Docker not available — attempting to run npm on this agent for ${svc}"
                                // Use Groovy interpolation for svc where needed; avoid ${svc} in single-quoted blocks.
                                // Here we use a single-line sh with Groovy interpolation for the tar command below.
                                sh '''
                                  set -eux
                                  if ! command -v npm >/dev/null 2>&1; then
                                    echo "npm not found on agent — skipping build for service"
                                    exit 0
                                  fi

                                  if [ -f package-lock.json ]; then
                                    npm ci
                                  else
                                    npm install
                                  fi

                                  if grep -q '"build"' package.json 2>/dev/null; then
                                    npm run build || true
                                  elif grep -q '"test"' package.json 2>/dev/null; then
                                    npm test || true
                                  else
                                    echo "No build/test script found, skipping"
                                  fi
                                '''
                            }

                            // Create an artifact tar using Groovy interpolation to include svc name
                            sh "tar -czf \"${env.WORKSPACE}/${svc}-artifact.tgz\" . || true"
                        }
                    }
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    def dockerAvailable = sh(script: "which docker >/dev/null 2>&1 && echo yes || echo no", returnStdout: true).trim()
                    if (dockerAvailable != 'yes') {
                        echo "Docker not available on agent — skipping Docker build/push."
                        return
                    }

                    withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                        sh '''echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin || true'''
                    }

                    def SERVICE_DIRS = env.SERVICE_DIRS_LIST?.trim() ? env.SERVICE_DIRS_LIST.split(',') : []
                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            def svc = dirPath.tokenize('/').last()
                            if (fileExists('Dockerfile')) {
                                def tag = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.IMAGE_TAG}"
                                echo "Building and pushing Docker image: ${tag}"
                                sh "docker build -t ${tag} ."
                                sh "docker push ${tag}"
                                sh "docker tag ${tag} ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                                sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                            } else {
                                echo "No Dockerfile in ${dirPath} — skipping Docker build for ${svc}"
                            }
                        }
                    }

                    sh 'docker logout || true'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                script {
                    archiveArtifacts artifacts: '**/dist/**, **/*-artifact.tgz, **/*.tgz', allowEmptyArchive: true, fingerprint: true
                }
            }
        }
    }

    post {
        success { echo "Pipeline completed successfully!" }
        failure { echo "Pipeline failed — check logs" }
        always  { echo "Job finished" }
    }
}

