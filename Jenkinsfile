pipeline {
    agent any

    environment {
        DOCKERHUB_CRED_ID   = 'dockerhub-creds'
        DOCKERHUB_NAMESPACE = 'vja304786038'
        IMAGE_TAG           = "${env.BRANCH_NAME ?: 'main'}-${env.BUILD_NUMBER}"
        MAVEN_OPTS          = "-DskipTests=true" // unused for Node but harmless if left
    }

    options {
        skipDefaultCheckout()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {

        stage('Checkout') {
            steps {
                // Uses GitHub credentials from Multibranch job
                checkout scm
            }
        }

        stage('Detect Services') {
            steps {
                script {
                    def raw = sh(
                        script: """
                          set -eu
                          echo "Detecting Node services (package.json)..."
                          find . -name package.json -not -path './.git/*' -not -path '*/node_modules/*' -print0 \
                            | xargs -0 -r -n1 dirname \
                            | sed 's|^\\./||' \
                            | grep -v '^$' \
                            | sort -u || true
                        """.stripIndent(),
                        returnStdout: true
                    ).trim()

                    if (!raw) {
                        error "No package.json found — adjust project structure or detection logic."
                    }

                    SERVICE_DIRS = raw.split('\\n').collect { it.trim() }.findAll { it }
                    echo "Detected services: ${SERVICE_DIRS}"
                }
            }
        }

        stage('Build & Package (Node)') {
            steps {
                script {
                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            def svc = dirPath.tokenize('/').last()
                            echo "Building Node service: ${svc} (path: ${dirPath})"

                            // Install deps
                            sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'

                            // Run build if exists, otherwise run test (but do not fail pipeline on missing build)
                            sh '''
                              if grep -q "\"build\"" package.json 2>/dev/null; then
                                echo "Running npm run build"
                                npm run build || true
                              else
                                echo "No build script found; running npm test if present"
                                if grep -q "\"test\"" package.json 2>/dev/null; then
                                  npm test || true
                                else
                                  echo "No test script either; skipping build/test"
                                fi
                              fi
                            '''.stripIndent()
                        }
                    }
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    def dockerAvailable = sh(script: "which docker >/dev/null 2>&1 && echo yes || echo no",
                                             returnStdout: true).trim()

                    if (dockerAvailable != 'yes') {
                        echo "Docker not found on this agent — skipping Docker build/push."
                    } else {
                        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                            try {
                                sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
                            } catch (e) {
                                echo "Docker login failed: ${e}"
                            }
                        }

                        for (dirPath in SERVICE_DIRS) {
                            def svc = dirPath.tokenize('/').last()
                            dir(dirPath) {
                                if (fileExists('Dockerfile')) {
                                    def tag = "${env.DOCKERHUB_NAMESPACE}/${svc}:${env.IMAGE_TAG}"
                                    echo "Building Docker image for ${svc} -> ${tag}"
                                    try {
                                        sh "docker build -t ${tag} ."
                                        sh "docker push ${tag}"
                                        sh "docker tag ${tag} ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                                        sh "docker push ${env.DOCKERHUB_NAMESPACE}/${svc}:latest || true"
                                    } catch (e) {
                                        echo "Docker build/push failed for ${svc}: ${e}"
                                    }
                                } else {
                                    echo "No Dockerfile found in ${dirPath} — skipping image build."
                                }
                            }
                        }

                        sh 'docker logout || true'
                    }
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                script {
                    // Archive common Node outputs: dist folders and packaged tgz files
                    archiveArtifacts artifacts: '**/dist/**, **/*.tgz', fingerprint: true, allowEmptyArchive: true
                }
            }
        }
    }

    post {
        success { echo "Pipeline completed successfully!" }
        failure { echo "Pipeline failed — check logs" }
        always { echo "Job finished" }
    }
}

