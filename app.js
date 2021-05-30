var axios = require('axios');
const chromeLauncher = require('chrome-launcher');
const express = require('express');

const app = express()
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ extended: true }));
var APP_PORT = 0

var SEARCH_BY_PIN = false;
var PIN_CODES = ["560076", "560078", "560011", "560066", "560037", "560030", "560020", "560003", "560017", "560084"];
var DATES = ["25-05-2021"];
var APPOINTMENT_FOUND = false;
var APPOINTMENT_BOOKED = false;
var API_DELAY_IN_MS = 10000;
var PROC_DELAY_IN_MS = 1000;
var ABOVE_45_ONLY = false;
// var ABOVE_18_ONLY = true;

var TEMP_SVG_PATH = './public/captcha.svg'
var LAUNCHED_BROWSER = null;

function startNodeApp(bookingDate, selectedDistrict, selectedState, beneficiary, token, captcha) {
    return new Promise(async function (resolve, reject) {
        try {
            // beneficiary = await getBeneficiaries(token);
            var vaccineTypeSpecified = false;
            var vaccineType = null;
            if (beneficiary['dose1_date'] == "" && beneficiary['dose2_date'] == "") {
                beneficiary['TM_TYPE'] = 0;
            } else if (beneficiary['dose2_date'] == "") {
                beneficiary['TM_TYPE'] = 1;
                vaccineTypeSpecified = true;
                vaccineType = beneficiary['vaccine']
            } else {
                return reject("Beneficiary already has 2 doses.");
            }
            var age = parseInt(new Date().getFullYear()) - parseInt(beneficiary['birth_year']);
            beneficiary['TM_AGE'] = age;
            console.log("beneficiary selected needs dose ", (beneficiary['TM_TYPE'] + 1), "AGE: ", age, "Type: ", vaccineTypeSpecified, vaccineType)
            // console.log("IS CENTER AND SLOT OKAY? (press sl number of slot for yes, n for no).")
            var datesAll = [];
            if (bookingDate == "thisWeek") {
                datesAll.push(getToday(false))
            } else {
                datesAll.push(getToday(true))
            }
            console.log("DATESSS ", datesAll)

            for (var j = 0; j < datesAll.length; j++) {
                var date = datesAll[j];
                var allAppointments = await getCalendar(token, SEARCH_BY_PIN, null, date, vaccineTypeSpecified, vaccineType)
                console.log("110", )
                var resp = await getAvailableCenter(SEARCH_BY_PIN, null, date, beneficiary, token, allAppointments, captcha);
                if(resp) return resolve(resp);
                // await sleep(API_DELAY_IN_MS);
                // allAppointments.push(calPromise);
            }


            // var allResults = await Promise.all(allAppointments);
            return resolve(false);
        } catch (err) {
            return reject(err);
        }
    })
}

function getBeneficiaries(token) {
    return new Promise(async function (resolve, reject) {
        try {
            var getBeneficiariesUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/beneficiaries';
            var data = await makeApiCall("GET", getBeneficiariesUrl, null, token)
            var beneficiaries = data['beneficiaries'];
            console.log("Pick a beneficiary. Enter the serial number (0, 1, 2).");
            // for (var i = 0; i < beneficiaries.length; i++) {
            //     var temp = beneficiaries[i];
            //     console.log("-----------------")
            //     console.log(i + ". " + temp['name']);
            //     console.log("-----------------")
            // }
            return resolve(beneficiaries);
        } catch (err) {
            return reject(err);
        }
    });
}

function getCalendar(token, byPin, pin, date, vaccineTypeSpecified, vaccineType) {
    return new Promise(async function (resolve, reject) {
        try {
            // var todayFormatted = getToday();
            var getCalendarUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin?pincode=' + pin + '&date=' + date
            if (!byPin) {
                getCalendarUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=294&date=' + date
            }

            if (vaccineTypeSpecified) {
                getCalendarUrl = getCalendarUrl + "&vaccine=" + vaccineType
            }
            console.log("getCalendarUrlgetCalendarUrlgetCalendarUrl", getCalendarUrl);
            var data = await makeApiCall("GET", getCalendarUrl, null, token)
            console.log("getCalendarUrlgetCalendarUrldatadata");
            return resolve(data);
        } catch (err) {
            return reject(err);
        }
    })
}

function getAvailableCenter(byPin, pin, date, beneficiary, token, allAppointments, captcha) {
    return new Promise(async function (resolve, reject) {
        try {
            var centers = allAppointments['centers'];
            var slot = null;
            console.log("Lookie 1", centers.length)

            for (var j = 0; j < centers.length; j++) {
                var center = centers[j];
                var sessions = center['sessions'];
                for (var k = 0; k < sessions.length; k++) {
                    var session = sessions[k];
                    // console.log("AVAIL", {a: DATES.indexOf(session['date']) != -1, b: session['available_capacity'] > 0})
                    var capacity = session['available_capacity_dose1'];
                    if (beneficiary['TM_TYPE']) {
                        capacity = session['available_capacity_dose2'];
                    }
                    console.log("MIN AGE: ", session['min_age_limit'], "AVAIL: ", capacity, beneficiary['TM_TYPE']);

                    if (capacity > 0
                        // && DATES.indexOf(session['date']) != -1
                    ) {

                        if (beneficiary['TM_AGE'] < session['min_age_limit']) {
                            continue;
                        }

                        console.log("Lookie 1")


                        var res = await bookAppointment(center, session, beneficiary, slot, token, captcha);
                        return resolve(res);
                    }
                }
            }
            console.log("NO APPTS FOUND")
            return resolve(false);
        } catch (err) {
            return reject(err);
        }

    })
}

function getCaptcha(token) {
    return new Promise(async function (resolve, reject) {
        try {
            var scheduleUrl = 'https://cdn-api.co-vin.in/api/v2/auth/getRecaptcha';
            var params = {}
            console.log("HAVE TO CAPTCHA ", { scheduleUrl, token })
            var data = await makeApiCall("POST", scheduleUrl, params, token)
            console.log("CAPTCHA ", data)
            return resolve(data);
            // APPOINTMENT_FOUND = false;
            // var absPath = path.resolve(TEMP_SVG_PATH);
            // await writeCaptchaToFile(data);
            // chromeLauncher.launch({
            //     startingUrl: absPath
            // }).then(chrome => {
            //     console.log(`Chrome debugging port running on ${chrome.port}`);
            //     return resolve(true);
            // });
        } catch (err) {
            console.log(err);
            APPOINTMENT_FOUND = false;
            return reject(err);
        }

    })
}

function bookAppointment(center, session, beneficiary, slot, token, captcha) {
    return new Promise(async function (resolve, reject) {
        try {

            var scheduleUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/schedule';
            var dose = 1;
            if (beneficiary["vaccination_status"] == "Partially Vaccinated") {
                dose = 2;
            }
            var params = {
                "center_id": center['center_id'],
                "session_id": session['session_id'],
                "beneficiaries": [
                    beneficiary['beneficiary_reference_id']
                ],
                "slot": slot,
                "dose": dose,
                captcha
            }
            console.log("HAVE TO BOOK ", { scheduleUrl, ...params, token })
            // https://cdn-api.co-vin.in/api/v2/auth/getRecaptcha
            var data = await makeApiCall("POST", scheduleUrl, params, token)
            console.log("BOOKED ", data)
            APPOINTMENT_FOUND = false;
            return resolve(data);
        } catch (err) {
            console.log(err);
            APPOINTMENT_FOUND = false;
            return reject(err);
        }

    })
}

function getToday(nextWeek) {
    var now = new Date()
    if (nextWeek) {
        now.setDate(now.getDate() + 7);
    }
    var dateStr = ('0' + now.getDate()).slice(-2) + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + now.getFullYear();
    console.log("Searching for date - ", dateStr)
    return dateStr;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


function makeApiCall(method, url, params, token) {
    return new Promise(async function (resolve, reject) {
        try {
            var config = {
                method: method,
                withCredentials: true,
                headers: {
                    "authority": 'cdn-api.co-vin.in',
                    "method": 'GET',
                    "path": '/api/v2/appointment/sessions/calendarByDistrict?district_id=270&date=23-06-2021&vaccine=COVISHIELD',
                    "scheme": 'https',
                    "accept": 'application/json, text/plain, */*',
                    "accept-encoding": 'gzip, deflate, br',
                    "accept-language": 'en-US,en;q=0.9',
                    "dnt": '1',
                    "if-none-match": 'W/"6951-IQLTGenCdbaESJhEAouP4caqBIc"',
                    "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                    "sec-ch-ua-mobile": '?0',
                    "sec-fetch-dest": 'empty',
                    "sec-fetch-mode": 'cors',
                    "sec-fetch-site": 'cross-site',
                    "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
                    'origin': 'https://selfregistration.cowin.gov.in',
                    'referer': 'https://selfregistration.cowin.gov.in/',
                    // 'sec-gpc': '1',
                    // 'dnt': '1',
                    'Authorization': 'Bearer ' + token
                }
            };
            if (method == "POST") {
                config['data'] = params;
            }
            if (method == "GET") {
                var paramStr = new URLSearchParams(params).toString();
                url = url + "?" + paramStr;
            }
            config['url'] = url;

            axios(config).then(function (response) {
                var statusCode = response.status;
                var data = response.data;
                console.log("AXIS", statusCode)
                if (statusCode < 199 || statusCode > 299) {
                    console.log("ERR")
                    return reject({ data, statusCode });
                }
                return resolve(data);
            }).catch(function (error) {
                var statusCode = 0;
                var data = "UNKNOWN ERROR";
                if (error.response) {
                    var response = error.response;
                    statusCode = response.status;
                    data = response.data;
                    if (statusCode == 401) {
                        console.log("Bearer token illegal or expired.");
                        process.exit(1);
                    }
                } else if (error.request) {
                    data = error.request;
                } else {
                    console.log('Unknown Error', error.message);
                    data = error.message;
                }
                return reject({ data, statusCode });
            });
        } catch (err) {
            return reject(err);
        }
    })
}

app.post('/getBenefeciaries', async function (req, res) {
    var body = req.body;
    console.log("getBenefeciaries", body)

    if (!body.hasOwnProperty("token") || body["token"] == '') {
        return res.status(400).json({ error: 'Illegal param "token"' })
    }

    var { token } = body;
    var bene = await getBeneficiaries(token);
    var captcha = await getCaptcha(token);
    return res.json({beneficiaries: bene, ...captcha});
});

app.post('/makeBooking', async function (req, res) {
    var body = req.body;
    console.log("BOOKING", body)

    if (!body.hasOwnProperty("bookingDate") || body["bookingDate"] == '') {
        return res.status(400).json({ error: 'Illegal param "bookingDate"' })
    }
    if (!body.hasOwnProperty("selectedDistrict") || body["selectedDistrict"] == '') {
        return res.status(400).json({ error: 'Illegal param "selectedDistrict"' })
    }
    if (!body.hasOwnProperty("selectedState") || body["selectedState"] == '') {
        return res.status(400).json({ error: 'Illegal param "selectedState"' })
    }
    if (!body.hasOwnProperty("beneficiary") || body["beneficiary"] == '') {
        return res.status(400).json({ error: 'Illegal param "beneficiary"' })
    }
    if (!body.hasOwnProperty("captcha") || body["captcha"] == '') {
        return res.status(400).json({ error: 'Illegal param "captcha"' })
    }
    var { bookingDate, selectedDistrict, selectedState, beneficiary, token, captcha } = body;
    var resp;
    try{
        resp = await startNodeApp(bookingDate, selectedDistrict, selectedState, beneficiary, token, captcha);
    }catch(err){
        console.log("BOOKING ERROR ", err)
        return res.status(500).json({error: err});
    }
    if(resp == false){
        return res.json({message: "No slots found, try again later."});
    } else {
        return res.json({message: "Booked successfuly.", ...resp});
    }
})

app.use(express.static(__dirname + '/public'));

const server = app.listen(880, () => {
    APP_PORT = server.address().port;
    console.log(`Example app listening at http://localhost:${APP_PORT}`)
    // chromeLauncher.launch({
    //     startingUrl: "http://localhost:"+APP_PORT+"/index.html",
    //     // chromeFlags: ["--disable-web-security", "--disable-popup-blocking", "--allow-running-insecure-content"]
    // }).then(chrome => {
    //     LAUNCHED_BROWSER = chrome;
    //     // console.log(`Chrome debugging port running on ${chrome.port}`, chrome);
    // });
})

// var TOKEN = readline.question(`Enter bearer token:`)
// console.log("TOKENNNN", TOKEN)
// startNodeApp(TOKEN)
//     .then(function (result) {
//         console.log("NODE COMPLETED", result);
//         process.exit(0);
//     })
//     .catch(function (error) {
//         console.log(error);
//     });
