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
                          echo "Detecting Node services (package.json)..."

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

                    SERVICE_DIRS = raw.split('\n').collect { it.trim() }.findAll { it }
                    echo "Detected services: ${SERVICE_DIRS}"
                }
            }
        }

        stage('Build & Package (Node)') {
            steps {
                script {
                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            echo "Building Node service: ${dirPath}"

                            // Install deps
                            sh '''
                              if [ -f package-lock.json ]; then
                                npm ci
                              else
                                npm install
                              fi
                            '''

                            // Build or test
                            sh '''
                              if grep -q '"build"' package.json; then
                                echo "Running npm run build"
                                npm run build || true
                              elif grep -q '"test"' package.json; then
                                echo "Running npm test"
                                npm test || true
                              else
                                echo "No build or test script found — skipping"
                              fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    def dockerAvailable = sh(
                        script: "which docker >/dev/null 2>&1 && echo yes || echo no",
                        returnStdout: true
                    ).trim()

                    if (dockerAvailable != 'yes') {
                        echo "Docker not found — skipping Docker build/push."
                        return
                    }

                    withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                        sh '''echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin || true'''
                    }

                    for (dirPath in SERVICE_DIRS) {
                        def svc = dirPath.tokenize('/').last()
                        dir(dirPath) {
                            if (fileExists('Dockerfile')) {
                                def tag = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.IMAGE_TAG}"
                                echo "Building Docker image: ${tag}"

                                sh "docker build -t ${tag} ."
                                sh "docker push ${tag}"

                                sh "docker tag ${tag} ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                                sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                            } else {
                                echo "No Dockerfile found in ${dirPath} — skipping Docker image."
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
                    archiveArtifacts artifacts: '**/dist/**, **/*.tgz', allowEmptyArchive: true, fingerprint: true
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

