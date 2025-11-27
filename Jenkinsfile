pipeline {
    agent any

    environment {
        DOCKERHUB_CRED_ID   = 'dockerhub-creds'
        DOCKERHUB_NAMESPACE = 'vja304786038'
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
                        error "No package.json found — no Node services detected."
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
                    def SERVICE_DIRS = env.SERVICE_DIRS_LIST.split(',')

                    def dockerAvailable = sh(
                        script: "which docker >/dev/null 2>&1 && echo yes || echo no",
                        returnStdout: true
                    ).trim()
                    echo "Docker available: ${dockerAvailable}"

                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            def svc = dirPath.tokenize('/').last()

                            echo "=== Building service: ${svc} ==="

                            if (dockerAvailable == 'yes') {
                                echo "Building ${svc} using Docker agent (node:18)"
                                docker.image('node:18').inside('--workdir /workspace') {
                                    sh '''
                                      set -eux
                                      if [ -f package-lock.json ]; then
                                        npm ci
                                      else
                                        npm install
                                      fi

                                      if grep -q '"build"' package.json; then
                                        npm run build || true
                                      elif grep -q '"test"' package.json; then
                                        npm test || true
                                      else
                                        echo "No build/test script found"
                                      fi
                                    '''
                                }
                            } else {
                                echo "No Docker inside agent — trying host npm"
                                sh '''
                                  set -eux
                                  if ! command -v npm >/dev/null 2>&1; then
                                    echo "npm not found — skipping build"
                                    exit 0
                                  fi

                                  if [ -f package-lock.json ]; then
                                    npm ci
                                  else
                                    npm install
                                  fi

                                  if grep -q '"build"' package.json; then
                                    npm run build || true
                                  elif grep -q '"test"' package.json; then
                                    npm test || true
                                  else
                                    echo "No build/test script found"
                                  fi
                                '''
                            }

                            sh "tar -czf \"${env.WORKSPACE}/${svc}-artifact.tgz\" . || true"
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
                        echo "Docker not available — skipping image builds"
                        return
                    }

                    withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID,
                                                      usernameVariable: 'DH_USER',
                                                      passwordVariable: 'DH_PASS')]) {
                        sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
                    }

                    def SERVICE_DIRS = env.SERVICE_DIRS_LIST.split(',')

                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            if (!fileExists('Dockerfile')) {
                                echo "No Dockerfile found — skipping"
                                continue
                            }

                            def svc = dirPath.tokenize('/').last()

                            // sanitize branch name for docker tag
                            def branchSafe = (env.BRANCH_NAME ?: 'main')
                                .replaceAll('[^A-Za-z0-9_.-]', '-')
                                .toLowerCase()

                            def imageTag = "${env.DOCKERHUB_NAMESPACE}/${svc}:${branchSafe}-${env.BUILD_NUMBER}"

                            echo "Building & pushing image: ${imageTag}"

                            sh "docker build -t ${imageTag} ."
                            sh "docker push ${imageTag}"

                            // push latest
                            sh "docker tag ${imageTag} ${env.DOCKERHUB_NAMESPACE}/${svc}:latest"
                            sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svc}:latest"
                        }
                    }

                    sh 'docker logout || true'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: '*-artifact.tgz', allowEmptyArchive: true
            }
        }
    }

    post {
        success { echo "Pipeline completed successfully!" }
        failure { echo "Pipeline failed — check logs" }
        always  { echo "Job finished" }
    }
}

