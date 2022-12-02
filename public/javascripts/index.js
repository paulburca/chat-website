var text = document.getElementById("send_text");
var messages = document.getElementById("messages");
var connections_container = document.getElementById("connections");
const isValidUrl = urlString => {
    var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
  '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
return !!urlPattern.test(urlString);
}
var urlRE= new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?([^ ])+", "g");

var audio = new Audio('../audio/bell.wav');
text.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("send_btn").click();
    }
});
document.addEventListener("keyup", function (event) {
    if (event.key === " ") {
        event.preventDefault();
        document.getElementById("match_btn").click();
    }
});
var server = new WebSocket("ws://" + location.host + "/wss");

document.querySelector("#send_btn").disabled = true;
document.querySelector("#send_text").disabled = true;
document.querySelector("#disconnect_btn").disabled = true;

var tagsToReplace = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
};
function replaceTag(tag) {
    return tagsToReplace[tag] || tag;
}
function safe_tags_replace(str) {
    return str.replace(/[&<>]/g, replaceTag);
}
server.onmessage = (message) => {
    let parsed_msg = JSON.parse(message.data);
    if (parsed_msg.connected == true) {
        document.querySelector("#send_btn").disabled = false;
        document.querySelector("#send_text").disabled = false;
        document.querySelector("#disconnect_btn").disabled = false;
        messages.innerHTML = "";
        messages.insertAdjacentHTML(
            "beforeend",
            "<p> You connected with <b>" +
                safe_tags_replace(parsed_msg.match) +
                "</b></p>"
        );
        audio.play();
        return;
    }
    if (parsed_msg.connected == false) {
        document.querySelector("#send_btn").disabled = true;
        document.querySelector("#send_text").disabled = true;
        document.querySelector("#match_btn").disabled = false;
        document.querySelector("#disconnect_btn").disabled = true;
        messages.insertAdjacentHTML(
            "beforeend",
            "<p> You disconnected from <b>" +
                safe_tags_replace(parsed_msg.match) +
                "</b</p>"
        );
        return;
    }
    if (parsed_msg.message) {
        messages.insertAdjacentHTML(
            "beforeend",
            "<p><b>" +
                safe_tags_replace(parsed_msg.name) +
                "</b> : " +
                safe_tags_replace(parsed_msg.message).replaceAll(urlRE, `<a onclick="window.open ('\$&', ''); return false" href="javascript:void(0);">\$&</a>`) +
                "</p>"
        );
        messages.scrollTo(0, messages.scrollHeight);
    }
    if (parsed_msg.connections) {
        connections_container.innerHTML =
            "<p>connections: <b>" + parsed_msg.connections + "</b></p>";
    }
};

function parseJwt(token) {
    if (!token) {
        return;
    }
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace("-", "+").replace("_", "/");
    console.log(token);
    console.log(window.atob(base64));
    return JSON.parse(window.atob(base64));
}
const parseCookie = (str) =>
    str
        .split(";")
        .map((v) => v.split("="))
        .reduce((acc, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(
                v[1].trim()
            );
            return acc;
        }, {});

var cookie;
var jwt = parseJwt(parseCookie(document.cookie)["auth"]);
server.onopen = () => {
    server.send(
        JSON.stringify({
            name: jwt.name,
            gender: jwt.gender,
            gender_preference: jwt.gender_preference
        })
    );
};

function send() {
    if (text.value.trim() == "") return;
    document.querySelector("#send_btn").disabled = true;
    setTimeout(() => {
        document.querySelector("#send_btn").disabled = false;
    }, 1000);
    server.send(JSON.stringify({ name: jwt.name, message: text.value }));
    text.value = "";
}

function match() {
    server.send(JSON.stringify({ name: jwt.name, match: true }));
    document.querySelector("#match_btn").disabled = true;
    messages.innerHTML = "";
    messages.insertAdjacentHTML("beforeend", "<p>Matching......</p>");
}

function disconnect() {
    server.send(JSON.stringify({ name: jwt.name, disconnect: true }));
    document.querySelector("#disconnect_btn").disabled = true;
}
function deleteCookies() {
    document.cookie.split(";").forEach(function (c) {
        document.cookie = c
            .replace(/^ +/, "")
            .replace(
                /=.*/,
                "=;expires=" + new Date().toUTCString() + ";path=/"
            );
    });
}

function logout(reload = true) {
    deleteCookies();
    if (reload) {
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.href);
        }
        location.reload();
    }
}

// window.addEventListener("beforeunload", function (e) {
//     var confirmationMessage = "\o/";
//     logout(false);
//     (e || window.event).returnValue = confirmationMessage; //Gecko + IE
//     return confirmationMessage;                            //Webkit, Safari, Chrome
//   });
