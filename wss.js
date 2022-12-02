const ws = require("ws");
const { use } = require("./routes");

var users = new Array();

function removeFromArray(obj, array){
    var index = array.indexOf(obj);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

async function matchingWatch(){
    if(users.length >= 2)
        match(users[0]);
}

function match(conn){
    users = removeFromArray(conn, users);
    console.log(users.length);
    let matching_users = users.filter(user => user.gender == conn.gender_preference && user.gender_preference == conn.gender);
    console.log(matching_users.length);
    if(matching_users.length == 0)
        return;
    let match = matching_users[0];
    users = removeFromArray(match, users);
    conn.match = match;
    match.match = conn;
    conn.send(JSON.stringify({connected: true, match: match.name}));
    match.send(JSON.stringify({connected: true, match: conn.name}))
    console.log(`match: ${conn.name} + ${conn.match.name} `);
}

function disconnect(conn){
    let match;
    if(conn.match){
        match = conn.match.name;
        conn.match.send(JSON.stringify({connected: false, match: conn.name}));
        conn.match.match = undefined;
    }
    else{
        users = removeFromArray(conn, users);
    }
    conn.send(JSON.stringify({connected: false, match: match}));
    conn.match = undefined;
}

function createWSS(web_server) {
    var connections = 0;
    const wss = new ws.Server({ server: web_server, path: "/wss" });
    setInterval(matchingWatch, 1000);
    wss.on("connection", (conn) => {
        conn.authenticated = false;
        conn.on("message", (message) => {
            var parsed_msg = JSON.parse(message);
            if (!conn.authenticated) {
                try {
                    if (parsed_msg.name) {
                        conn.authenticated = true;
                        conn.name = parsed_msg.name;
                        conn.gender = parsed_msg.gender;
                        conn.gender_preference = parsed_msg.gender_preference;
                        return;
                    }
                    conn.send(JSON.stringify({ error: "invalid credentials" }));
                } catch (error) {
                    conn.send(JSON.stringify({ error: "invalid format" }));
                }
                return;
            }

            if(parsed_msg.match){
                users.push(conn);
                // match(conn);
                return;
            }

            if(parsed_msg.disconnect){
                disconnect(conn);
                return;
            }
            console.log("message: %s", message);
            conn.send(
                        JSON.stringify({
                            name:`${conn.name} (me)`,
                            message: `${parsed_msg.message}`,
                        })
                    );
            conn.match.send(
                JSON.stringify({
                    name:`${conn.name}`,
                    message: `${parsed_msg.message}`,
                })
                );
        });

        conn.on("close", () => {
            connections--;
            wss.clients.forEach((el) => {
                el.send(JSON.stringify({ connections }));
            });
            disconnect(conn);
            console.log(users);
        });

        console.log("got connection");
        console.log(users);
        connections++;
        wss.clients.forEach((el) => {
            el.send(JSON.stringify({ connections }));
        });
    });
    wss.on("error", (err) => {
        console.log("a crapat in plm \n" + err);
    });
    return wss;
}
module.exports = createWSS;
