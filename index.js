// Node JS requires
const express = require('express');
const axios = require('axios');
const request = require('request');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const fs = require('fs');
const cities = require('./addresses/cities.json').addresses;

// Setup express start
const app = express();
app.use(express.static(__dirname + '/public'));
const server = app.listen(8080, () => {
    console.log(`Express running → http://localhost:${server.address().port}`);
});
app.set('view engine', 'pug');
app.use(cookieSession({
    name: 'session',
    keys: [makeID(16)]
}));
app.use(cookieParser());

function makeID(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }


// My Foursquare setup
const clientID = 'YQHN4QP2CYQJOLWZ031VTHS0EIBQ23CHLHTEPDJENIJPEQUM';
const clientSecret = '33DKD5HMM30GAGTJ2J3ILGOW1RUV0H2WPD1K3YCZ32X4XVBF';

// Express routes

// ANCHOR Index
app.get('/', (req, res) => {
    res.render('index', {clientID: clientID});
});

// ANCHOR Foursquare oAuth
app.get('/oauth_old', (req, res) => {
    const requestCode = req.query.code;
    request({
        url: `https://foursquare.com/oauth2/access_token?client_id=${clientID}&client_secret=${clientSecret}&grant_type=authorization_code&redirect_uri=http://localhost:8080/welcome&code=${requestCode}`,
        method: 'POST',
        headers: {
            accept: 'application/json'
        }
    }, (err, resp, body) => {
        let result = JSON.parse(body);
        if (result.access_token) {
            req.session.token = result.access_token;
            res.redirect('/welcome');
            console.log('oAuth complete; Access token is set');
            // console.log(result.access_token);
        } else {
            console.log('oAuth failed; Response:');
            console.log(result);
            res.redirect('/welcome');
        }
    });
});

// ANCHOR Welcome page
app.get('/welcome', (req, res) => {
    if (req.session.token) {
        res.cookie('token', req.session.token);
        let currentDate = new Date();
        let plainDate = currentDate.toISOString().slice(0,10).replace(/-/g,"");
        request({
            url: `https://api.foursquare.com/v2/users/self`,
            method: 'GET',
            qs: {
                oauth_token: req.session.token,
                v: `${plainDate}`
            }
        }, (err, resp, body) => {
            let result = JSON.parse(body);
            if (result.meta.code == 200) {
                res.render('welcome', {data: result, username: result.response.user.firstName});
                console.log('User logged in successfully');
            } else {
                console.log('Getting users details failed; Response:');
                console.log(result);
                res.redirect('/welcome');
            }
        });
    } else {
        res.cookie('token', '');
        res.redirect('/');
    }
});

// RG Foursquare ID and Secret
app.get('/oauth/new', (req, res) => {
    // const clientID = 'YQHN4QP2CYQJOLWZ031VTHS0EIBQ23CHLHTEPDJENIJPEQUM';
    // const clientSecret = '33DKD5HMM30GAGTJ2J3ILGOW1RUV0H2WPD1K3YCZ32X4XVBF';
    const bbhive = 'FSYXLSNTDFS0GJMQT05UVQSDAGHDSN%3A%3A1625482881';
    const oauth_token = '5Q1YUBGWYSOY0Z2VXRE13SGFHBHIKIVEZRY2SUKRNZGMSWSM-0';

    axios({
        url: `https://foursquare.com/oauth2/authenticate?client_id=${clientID}&response_type=code&container=android&androidKeyHash=C4%3A38%3A69%3A0B%3AB8%3A20%3A1B%3ACF%3ACA%3A2D%3A54%3A76%3AA2%3AA7%3AAD%3A0B%3AB5%3AE9%3A7C%3ACA`,
        method: 'post',
        headers: {
            Cookie: `bbhive=${bbhive}; oauth_token=${oauth_token};`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: 'fs-request-signature=2aef83afd82e9cd9672ae321ed10d6753cff8194%3A1567342059261&shouldAuthorize=true'    
    })
    .then(function(response) {
        // let result = response.data;
        console.log(response);
    })
    .catch(function(error) {
        console.log('There was an error with the axios request on foursquare authentication; Error:');
        if (error.response) {
            console.log('Error falls out of range 2xx');
            console.log(error.response.data);
            console.log(error.response.status);
        } else {
            console.log('Success');
            let pathFull = error.request._options.path;
            let path = pathFull.slice(6);
            let oauthCode = path;
            request({
                url: `https://foursquare.com/oauth2/access_token?client_id=${clientID}&client_secret=${clientSecret}&grant_type=authorization_code&code=${oauthCode}`,
                method: 'get',
                headers: {
                    accept: 'application/json'
                }
            }, (err, resp, body) => {
                let result = JSON.parse(body);
                if (result.access_token) {
                    req.session.token = result.access_token;
                    res.redirect('/welcome');
                    console.log('oAuth complete; Access token is set');
                    console.log(result.access_token);
                } else {
                    console.log('oAuth failed; Response:');
                    console.log(result);
                    res.redirect('/welcome');
                }
            });
        }
    });
});

// ANCHOR Add a venue
app.get('/welcome/add_venue', (req, res) => {
    if (req.session.token) {
        res.cookie('token', req.session.token);
        let currentDate = new Date();
        let plainDate = currentDate.toISOString().slice(0,10).replace(/-/g,"");
        let venueDetails = {
            name: 'test',
            latLon: '51.627081, -1.443221',
        };
        request({
            url: `https://api.foursquare.com/v2/venues/add`,
            method: 'POST',
            qs: {
                oauth_token: req.session.token,
                name: `${venueDetails.name}`,
                ll: `${venueDetails.latLon}`,
                // city: '',
                primaryCategoryId: '4bf58dd8d48988d103941735',
                v: `${plainDate}`
            },
        }, (err, resp, body) => {
            let result = JSON.parse(body);
            if (result.meta.code == 200) {
                let jsonObj;
                let jsonString;
                fs.readFile('added_properties.json', 'utf8', (err, data) => {
                    if (err) {
                        console.log(err);
                    } else {
                        jsonObj = JSON.parse(data);
                        jsonObj.properties.push(result);
                        jsonString = JSON.stringify(jsonObj);
                        fs.writeFile('added_properties.json', jsonString, 'utf8', ()=> {
                            res.json(result);
                        });
                    }
                });
            } else {
                console.log('Adding a venue failed; Response:');
                console.log(result);
                res.redirect('/welcome');
            }
        });
    } else {
        res.cookie('token', '');
        res.redirect('/');
    }
});

// ANCHOR Edit a venue
app.get('/welcome/edit_venue', (req, res) => {
    if (req.session.token) {
        res.cookie('token', req.session.token);
        let currentDate = new Date();
        let plainDate = currentDate.toISOString().slice(0,10).replace(/-/g,"");
        let venueID = '5d4bed677b4f700008fa7cfa';
        request({
            url: `https://api.foursquare.com/v2/venues/${venueID}/proposeedit`,
            method: 'POST',
            qs: {
                oauth_token: req.session.token,
                // name: '🔵 𝕭𝕮𝕱𝕮 ⚪️',
                // city: '',

                // Create Countries
                // addCategoryIds: '530e33ccbcbc57f1066bbff8, 530e33ccbcbc57f1066bbff7',
                // removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff8',
                // primaryCategoryId: '530e33ccbcbc57f1066bbff7',
                // creatingView: 'venue-desktop-page',
                // wsid: 'FSYXLSNTDFS0GJMQT05UVQSDAGHDSN',

                // Create States
                // addCategoryIds: '530e33ccbcbc57f1066bbff7, 530e33ccbcbc57f1066bbff8',
                // removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff7',
                // primaryCategoryId: '530e33ccbcbc57f1066bbff8',

                // Create Counties
                // addCategoryIds: '5bae9231bedf3950379f89d0, 5345731ebcbc57f1066c39b2',
                // removeCategoryIds: '4bf58dd8d48988d103941735, 5bae9231bedf3950379f89d0',
                // primaryCategoryId: '5345731ebcbc57f1066c39b2',

                // Create Towns
                addCategoryIds: '5bae9231bedf3950379f89d0, 5345731ebcbc57f1066c39b3',
                removeCategoryIds: '4bf58dd8d48988d103941735, 5bae9231bedf3950379f89d0',
                primaryCategoryId: '5345731ebcbc57f1066c39b3',
                v: '20150209',
            }
        }, (err, resp, body) => {
            let result = JSON.parse(body);
            if (result.meta.code == 200) {
                let jsonObj;
                let jsonString;
                fs.readFile('added_properties.json', 'utf8', (err, data) => {
                    if (err) {
                        console.log(err);
                    } else {
                        jsonObj = JSON.parse(data);
                        jsonObj.properties.push(result);
                        jsonString = JSON.stringify(jsonObj);
                        fs.writeFile('added_properties.json', jsonString, 'utf8', ()=> {
                            res.json(result);
                        });
                    }
                });
            } else {
                console.log('Adding a venue failed; Response:');
                console.log(result);
                res.redirect('/welcome');
            }
        });
    } else {
        res.cookie('token', '');
        res.redirect('/');
    }
});

// ANCHOR Multiple Venues
app.get('/welcome/multiple_venues', (req, res) => {
    if (req.session.token) {
        res.cookie('token', req.session.token);
        test().then(() => {
            console.log('MULTIPLE VENUES PROCESS HAS FINISHED');
            res.redirect('/welcome');
        });
    
    } else {
        res.cookie('token', '');
        res.redirect('/');
    }

    async function test() {
        console.log('STARTED MULTIPLE VENUES PROCESS');
        console.log('------------------------------------');
        console.log(' ');

        // CHECK CASH AMOUNT
        // CHECK CASH OFFER AMOUNT
        // CHECK WHICH CATEGORY PROP U ARE MAKING
        // MAKESURE TO CHECK THE PERCENTAGE OF THE PROPERTY U ARE LISTING 1 OR 1000!!!!!!!!
        // DOULBE CHECK HOW MANY U ARE LISTING!

        for (let i = 0; i < 3; i++) {
            await new Promise(next => {
                initiateGuestAccount(i, function(){
                    next();
                });
            });
        }
    }

    async function initiateGuestAccount(i, callback) {
        let currentCount = i;
        console.log('Guest account number: ' + currentCount);
        // 1. Register guest account
        await new Promise(next => {
            registerGuestAccount(currentCount, function(){
                callback();
            });
        });

        // 2. Buy cash crossover property
        // buyCashPropertyGuestAccount();

        // 3. Complete paperwork for cash crossover property
        // completePaperworkCashCrossoverGuestAccount();

        // 4. Bank account makes offer for property of 200b
        // offerCashBankAccount();

        // 5. Guest account accepts bank accounts offer
        // acceptCashOfferGuestAccount();

        // 6. Create property
        // createProperty();

        // 7. Guest account valuates property
        // valuatePropertyGuestAccount();

        // 8. Guest account buys property
        // buyPropertyGuestAccount();

        // 9. Guest account completes property paperwork
        // completePaperworkGuestAccount();

        // 10. Guest account lists property on marketplace
        // listOnMarketplaceGuestAccount();

        // 11. Sell cash crossover property
        // sellCashCrossoverPropertyGuestAccount();
    }

    function registerGuestAccount(currentCount, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/register_anonymous`,
            method: 'post',
            headers: {
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            console.log('Guest account registered successfully');
            let result = response.data;
            let jsonObj;
            let jsonString;
            let guestDetails = {};
            guestDetails.iterationCount = currentCount;
            guestDetails.id = result.response.player.id;
            guestDetails.token = result.response.anonymousToken;
            fs.readFile('guest_accounts.json', 'utf8',  (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    if (tryParseJSON(data)) {
                        jsonObj = JSON.parse(data);
                        jsonObj.accounts.push(guestDetails);
                        jsonString = JSON.stringify(jsonObj);
                            fs.writeFile('guest_accounts.json', jsonString, 'utf8', ()=> {
                                console.log('Guest added to json database successfully');
                            });
                    } else {
                        console.log('Can not parse guest account JSON data; Data:');
                        console.log(data);
                        res.redirect('/welcome');
                    }
                }
            });

            return { guestDetails: guestDetails };
        })
        .then(function(response) {
            let guestDetails = response.guestDetails;
            buyCashLandGuestAccount(guestDetails, function() {
                offerCashBankAccount(guestDetails, function() {
                    checkOffersGuestAccount(guestDetails, function(offerID) {
                        acceptCashOfferGuestAccount(guestDetails, offerID, function() {
                            createProperty(guestDetails, function(venueID) {
                                valuatePropertyGuestAccount(guestDetails, venueID, function() {
                                    buyPropertyGuestAccount(guestDetails, venueID, function() {
                                        completePaperworkGuestAccount(guestDetails, venueID, function() {
                                            listOnMarketplaceGuestAccount(guestDetails, venueID, function() {
                                                sellCashCrossoverLandGuestAccount(guestDetails, function() {
                                                    callback();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        })
        .catch(function(error) {
            console.log('There was an error with the axios request for guest registration; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function buyCashLandGuestAccount(guestDetails, callback) {
        let postData = {
            "col": 197239,
            "currency": "coins",
            "player_id": `${guestDetails.id}`,
            "player_lat": 51.31087230843416,
            "player_lon": -2.772894157344822,
            "row": 267073
        }
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/buy`,
            method: 'post',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: postData
        })
        .then(function(response) {
            let result = response.data;
            console.log('Bought land tile for cash crossover');
            callback();
            // setTimeout(function(){
            // },5000);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with purchasing the cash crossover land tile Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function offerCashBankAccount(guestDetails, callback) {
        let offerDetails = {
            "action":"place",
            "col":197239,
            "offer_price":"4.5E10",
            // "offer_price":"5E8",
            "player_id":"5d051234cbff2700016df755",
            "player_lat":51.31087230843416,
            "player_lon":-2.772894157344822,
            "row":267073
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offer_action`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: offerDetails
        })
        .then(function(response) {
            let result = response.data;
            console.log('Cash offer has been made');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with the bank acount making a cash offer; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function checkOffersGuestAccount(guestDetails, callback) {
        let postData = {
            "player_id":`${guestDetails.id}`
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offers_received`,
            method: 'post',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: postData
        })
        .then(function(response) {
            let result = response.data;
            console.log('Cash offers have been checked');
            let offerID = result.result[0].id;
            callback(offerID);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with the bank acount making a cash offer; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function acceptCashOfferGuestAccount(guestDetails, offerID, callback) {
        let offerDetails = {
            "action": "accept",
            "col": 0,
            "counter_price": 0,
            "offer_id": `${offerID}`,
            "row": 0,
            "type": "offer"
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offer_action`,
            method: 'post',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: offerDetails
        })
        .then(function(response) {
            let result = response.data;
            console.log('Accepted cash offer');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with the guest account accepting the offer; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }



    function createProperty(guestDetails, callback) {
        let currentDate = new Date();
        let plainDate = currentDate.toISOString().slice(0,10).replace(/-/g,"");
        let randomAddress = cities[Math.floor(Math.random() * cities.length)];
        let lat = randomAddress.lat;
        let lon = randomAddress.lng;
        let latLon = "" + lat + ", " + lon;
        axios({
            url: `https://api.foursquare.com/v2/venues/add`,
            method: 'post',
            params: {
                oauth_token: req.session.token,
                name: `${randomAddress.name}`,
                // name: 'Istanbul',
                ll: `${latLon}`,
                // ll: '39.039644, 125.761217',
                // city: `${randomAddress.name}`,
                primaryCategoryId: '4bf58dd8d48988d103941735',
                v: `${plainDate}`
            },
        })
        .then(function(response) {
            let result = response.data;
            let venueID = result.response.venue.id;
            axios({
                url: `https://api.foursquare.com/v2/venues/${venueID}/proposeedit`,
                method: 'post',
                params: {
                    oauth_token: req.session.token,
                    // name: '🏠 Want a custom County? DM me Instagram: landlord2properties',
                    // city: '',

                    // CREATE COUNTRIES - 151B
                    // addCategoryIds: '530e33ccbcbc57f1066bbff8, 530e33ccbcbc57f1066bbff7',
                    // removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff8',
                    // primaryCategoryId: '530e33ccbcbc57f1066bbff7',

                    // CREATE STATES - 130B
                    // addCategoryIds: '530e33ccbcbc57f1066bbff7, 530e33ccbcbc57f1066bbff8',
                    // removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff7',
                    // primaryCategoryId: '530e33ccbcbc57f1066bbff8',

                    // CREATE COUNTIES - 30B
                    addCategoryIds: '530e33ccbcbc57f1066bbff8, 5345731ebcbc57f1066c39b2',
                    removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff8',
                    primaryCategoryId: '5345731ebcbc57f1066c39b2',

                    // CREATE TOWNS - 21B
                    // addCategoryIds: '530e33ccbcbc57f1066bbff8, 530e33ccbcbc57f1066bbff3',
                    // removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff8',
                    // primaryCategoryId: '530e33ccbcbc57f1066bbff3',
                    v: `${plainDate}`
                }
            })
            .then(function(response) {
                let result = response.data;
                console.log('Venue added sucessfully');
                console.log('Venue name: ' + randomAddress.name);
                callback(venueID);
            })
            .catch(function(error) {
                console.log('There was an error with the axios request with editing a venue; Error:');
                if (error.response) {
                    console.log('Error falls out of range 2xx');
                    console.log(error.response.data);
                    console.log(error.response.status);
                } else {
                    console.log('General error');
                    console.log(error);
                }
            });
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with adding a venue; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function valuatePropertyGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/valuation`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed valuation of new property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with valuating the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function buyPropertyGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/buy/1000`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed purchase of new property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with buying the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function completePaperworkGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/complete`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed paperwork of new property');
            setTimeout(function(){
                callback();
            },1100);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with completing the new properties paperwork; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function listOnMarketplaceGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/marketplace/ask/${venueID}/1000`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('New property sucessfully listed on the marketplace');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with listing the new property on the marketplace; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function sellCashCrossoverLandGuestAccount(guestDetails, callback) {
        let postData = {
            "col": 197239,
            "player_id": "5d051234cbff2700016df755",
            "row": 267073
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/sell`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: postData
        })
        .then(function(response) {
            let result = response.data;
            console.log('Cash crossover land tile sucessfully sold');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with selling the cash crossover land tile; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }
});

// Yes I did basically copy this from the multiple offers process
// This can buy any country as long as it has atleast 0.1% under 370 coins
// ANCHOR Buying a property with coins
app.get('/welcome/coin_properties', (req, res) => {
    if (req.session.token) {
        res.cookie('token', req.session.token);
        test().then(() => {
            console.log('BUYING A PROPERTY WITH COINS FINISHED');
        });
    
    } else {
        res.cookie('token', '');
        res.redirect('/');
    }

    async function test() {
        console.log('STARTED BUYING A PROPERTY WITH COINS');
        console.log('------------------------------------');
        console.log(' ');
        res.redirect('/welcome');   

        // CHECK CASH AMOUNT
        // CHECK CASH OFFER AMOUNT
        // CHECK WHICH CATEGORY PROP U ARE MAKING
        // MAKESURE TO CHECK THE PERCENTAGE OF THE PROPERTY U ARE LISTING 1 OR 1000!!!!!!!!
        // DOULBE CHECK HOW MANY U ARE LISTING!

        for (let i = 0; i < 2; i++) {
            await new Promise(next => {
                initiateGuestAccount(i, function(){
                    next();
                });
            });
        }
    }

    async function initiateGuestAccount(i, callback) {
        let currentCount = i;
        console.log('Guest account number: ' + currentCount);
        // 1. Register guest account
        await new Promise(next => {
            registerGuestAccount(currentCount, function(){
                callback();
            });
        });

        // 2. Buy cash crossover property
        // buyCashPropertyGuestAccount();

        // 3. Complete paperwork for cash crossover property
        // completePaperworkCashCrossoverGuestAccount();

        // 4. Bank account makes offer for property of 200b
        // offerCashBankAccount();

        // 5. Guest account accepts bank accounts offer
        // acceptCashOfferGuestAccount();

        // 6. Create property
        // createProperty();

        // 7. Guest account valuates property
        // valuatePropertyGuestAccount();

        // 8. Guest account buys property
        // buyPropertyGuestAccount();

        // 9. Guest account completes property paperwork
        // completePaperworkGuestAccount();

        // 10. Guest account sells boosting property
        // sellPropertyGuestAccount();

        // 12. Guest account buys property needing coins
        // buyCashPropertyGuestAccount();

        // 11. Sell cash crossover property
        // sellCashCrossoverPropertyGuestAccount();
    }

    function registerGuestAccount(currentCount, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/register_anonymous`,
            method: 'post',
            headers: {
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            console.log('Guest account registered successfully');
            let result = response.data;
            let jsonObj;
            let jsonString;
            let guestDetails = {};
            guestDetails.iterationCount = currentCount;
            guestDetails.id = result.response.player.id;
            guestDetails.token = result.response.anonymousToken;
            fs.readFile('guest_accounts.json', 'utf8',  (err, data) => {
                if (err) {
                    console.log(err);
                } else {
                    if (tryParseJSON(data)) {
                        jsonObj = JSON.parse(data);
                        jsonObj.accounts.push(guestDetails);
                        jsonString = JSON.stringify(jsonObj);
                            fs.writeFile('guest_accounts.json', jsonString, 'utf8', ()=> {
                                console.log('Guest added to json database successfully');
                            });
                    } else {
                        console.log('Can not parse guest account JSON data; Data:');
                        console.log(data);
                        res.redirect('/welcome');
                    }
                }
            });

            return { guestDetails: guestDetails };
        })
        .then(function(response) {
            let guestDetails = response.guestDetails;
            buyCashPropertyGuestAccount(guestDetails, function() {
                completePaperworkCashCrossoverPropertyGuestAccount(guestDetails, function() {
                    offerCashBankAccount(guestDetails, function() {
                        acceptCashOfferGuestAccount(guestDetails, function() {
                            createProperty(guestDetails, function(venueID) {
                                valuatePropertyGuestAccount(guestDetails, venueID, function() {
                                    buyPropertyGuestAccount(guestDetails, venueID, function() {
                                        completePaperworkGuestAccount(guestDetails, venueID, function() {
                                            updateCoinsGuestAccount1(guestDetails, function() {
                                                updateCoinsGuestAccount2(guestDetails, function() {
                                                    sellPropertyGuestAccount(guestDetails, venueID, function() {
                                                        sellCashCrossoverPropertyGuestAccount(guestDetails, function() {
                                                            buyCoinPropertyGuestAccount(guestDetails, function() {
                                                                callback();
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        })
        .catch(function(error) {
            console.log('There was an error with the axios request for guest registration; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function buyCashPropertyGuestAccount(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/4d84ea3d02eb54815cb938f5/buy/1`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Bought property for cash crossover');
            callback();
            // setTimeout(function(){
            // },5000);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with purchasing the cash crossover property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function completePaperworkCashCrossoverPropertyGuestAccount(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/4d84ea3d02eb54815cb938f5/complete`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed cash crossover property paperwork');
            setTimeout(function(){
                callback();
            },1100);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with completing the cash crossover properties paperwork; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function offerCashBankAccount(guestDetails, callback) {
        let offerDetails = {
            "seller":`${guestDetails.id}`,
            "venueId":"4d84ea3d02eb54815cb938f5",
            "share":1,
            "amount": 170000000000
        };
        axios({
            url: `https://api.wearerealitygames.com/landlord/estateagent/offer`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: offerDetails
        })
        .then(function(response) {
            let result = response.data;
            console.log('Cash offer has been made');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with the bank acount making a cash offer; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function acceptCashOfferGuestAccount(guestDetails, callback) {
        let offerDetails = {
        "buyer":"5d051234cbff2700016df755",
        "venueId":"4d84ea3d02eb54815cb938f5"
        };
        axios({
            url: `https://api.wearerealitygames.com/landlord/estateagent/accept`,
            method: 'post',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: offerDetails
        })
        .then(function(response) {
            let result = response.data;
            console.log('Accepted cash offer');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with the guest account accepting the offer; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }



     function createProperty(guestDetails, callback) {
        let currentDate = new Date();
        let plainDate = currentDate.toISOString().slice(0,10).replace(/-/g,"");
        let randomAddress = cities[Math.floor(Math.random() * cities.length)];
        let lat = randomAddress.lat;
        let lon = randomAddress.lng;
        let latLon = "" + lat + ", " + lon;
        axios({
            url: `https://api.foursquare.com/v2/venues/add`,
            method: 'post',
            params: {
                oauth_token: req.session.token,
                name: `${randomAddress.name}`,
                ll: `${latLon}`,
                city: `${randomAddress.name}`,
                primaryCategoryId: '4bf58dd8d48988d103941735',
                v: `${plainDate}`
            },
        })
        .then(function(response) {
            let result = response.data;
            let venueID = result.response.venue.id;
            axios({
                url: `https://api.foursquare.com/v2/venues/${venueID}/proposeedit`,
                method: 'post',
                params: {
                    oauth_token: req.session.token,
                    addCategoryIds: '530e33ccbcbc57f1066bbff8, 530e33ccbcbc57f1066bbff7',
                    removeCategoryIds: '4bf58dd8d48988d103941735, 530e33ccbcbc57f1066bbff8',
                    primaryCategoryId: '530e33ccbcbc57f1066bbff7',
                    v: `${plainDate}`
                }
            })
            .then(function(response) {
                let result = response.data;
                console.log('Venue added sucessfully');
                console.log('Venue name: ' + randomAddress.name);
                callback(venueID);
            })
            .catch(function(error) {
                console.log('There was an error with the axios request with editing a venue; Error:');
                if (error.response) {
                    console.log('Error falls out of range 2xx');
                    console.log(error.response.data);
                    console.log(error.response.status);
                } else {
                    console.log('General error');
                    console.log(error);
                }
            });
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with adding a venue; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function valuatePropertyGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/valuation`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed valuation of new property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with valuating the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function buyPropertyGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/buy/1000`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed purchase of new property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with buying the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

     function completePaperworkGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/complete`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed paperwork of new property');
            setTimeout(function(){
                callback();
            },1100);
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with completing the new properties paperwork; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function updateCoinsGuestAccount1(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/players/self`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Checking guest accounts coins successful; Coins: ');
            console.log(result.response.statement.coins);
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with buying the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function updateCoinsGuestAccount2(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/players/self`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Checking guest accounts coins successful; Coins: ');
            console.log(result.response.statement.coins);
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with buying the new property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }


    function sellPropertyGuestAccount(guestDetails, venueID, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${venueID}/sell/1000`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed selling property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with selling the boosting property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function sellCashCrossoverPropertyGuestAccount(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/4d84ea3d02eb54815cb938f5/sell/1`,
            method: 'get',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Cash crossover property sucessfully sold');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with selling the cash crossover property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function buyCoinPropertyGuestAccount(guestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/0000000000000000000000AO/buy/1`,
            method: 'get',
            headers: {
                "x-fs-token": `${guestDetails.token}`,
                "x-user-id": `${guestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            console.log('Completed purchase of coin property');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request with buying the coin property; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }
});

// ANCHOR Making multiple offers for a coin property
app.get('/coin_make_multiple_offers', (req, res) => {
    asyncLoop().then(() => {
        console.log('MAKING MULTIPLE COIN OFFERS HAS FINISHED');
        res.redirect('/');
    });

    async function asyncLoop() {
        let details = {
            'token': 'YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV',
            'id': '5d051234cbff2700016df755'
        };
        let offerPropertyID = '0000000000000000000000AO';
        axios({
            url: `https://api.wearerealitygames.com/landlord/assets/${offerPropertyID}/owners`,
            method: 'GET',
            headers: {
                "x-fs-token": `${details.token}`,
                "x-user-id": `${details.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then( async function(response) {
            let result = response.data;
            console.log('Making multiple offers');
            console.log('------------------------------------');
            console.log(' ');
            let venueOwners = result.response.owners;

            for (let i = 0; i < venueOwners.length; i++) {
                console.log('Owner number ' + i);
                await new Promise(next => {
                    guestMakeOffer(venueOwners[i], offerPropertyID, function(){
                        next();
                    });
                });
            }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    async function guestMakeOffer(currentOwnerDetails, offerPropertyID, callback) {
        if (currentOwnerDetails.name == "Guest") {
            let requestData = {
                "seller":`${currentOwnerDetails.playerId}`,
                "venueId":`${offerPropertyID}`,
                "share":3,
                "amount":2300000000
            };
            axios({
                url: `https://api.wearerealitygames.com/landlord/estateagent/offer`,
                method: 'post',
                headers: {
                    "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                    "x-user-id": `5d051234cbff2700016df755`,
                    "x-app-version-code": "141",
                    "x-app-version": "2.8.1",
                    "x-app-platform": "Android",
                    "x-app-id": "com.landlordgame.tycoon",
                    "x-app-flavor": "prod",
                    "Content-Type": "application/json",
                    "User-Agent": "Android",
                    "Accept-Encoding": "gzip"
                },
                data: requestData
            })
            .then(function(response) {
                let result = response.data;
                console.log('Offer has been made');
                callback();
            })
            .catch(function(error) {
                console.log('There was an error with the axios request; Error:');
                if (error.response) {
                    console.log('Error falls out of range 2xx');
                    console.log(error.response.data);
                    console.log(error.response.status);
                } else {
                    console.log('General error');
                    console.log(error);
                }
            });
        } else {
            callback();
        }
    }
});

// ANCHOR Accepting multiple offers
app.get('/accept_multiple_offers', (req, res) => {

    asyncLoop().then(() => {
        console.log('ACCEPTING MULTIPLE OFFERS PROCRESS FINISHED');
        res.redirect('/');
    });

    async function asyncLoop() {
        let jsonObj;
        fs.readFile('guest_accounts.json', 'utf8', async (err, data) => {
            if (err) {
                console.log(err);
            } else {
                jsonObj = JSON.parse(data);

                console.log('Accepting multiple offers');
                console.log('------------------------------------');
                console.log(' ');
    
                for (let i = 0; i < jsonObj.accounts.length; i++) {
                    console.log('Guest account number: ' + i);
                    await new Promise(next => {
                        guestCheckOffers(jsonObj.accounts[i], function(){
                            next();
                        });
                    });
                }
            }
        });
    }

    async function guestCheckOffers(currentGuestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/estateagent/offers`,
            method: 'GET',
            headers: {
                "x-fs-token": `${currentGuestDetails.token}`,
                "x-user-id": `${currentGuestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            if (result.response && result.response.length) {
                let offerDetails = {};
                offerDetails.buyer = result.response[0].buyerId;
                offerDetails.venueId = result.response[0].venueId;
                console.log('Offer available');
                guestAcceptOffer(currentGuestDetails, offerDetails, function() {
                    callback();
                });
            } else {
                console.log('No offers have been made for this account');
                callback();
            }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function guestAcceptOffer(currentGuestDetails, offerDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/estateagent/accept`,
            method: 'POST',
            headers: {
                "x-fs-token": `${currentGuestDetails.token}`,
                "x-user-id": `${currentGuestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: offerDetails
        })
        .then(function(response) {
            let result = response.data;
            console.log('Offer has been accepted');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }
});

// ANCHOR Searching for high value land tiles
app.get('/searching_high_value_tiles', (req, res) => {
    let lat = 50.373770;
    let lon = -4.143118;
    let requestData = {
        "lat": lat,
        "lon": lon,
        "player_id": "5d051234cbff2700016df755",
        "player_lat": lat,
        "player_lon": lon,
        "span": 50
    }
    axios({
        url: `https://api.wearerealitygames.com/bl/api/v1.0/get_tiles`,
        method: 'POST',
        headers: {
            "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
            "x-user-id": `5d051234cbff2700016df755`,
            "x-app-version-code": "141",
            "x-app-version": "2.8.1",
            "x-app-platform": "Android",
            "x-app-id": "com.landlordgame.tycoon",
            "x-app-flavor": "prod",
            "Content-Type": "application/json",
            "User-Agent": "Android",
            "Accept-Encoding": "gzip"
        },
        data: requestData
    })
    .then(function(response) {
        let result = response.data;
        let highestValueTile = {
            "landuse": ' ',
            "lat": 0,
            "light": 0,
            "lon": 0,
            "price_coins": 50,
            "price": 0
        }
        if (result.result.tiles.length) {
            for (let i = 0; i < result.result.tiles.length; i++) {
                console.log('Tile number: ' + (i+1));
                if (result.result.tiles[i].price_coins > highestValueTile.price_coins) {
                    highestValueTile.landuse = result.result.tiles[i].landuse
                    highestValueTile.lat = result.result.tiles[i].lat
                    highestValueTile.light = result.result.tiles[i].light
                    highestValueTile.lon = result.result.tiles[i].lon
                    highestValueTile.price_coins = result.result.tiles[i].price_coins
                    highestValueTile.price = result.result.tiles[i].price
                    console.log('New highest value tile: ' + highestValueTile.price_coins);
                }
            }
            console.log('Highest value tile: ');
            console.log(highestValueTile);
            res.redirect('/welcome');
        } else {
            console.log('There was an error:');
            console.log(result);
            res.redirect('/welcome');
        }
    })
    .catch(function(error) {
        console.log('There was an error with the axios request; Error:');
        if (error.response) {
            console.log('Error falls out of range 2xx');
            console.log(error.response.data);
            console.log(error.response.status);
        } else {
            console.log('General error');
            console.log(error);
        }
    });
});

// ANCHOR Transfering guest accounts cash
app.get('/transfer_cash', (req, res) => {

    asyncLoop().then(() => {
        console.log('TRANSFERRING GUEST ACCOUNTS CASH HAS FINISHED');
        res.redirect('/');
    });

    async function asyncLoop() {
        let jsonObj;
        fs.readFile('guest_accounts.json', 'utf8', async (err, data) => {
            if (err) {
                console.log(err);
            } else {
                jsonObj = JSON.parse(data);
                console.log('Transferring guest accounts cash has started');
                console.log('------------------------------------');
                console.log(' ');
    
                for (let i = 0; i < jsonObj.accounts.length; i++) {
                    console.log('Guest account number: ' + i);
                    await new Promise(next => {
                        guestCheck(jsonObj.accounts[i], function(){
                            next();
                        });
                    });
                }
            }
        });
        
    }

    async function guestCheck(currentGuestDetails, callback) {
        axios({
            url: `https://api.wearerealitygames.com/landlord/players/self`,
            method: 'get',
            headers: {
                "x-fs-token": `${currentGuestDetails.token}`,
                "x-user-id": `${currentGuestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }
        })
        .then(function(response) {
            let result = response.data;
            if (result.response.statement.cash > 20000000) {
                if (result.response.statement.coins > 1) {
                    // console.log(result);
                    let currentGuestCash = result.response.statement.cash;
                    console.log('Cash amount: ' + currentGuestCash);
                    let currentGuestCashE = currentGuestCash.toExponential().replace('e', 'E').replace('+', '');
                    guestMakeOffer(currentGuestDetails, currentGuestCashE, function() {
                        bankAccountCheckOffers(currentGuestDetails, function(offerDetails) {
                            bankAccountAcceptOffers(currentGuestDetails, offerDetails, function() {
                                guestSellTile(currentGuestDetails, function() {
                                    bankAccountBuyTile(function() {
                                        callback();
                                    });
                                });
                            });
                        });
                    });
                } else {
                    console.log('Guest account has 0 coins');
                    callback();
                }
            } else {
                console.log('Guest account has not got enough cash');
                callback();
            }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function guestMakeOffer(currentGuestDetails, currentGuestCashE, callback) {
        let requestData = {
            "action":"place",
            "col":195205,
            "offer_price":currentGuestCashE,
            "player_id":`${currentGuestDetails.id}`,
            "player_lat":50.57698,
            "player_lon":-4.5999033,
            "row":265776
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offer_action`,
            method: 'post',
            headers: {
                "x-fs-token": `${currentGuestDetails.token}`,
                "x-user-id": `${currentGuestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: requestData
        })
        .then(function(response) {
            let result = response.data;
            console.log('Offer made?');
            console.log(result);
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function bankAccountCheckOffers(currentGuestDetails, callback) {
        let requestData = {
            "player_id":"5d051234cbff2700016df755"
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offers_received`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: requestData
        })
        .then(function(response) {
            let result = response.data;
                if (result.status == 'success') {
                    if (result.result && result.result.length) {
                        console.log('Offers received');
                        let offerDetails = {};
                        offerDetails.id = result.result[0].id;
                        callback(offerDetails);
                    } else {
                        console.log('No offers received');
                    }
                } else {
                    console.log('Checking offers received failed');
                }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function bankAccountAcceptOffers(currentGuestDetails, offerDetails, callback) {
        let requestData = {
            "action":"accept",
            "col":0,
            "counter_price":0,
            "offer_id":offerDetails.id,
            "row":0,
            "type":"offer"
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/offer_action`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            },
            data: requestData
        })
        .then(function(response) {
            let result = response.data;
            console.log('Offer accepted?');
            callback();
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });     
    }

    function guestSellTile(currentGuestDetails, callback) {
        let requestData = {
            "col":195205,
            "player_id":`${currentGuestDetails.id}`,
            "row":265776
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/sell`,
            method: 'post',
            headers: {
                "x-fs-token": `${currentGuestDetails.token}`,
                "x-user-id": `${currentGuestDetails.id}`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }, 
            data: requestData
        })
        .then(function(response) {
            let result = response.data;
            if (result.status == 'success') {
                console.log('Guest account sold tile successfully?');
                callback();
            } else {
                console.log('Guest account not sold Tile successfully?');
                console.log(result);
                console.log(currentGuestDetails);
            }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }

    function bankAccountBuyTile(callback) {
        let requestData = {
            "currency":"cash",
            "player_lat":50.57698,
            "player_lon":-4.5999033,
            "col":195205,
            "player_id":`5d051234cbff2700016df755`,
            "row":265776
        };
        axios({
            url: `https://api.wearerealitygames.com/bl/api/v1.0/buy`,
            method: 'post',
            headers: {
                "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
                "x-user-id": `5d051234cbff2700016df755`,
                "x-app-version-code": "141",
                "x-app-version": "2.8.1",
                "x-app-platform": "Android",
                "x-app-id": "com.landlordgame.tycoon",
                "x-app-flavor": "prod",
                "Content-Type": "application/json",
                "User-Agent": "Android",
                "Accept-Encoding": "gzip"
            }, 
            data: requestData
        })
        .then(function(response) {
            let result = response.data;
            if (result.status == 'success') {
                console.log('Bank account bought tile successfully?');
                callback();
            } else {
                console.log('Bank account not bought tile successfully?');
                console.log(result);
            }
        })
        .catch(function(error) {
            console.log('There was an error with the axios request; Error:');
            if (error.response) {
                console.log('Error falls out of range 2xx');
                console.log(error.response.data);
                console.log(error.response.status);
            } else {
                console.log('General error');
                console.log(error);
            }
        });
    }
});

// ANCHOR Testing Landlord Api
app.get('/testing_landlord_api', (req, res) => {
    let data = {
        "count": 300,   
        "left_lat": 51.098205670403814,
        "left_lon": -0.47448612749576563,
        "offset": 0,
        "player_id": "5d051234cbff2700016df755",
        "right_lat": 51.938327583101625,
        "right_lon": 0.32145503908395767
    }
    axios({
        url: `https://api.wearerealitygames.com/bl/api/v1.0/get_portfolio`,
        method: 'post',
        headers: {
            "x-fs-token": `YWRNFU4PJAZBAE33CKP1GVCPAIFER5GPN2VDENGNNA1ON3PV`,
            "x-app-version-code": "141",
            "x-app-version": "2.8.1",
            "x-app-platform": "Android",
            "x-app-id": "com.landlordgame.tycoon",
            "x-app-flavor": "prod",
            "Content-Type": "application/json",
            "User-Agent": "Android",
            "Accept-Encoding": "gzip"
        },
        data: data
    })
    .then(function(response) {
        let result = response.data;
        console.log(result);
    })
    .catch(function(error) {
        console.log('There was an error with the axios request with selling the cash crossover property; Error:');
        if (error.response) {
            console.log('Error falls out of range 2xx');
            console.log(error.response.data);
            console.log(error.response.status);
        } else {
            console.log('General error');
            console.log(error);
        }
    });
});

function tryParseJSON (jsonString){
    try {
        var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object", 
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }

    return false;
};