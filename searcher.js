// searcher.js

const _ = {};
const popura = require('popura');
const MAL = popura(process.env.MAL_USER, process.env.MAL_PASSWORD);
const nani = require('nani').init(process.env.ANILIST_CLIENT_ID, process.env.ANILIST_CLIENT_SECRET);
const DataSource = require('./enums').DataSource;
const logger = require('au5ton-logger');

class Resolved {
    constructor(DataSource, data) {
        this.DataSource = DataSource;
        this.data = data;
    }
}
class Rejected {
    constructor(DataSource, err) {
        this.DataSource = DataSource;
        this.err = err;
    }
}

_.searchAnimes = (query) => {
    return new Promise((resolve, reject) => {
        let results = {};
        var promises = [];
        /*
        Start an asynchonous search for one anime service
        Using the Resolved and Rejected class, we'll make our promises
        more identifying with an Enum. This also gives us flexibility
        on WHEN or HOW to resolve instead of passing the data outright.
        This middleware is ONLY intended to brand the data via the
        Resolve and Rejected classes. Further data mangling will be
        done later. When all Promises resolve, we'll have all our
        data in a neat array, and we'll maximize asynchonous
        performance.
        */
        promises.push(new Promise((resolve, reject) => {
            //Queries MAL
            MAL.searchAnimes(query).then((results) =>{
                resolve(new Resolved(DataSource.MAL, results));
            }).catch((err) => {
                reject(new Rejected(DataSource.MAL, results));
            });
        }));
        promises.push(new Promise((resolve, reject) => {
            //Queries MAL
            MAL.searchAnimes(query).then((results) =>{
                resolve(new Resolved(DataSource.MAL, results));
            }).catch((err) => {
                reject(new Rejected(DataSource.MAL, results));
            });
        }));
        promises.push(new Promise((resolve, reject) => {
            //Queries MAL
            MAL.searchAnimes(query).then((results) =>{
                resolve(new Resolved(DataSource.MAL, results));
            }).catch((err) => {
                reject(new Rejected(DataSource.MAL, results));
            });
        }));
        Promise.all(promises).then((ResolvedArray) => {
            //logger.log(ResolvedArray)
            for(let Resolved of ResolvedArray) {
                if(Resolved.DataSource === DataSource.MAL) {
                    //expect results in particular format
                    resolve('something') //this returns:  failed to search with Searcher: TypeError: Cannot read property 'split' of undefined
                    //which means the reject()s and resolves are collapsing as intended!
                    //The error was in the message builder so our data made it over there without trouble.
                    //The logged message was made from the isValid promise, which means we caught the error without trouble too
                }
            }
            // returned data is in arguments[0], arguments[1], ... arguments[n]
            // you can process it here
            //logger.log(arguments)
        }).catch((Rejected) => {
            //err occured
            reject(Rejected)
        });
    });

};

module.exports = _;
