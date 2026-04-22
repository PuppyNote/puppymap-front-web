pipeline {
    agent any

    environment {
        APP_NAME     = 'puppymap-front-web'
        GIT_REPO_URL = 'https://github.com/PuppyNote/puppymap-front-web.git'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-credentials',
                    url: env.GIT_REPO_URL
            }
        }

        stage('Create .env') {
            steps {
                sh """
                    echo "VITE_API_URL=${VITE_API_URL}" > .env
                    echo "VITE_KAKAO_MAP_API_KEY=${VITE_KAKAO_MAP_API_KEY}" >> .env
                    echo "VITE_KAKAO_REST_API_KEY=${VITE_KAKAO_REST_API_KEY}" >> .env
                    echo "VITE_KAKAO_CLIENT_SECRET=${VITE_KAKAO_CLIENT_SECRET}" >> .env
                """
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${env.APP_NAME}:latest ."
            }
        }

        stage('Deploy') {
            steps {
                sh "docker stop ${env.APP_NAME} 2>/dev/null || true"
                sh "docker rm ${env.APP_NAME} 2>/dev/null || true"
                sh """
                    docker run -d \
                        --name ${env.APP_NAME} \
                        --restart always \
                        -p 7000:7000 \
                        ${env.APP_NAME}:latest
                """
            }
        }

        stage('Cleanup') {
            steps {
                sh "docker image prune -f"
            }
        }
    }

    post {
        failure {
            echo '배포 실패'
        }
        success {
            echo '배포 성공'
        }
    }
}
