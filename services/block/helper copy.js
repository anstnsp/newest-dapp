const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger.js');
const {resultCode} = require('../../resultCode');

async function load_config(walletName, identity, config) {

    const err = {
        code : '',
        message : ''
    }

    try {
        const walletPath = path.join(__dirname, walletName);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(identity);
        if(!userExists) {
            logger.error('An identity for the user %s does not exist in the wallet', identity);
            logger.error('Run the enrollHccAdmin.js application before retrying');
            err.code = resultCode.FABRIC_IDENTITY_ERROR.code;
            err.message = resultCode.FABRIC_IDENTITY_ERROR.message;
            return new Error(err);
        }
        const connectionOptions = {
            identity: identity,
            wallet,
            discovery : { enabled : false, asLocalhost : false},
            clientTlsIdentity : identity 
          };
        
        const gateway = new Gateway();
        await gateway.connect(config, connectionOptions);

        return gateway;
    } catch(error) {
        logger.error('load_config() error : %s', error);
        err.code = resultCode.FABRIC_GATEWAY_CONNECT_ERROR.code;
        err.message = resultCode.FABRIC_GATEWAY_CONNECT_ERROR.message;
        return err;
    }

}

exports.load_config = load_config;