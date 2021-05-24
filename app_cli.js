var axios = require('axios');
var readline = require('readline-sync');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs')
var path = require("path");

var SEARCH_BY_PIN = false;
var PIN_CODES = ["560076", "560078", "560011", "560066", "560037", "560030", "560020", "560003", "560017", "560084"];
var DATES = ["25-05-2021"];
var APPOINTMENT_FOUND = false;
var APPOINTMENT_BOOKED = false;
var API_DELAY_IN_MS = 10000;
var PROC_DELAY_IN_MS = 1000;
var BENEFICIARY = null;
var ABOVE_45_ONLY = false;
// var ABOVE_18_ONLY = true;

var TEMP_SVG_PATH = './test.svg'

function startNodeApp(token) {
    return new Promise(async function (resolve, reject) {
        try {
            var centerFound = false;
            BENEFICIARY = await getBeneficiaries(token);
            if(BENEFICIARY['dose1_date'] == "" && BENEFICIARY['dose2_date'] == "" ){
                BENEFICIARY['TM_TYPE'] = 0;
            } else if(BENEFICIARY['dose2_date'] == ""){
                BENEFICIARY['TM_TYPE'] = 1;
            } else {
                return reject("Beneficiary already has 2 doses.");
            }
            var age = parseInt(new Date().getFullYear()) - parseInt(BENEFICIARY['birth_year']);
            BENEFICIARY['TM_AGE'] = age;
            console.log("BENEFICIARY selected needs dose ", (BENEFICIARY['TM_TYPE'] + 1), "AGE: ", age)
            // console.log("IS CENTER AND SLOT OKAY? (press sl number of slot for yes, n for no).")

            if (SEARCH_BY_PIN) {
                for (var i = 0; i < PIN_CODES.length; i++) {
                    var pin = PIN_CODES[i];
                    for (var j = 0; j < DATES.length; j++) {
                        var date = DATES[j];
                        var calPromise = getCalendar(token, SEARCH_BY_PIN, pin, date)
                        calPromise.then(getAvailableCenter.bind(null, SEARCH_BY_PIN, pin, date, BENEFICIARY, token));
                        await sleep(API_DELAY_IN_MS);
                        // allAppointments.push(calPromise);
                    }
                }
            } else {
                for (var j = 0; j < DATES.length; j++) {
                    var date = DATES[j];
                    var calPromise = getCalendar(token, SEARCH_BY_PIN, null, date)
                    calPromise.then(getAvailableCenter.bind(null, SEARCH_BY_PIN, null, date, BENEFICIARY, token));
                    await sleep(API_DELAY_IN_MS);
                    // allAppointments.push(calPromise);
                }
            }


            // var allResults = await Promise.all(allAppointments);
            return resolve(true);
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
            for (var i = 0; i < beneficiaries.length; i++) {
                var temp = beneficiaries[i];
                console.log("-----------------")
                console.log(i + ". " + temp['name']);
                console.log("-----------------")
            }
            var index = readline.question(`Enter serial number:`)
            if (index in beneficiaries) {
                return resolve(beneficiaries[index]);
            }
            return reject("Wrong beneficiary serial number.");
        } catch (err) {
            return reject(err);
        }
    });
}

function getCalendar(token, byPin, pin, date) {
    return new Promise(async function (resolve, reject) {
        try {
            // var todayFormatted = getToday();
            var getCalendarUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin?pincode=' + pin + '&date=' + date
            if (!byPin) {
                getCalendarUrl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=294&date=' + date
            }
            var data = await makeApiCall("GET", getCalendarUrl, null, token)
            return resolve(data);
        } catch (err) {
            return reject(err);
        }
    })
}

function getAvailableCenter(byPin, pin, date, beneficiary, token, allAppointments) {
    return new Promise(async function (resolve, reject) {
        try {
            var centers = allAppointments['centers'];
            var slot = null;
            for (var j=0;j< centers.length; j++) {
                var center = centers[j];
                var sessions = center['sessions'];
                for (var k=0;k< sessions.length; k++) {
                    var session = sessions[k];
                    // console.log("AVAIL", {a: DATES.indexOf(session['date']) != -1, b: session['available_capacity'] > 0})
                    var capacity = session['available_capacity_dose1'];
                    if(beneficiary['TM_TYPE']){
                        capacity = session['available_capacity_dose2'];
                    }
                    console.log("MIN AGE: ",session['min_age_limit'],"AVAIL: ",capacity, beneficiary['TM_TYPE']);
                    
                    if ( capacity> 0
                    // && DATES.indexOf(session['date']) != -1
                    ) {
                        
                        if(BENEFICIARY['TM_AGE'] < session['min_age_limit']){
                            continue;
                        }
                        // if(ABOVE_18_ONLY && session['min_age_limit'] > 44){
                        //     continue;
                        // }
                        console.log("-----------------")
                        console.log("MIN AGE",session['min_age_limit']);
                        console.log("AVAIL",capacity);
                        // while (APPOINTMENT_FOUND) {
                        //     await sleep(PROC_DELAY_IN_MS);
                        // }
                        // APPOINTMENT_FOUND = true;
                        console.log("Center name",center['name']);
                        console.log("Center address",center['address']);
                        console.log("fee_type",center['fee_type']);
                        console.log("date",session['date']);
                        console.log("vaccine",session['vaccine']);
                        for(var i =0;i<session['slots'].length;i++){
                            console.log(i + ". Slot: " + session['slots'][i]);
                        }
                        console.log("-----------------")
                        // var index = readline.question(`Enter the captcha:`)

                        // if(index == -1 || !(index in session['slots'])){
                            //     APPOINTMENT_FOUND = false;
                            // } else {
                                //     slot = session['slots'][index];
                                
                                await getCaptcha(center, session, beneficiary, slot, token);
                                var captcha = readline.question(`Enter the captcha:`)
                                await bookAppointment(center, session, beneficiary, slot, token, captcha);
                        // }
                    }
                }
            }
            return resolve(true);
        } catch (err) {
            return reject(err);
        }

    })
}

async function writeCaptchaToFile(data){
    try {
        fs.writeFileSync(TEMP_SVG_PATH, data['captcha'])
      } catch (err) {
        console.error(err)
      }
}

function getCaptcha(center, session, beneficiary, slot, token) {
    return new Promise(async function (resolve, reject) {
        try {
            var scheduleUrl = 'https://cdn-api.co-vin.in/api/v2/auth/getRecaptcha';
            var params = {}
            console.log("HAVE TO CAPTCHA ", {scheduleUrl, token})
            var data = await makeApiCall("POST", scheduleUrl, params, token)
            console.log("CAPTCHA ", data)
            APPOINTMENT_FOUND = false;
            var absPath = path.resolve(TEMP_SVG_PATH);
            await writeCaptchaToFile(data);
            chromeLauncher.launch({
                startingUrl: absPath
            }).then(chrome => {
                console.log(`Chrome debugging port running on ${chrome.port}`);
                return resolve(true);
            });
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
            if(beneficiary["vaccination_status"] == "Partially Vaccinated"){
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
            console.log("HAVE TO BOOK ", {scheduleUrl, ...params, token})
            https://cdn-api.co-vin.in/api/v2/auth/getRecaptcha
            var data = await makeApiCall("POST", scheduleUrl, params, token)
            console.log("BOOKED ", data)
            APPOINTMENT_FOUND = false;
            return resolve(true);
        } catch (err) {
            console.log(err);
            APPOINTMENT_FOUND = false;
            return reject(err);
        }

    })
}

function getToday() {
    var now = new Date()
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
                headers: {
                    'origin': 'https://selfregistration.cowin.gov.in',
                    'referer': 'https://selfregistration.cowin.gov.in/',
                    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'sec-gpc': '1',
                    'dnt': '1',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
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



var TOKEN = readline.question(`Enter bearer token:`)
if (TOKEN == "") {
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJmNzNkNjAxNC1hYTllLTQxNjItOGJlNS0yYzIwMjE5OTRmYzEiLCJ1c2VyX2lkIjoiZjczZDYwMTQtYWE5ZS00MTYyLThiZTUtMmMyMDIxOTk0ZmMxIiwidXNlcl90eXBlIjoiQkVORUZJQ0lBUlkiLCJtb2JpbGVfbnVtYmVyIjo5OTQ1NTMyMjA4LCJiZW5lZmljaWFyeV9yZWZlcmVuY2VfaWQiOjU4OTIzMDYwMDQ5NTYwLCJzZWNyZXRfa2V5IjoiYjVjYWIxNjctNzk3Ny00ZGYxLTgwMjctYTYzYWExNDRmMDRlIiwidWEiOiJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvOTAuMC40NDMwLjIxMiBTYWZhcmkvNTM3LjM2LzhtcUFvR3VMLTE5IiwiZGF0ZV9tb2RpZmllZCI6IjIwMjEtMDUtMjNUMDk6NTY6MzQuMTkxWiIsImlhdCI6MTYyMTc2Mzc5NCwiZXhwIjoxNjIxNzY0Njk0fQ.VV9AWqbADzLueiFxXI8PsrnnqmztEy_Kv2t4FKtQU1s";
}
console.log("TOKENNNN", TOKEN)
startNodeApp(TOKEN)
    .then(function (result) {
        console.log("NODE COMPLETED", result);
        process.exit(0);
    })
    .catch(function (error) {
        console.log(error);
    });
