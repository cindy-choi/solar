/*
 * @author. sena@soompay.net
 * @comment. return web3 object from electron.
 */
var Web3 = class Web3 {
    constructor(){
        this.web3 = require('electron').remote.getGlobal('web3');
    }

    ping(){
        return 'pong';
    }

    sleepPing( millisec ){
        return new Promise( resolve => setTimeout( resolve, millisec ) );
    }

    // TODO: How can I call a function with string( function name )?
    personal_loginAccount( address, password ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.personal.loginAccount( address, password, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    personal_unlockAccount( address, password, duration ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.personal.unlockAccount( address, password, duration, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    personal_newAccount( password ) {
        return new Promise( ( resolve, reject ) => {
            this.web3.personal.newAccount( password, (error, result) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_getAccounts() {
        return new Promise( ( resolve, reject ) => {
            this.web3.eth.getAccounts( (error, result) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_getBalance( address ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.eth.getBalance( address, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_sendTransaction( object ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.eth.sendTransaction( object, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }
    
    eth_getTransaction( hash ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.eth.getTransaction( hash, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_getTransactionReceipt( hash ) {
        return new Promise ( ( resolve, reject ) => {
            this.web3.eth.getTransactionReceipt( hash, ( error, result ) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_getAllTransactionList( address ) {
        return new Promise( ( resolve, reject ) => {
            this.web3.eth.getTransactionList( address, (error, result) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }

    eth_getEoaTransactionList( address ) {
        return new Promise( ( resolve, reject ) => {
            this.web3.eth.getEoaTransactionList( address, (error, result) => {
                if ( error ) { reject({ error: error }); }
                resolve( result );
            });
        });
    }
}

export var web3 = new Web3();
