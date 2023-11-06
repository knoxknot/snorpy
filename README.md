#### Usage
# clone the repository
git clone https://github.com/knoxknot/snorpy.git
cd snorpy

# generate a certificate for the app
CERT_DIR="snorpy"; CERT_NAME="snorpy"
mkcert -cert-file ${CERT_DIR}/${CERT_NAME}.pem -key-file ${CERT_DIR}/${CERT_NAME}-key.pem ${CERT_NAME} localhost 127.0.0.1 ::1

# define the environment variables
tee -a .env <<EOF
LOGGING=true
SSL=true
SSL_KEY_PATH="snorpy-key.pem"
SSL_CERT_PATH="snorpy.pem"
HTTPS_PORT=4433
EOF

# install libraries and run the app
npm install
npm start