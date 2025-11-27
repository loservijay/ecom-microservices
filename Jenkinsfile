pipeline {
    agent any

    environment {
        DOCKERHUB_CRED_ID   = 'dockerhub-creds'
        DOCKERHUB_NAMESPACE = 'vja304786038'
        IMAGE_TAG           = "${env.BRANCH_NAME ?: 'main'}-${env.BUILD_NUMBER}"
        MAVEN_OPTS          = "-DskipTests=true"
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
                    // Portable detection: find pom.xml anywhere (limit depth if you want)
                    // - exclude .git and target directories
                    def raw = sh(
                        script: """
                          set -eu
                          # Use portable find: find pom.xml and print dirname
                          find . -name pom.xml -not -path './.git/*' -not -path '*/target/*' -exec dirname {} \\; | sed 's|^\\./||' | sort -u || true
                        """.stripIndent(),
                        returnStdout: true
                    ).trim()

                    if (!raw) {
                        error "No pom.xml found — adjust project structure or detection logic."
                    }

                    // Build a sanitized list of service directories
                    SERVICE_DIRS = raw.split('\\n').collect { it.trim() }.findAll { it }
                    echo "Detected services: ${SERVICE_DIRS}"
                }
            }
        }

        stage('Build & Package') {
            steps {
                script {
                    for (dirPath in SERVICE_DIRS) {
                        dir(dirPath) {
                            echo "Building ${dirPath}"
                            sh "mvn -B clean package ${env.MAVEN_OPTS}"
                            // Create a safe stash name (replace non-file chars)
                            def safeName = "jar-${dirPath.replaceAll(/[^A-Za-z0-9_.-]/, '_')}"
                            stash includes: "target/*.jar", name: safeName, allowEmpty: true
                        }
                    }
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    // Check if docker exists on this agent
                    def dockerAvailable = sh(script: "which docker >/dev/null 2>&1 && echo yes || echo no",
                                             returnStdout: true).trim()

                    if (dockerAvailable != 'yes') {
                        echo "Docker not found on this agent — skipping Docker build/push."
                    } else {
                        // Login to Docker Hub using credentials
                        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CRED_ID, usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                            // wrap in try so login failures don't break pipeline cleanup
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
                                        // Also push latest tag (ignore errors)
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

                        // Logout if docker present
                        sh 'docker logout || true'
                    }
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                script {
                    for (dirPath in SERVICE_DIRS) {
                        def stashName = "jar-${dirPath.replaceAll(/[^A-Za-z0-9_.-]/, '_')}"
                        try {
                            unstash stashName
                        } catch (e) {
                            echo "Skipping unstash for ${stashName}: ${e}"
                        }
                    }
                    archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true
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

