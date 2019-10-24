/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';


/* ========================
||    LOAD THE CONFIG     ||
==========================*/
require('../../utils/env').readEnv();
const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet, X509WalletMixin } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const ccpPath = path.resolve(__dirname,process.env.NETWORK_CONFIG_FILE);
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
// const logger = require('../../utils/logger').logger;

async function enrollAdmin() {
    try {

        // Create a new CA client for interacting with the CA.
        const caURL = ccp.certificateAuthorities[process.env.CA_NAME].url;
        const ca = new FabricCAServices(caURL); //
        const walletPath =path.join(process.cwd(), process.env.WALLETNAME);

        const wallet = new FileSystemWallet(walletPath); 
        console.log(`Wallet path: ${walletPath}`);
        console.log('wallet : ' + JSON.stringify(wallet));
        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists(process.env.ADMIN);
        if (adminExists) {
            console.log('An identity for the admin user "hccAdmin" already exists in the wallet');
            return;
        }
 
        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: process.env.ENROLL_ID, enrollmentSecret: process.env.ENROLL_SECRET });    
        const identity = await X509WalletMixin.createIdentity(process.env.MSP, enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(process.env.ADMIN, identity);
        console.log('Successfully enrolled admin user %s and imported it into the wallet', process.env.ADMIN);
    } catch (error) {
        console.error(`Failed to enroll admin user %s : ${error}`, process.env.ADMIN);
        process.exit(1);
    }
}
enrollAdmin();
