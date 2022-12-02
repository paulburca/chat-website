var express = require("express");
var jose = require("jose");
var router = express.Router();
const secret = jose.base64url.decode(
    "zH4NRP1HMALxxCFnRZABFA7GOJtzU_gIj02alfL1lvI"
);

/* GET home page. */
async function cookieCheck(req, res) {
    const jwt = req.cookies["auth"];
    if (jwt) {
        const { payload, protectedHeader } = await jose.jwtVerify(jwt, secret);
        console.log(payload);
        return { verdict: true, name: payload["name"] };
    }
    return { verdict: false, name: null };
}

router.get("/", async function (req, res) {
    const { verdict, name } = await cookieCheck(req, res);
    if (verdict) {
        res.render("index", { title: "Chat", name: name });
    } else {
        res.render("auth", { title: "Chat" });
    }
});

router.post("/", async function (req, res) {
    console.log(req.body);
    if (req.body.name.trim() == "") {
        console.log("sarmale");
        res.render("auth", { title: "Chat", name: name });
        return;
    }
    const jwt = await new jose.SignJWT({
        name: req.body.name,
        gender: req.body.gender,
        gender_preference: req.body.gender_preference,
    })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);
    var name = req.body.name;
    res.cookie("auth", jwt);
    res.render("index", { title: "Chat", name: name });
});
module.exports = router;
