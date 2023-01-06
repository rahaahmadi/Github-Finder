// get elements
const usernameInput = document.querySelector('#usernameInput');
const submitButton = document.querySelector('.submit-button');
const form = document.querySelector("#form");

const userImage = document.querySelector('#profile_image');
const userName = document.querySelector('#name');
const userBlog = document.querySelector('#blog');
const userLocation = document.querySelector('#location');
const userFavLang = document.querySelector('#favoriteLang')
const userBio = document.querySelector('#bio');

const errorContainer = document.querySelector(".error-info");
const errorMsg = document.querySelector("#error-msg");

const fetchContainer= document.querySelector('.fetch-info')
const fetchMsg = document.querySelector("#fetch-msg")

// if submit button clicked an event handler will be called
form.addEventListener("submit", submitEventHandler);

// get users information
async function getUserInfo(username) {

    // this is an object which holds data, erros and, success responses.
    let responseObject = {
        data: {},
        success: true,
        errorMessage: "",
        isCached: false
    }

    //get data from local storage.
    let data = JSON.parse(localStorage.getItem(username));

    //return data if exists in local storage
    if (data) {
        console.log("Load from Local Storage");
        responseObject.isCached = true
        fetchMsg.textContent = "read from cache"
        return data;
    }
    
    // get data from API if it doesn't exist in local storage
    return await fetch("https://api.github.com/users/" + username).then(function (response) {
        fetchMsg.textContent = "new request"
        // error handling
        if (!response.ok) {

            if (response.status == 404)
                throw Error("User not found.")

            if (response.status == 403)
                throw Error("Forbidden")

            throw Error("Error in getting user info.")
        }
        return response.json()

    }).then(function (body) {
        // return user information object
        return getFavoriteLanguage(body["repos_url"]).then(fav_lang => {
            responseObject.data = body
            responseObject.data["favorite_language"] = fav_lang;
            localStorage.setItem(username, JSON.stringify(responseObject)); //save data in local storage
            return responseObject;
        });

    }).catch(function (error) {
        responseObject.success = false;
        responseObject.errorMessage = error.message;
        return responseObject;
    })
}

// this functions get 5 last pushed repository and their languages and return highest scored language as user's favorite
async function getFavoriteLanguage(repositories_url) {
    console.log(repositories_url)
    return fetch(repositories_url).then(responseHeader => {
        if (!responseHeader.ok)
            throw Error("Not Found!");
        return responseHeader.json();

    }).then(repos => {

        let numberOfCheckRepository = Math.min(repos.length, 5); // if repos count was less than 5

        //sort by pushed_at value.
        repos.sort((a, b) => {
            return new Date(b["pushed_at"]) - new Date(a["pushed_at"]);
        });


        let promises = [];
        repos.slice(0, numberOfCheckRepository).forEach(repo => {
            promises.push(getLanguages(repo["languages_url"]));
        });


        let top_languages = {};

        // when all promises resolved this block runs and calculate scores.
        return Promise.all(promises).then(values => {
            values.forEach(langs => {
                if (langs) {
                    Object.keys(langs).forEach(key => {
                        if (!top_languages[key])
                            top_languages[key] = 0;

                        top_languages[key] += langs[key];
                    });
                }
            });

            if (Object.keys(top_languages).length === 0)
                return null;

            //return language which has maximum score.
            return Object.keys(top_languages).reduce((fav, item) => top_languages[item] > top_languages[fav] ? item : fav);
        });

    }).catch(error => {
        return error.message;
    });
}

// this function gets language from API, in case of error this returns empty object.
async function getLanguages(languages_url) {

    return fetch(languages_url).then(headerInfos => {
        if (!headerInfos.ok) {
            throw Error("Error In getting languages");
        }
        return headerInfos.json();
    }).catch(_e => { });

}

function showDetail(data) {

    // make sure error container display is set to none
    errorContainer.style.display = 'none' 

    // extract info from json
    let name = data.name;
    let bio = data.bio;
    let location = data.location;
    let blog = data.blog;
    let avatar = data.avatar_url;
    let favLang = data.favorite_language;

    // set html elements values
    userName.textContent = name
    userImage.src = avatar
    userBio.textContent = bio
    userLocation.textContent = location
    userBlog.textContent = blog
    userFavLang.textContent = favLang
}

// when error occurred, change error container display to flex
function showError(message) {
    errorMsg.textContent = message
    errorContainer.style.display = 'flex' 
}

//this function fires if an event occurs by the submit button.
function submitEventHandler(event) {

    event.preventDefault();
    const username = usernameInput.value?.trim();
    if (!username) return;

    getUserInfo(username).then(responseObj => {
        if (responseObj.success) {
            showDetail(responseObj.data, responseObj.isCached);
        } 
        else {
            showError(responseObj.errorMessage);
        }
    });
}