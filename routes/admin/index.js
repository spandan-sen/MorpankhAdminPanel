const express = require("express")
const router = express.Router()
require("dotenv").config()
const {product_model,dash_model} = require("../../config/database")
const confirmation = require("./add")
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,                   // 5 attempts
  message: "Too many login attempts. Try again later."
});
router.get("/login",async (req,res)=>{
    if(req.session.admin){
        res.redirect("/admin")
    }
    else{
        res.render("admin/login")

    }
})
router.get("/logout",async (req,res)=>{
    if(req.session.admin){
        req.session.admin = null
        console.dir(`User Authentication State : False `)
        res.redirect("/admin/login")
    }
})
router.post("/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.USERNAME_1&&password === process.env.PASSWORD_1) {
        req.session.admin = username;
        req.session.loginType = "admin";
        req.session.adminDP = "https://res.cloudinary.com/dt5ceiwwh/image/upload/v1771655419/IMG-20251025-WA0013_ofr015.jpg"
        console.log(`Authentication Success: ${username}`);
         console.log(`Access Type: ADMIN`);
        return res.redirect("/admin");
    }else if(username === process.env.USERNAME_2&&password === process.env.PASSWORD_2){
        req.session.admin = username;
        req.session.loginType = "admin";
        req.session.adminDP = "https://res.cloudinary.com/dt5ceiwwh/image/upload/v1771654356/facebook_1765175603364_7403683093893339562_llluhq.jpg"
        console.log(`Authentication Success: ${username}`);
         console.log(`Access Type: ADMIN`);
        return res.redirect("/admin");
    }else if(username === process.env.secondary_1_USERNAME&&password === process.env.secondary_1_PASSWORD){
        req.session.admin = username;
        req.session.loginType = "secondary";
        req.session.adminDP = "https://res.cloudinary.com/dt5ceiwwh/image/upload/v1771654356/facebook_1765175603364_7403683093893339562_llluhq.jpg"
        console.log(`Authentication Success: ${username}`);
        console.log(`Access Type: Secondary`);
        return res.redirect("/admin");

    }
    console.log("Authentication Failed");
    return res.redirect("/admin/login");
});
function requireAdmin(req, res, next) {

  // Allow internal Puppeteer access
  if (req.query.internal === "true") {
    return next();
  }

  if (((req.session && req.session.admin))) {
    return next();
  }

  return res.redirect("/admin/login");
}
router.use(requireAdmin)
//Routers - 
router.use("/products/edit",require("./product_show"))
router.use("/products/add",require("./add"))
router.use("/audit",require("./audit"))
router.use("/products",require("./products"))
router.use("/messages",require("./messages"))
router.use("/users",require("./users"))
router.use("/orders",require("./orders"))
router.use("/bill",require("./bill"))
router.use("/checkout",require('./checkout'))
router.use("/products/delete",require("./delete"))
router.use("/products/update",require("./update"))
//Render Dashboard
router.get("/", async (req,res)=>{
    try{
        if(!req.session.admin){
         return res.redirect("/admin/login")
        
    }

        const dashData = await dash_model.findOne({})

        if(!dashData){
            return res.status(500).send("Dashboard data missing")
        }

        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const day = String(now.getDate()).padStart(2, "0")

        const today = `${year}-${month}-${day}`
        const thisMonth = `${year}-${month}`

        // ---- Daily Reset ----
        if(dashData.currentDate !== today){

            await dash_model.updateOne({},{
                $set:{
                    "brandOrders.ordersToday":0,
                    "brandOrders.ordersDeliveredToday":0,
                    "brandOrders.ordersInstoreToday":0,
                    "brandOrders.ordersReturnedToday":0,
                    "brandRevenue.revenueToday":0,
                    "brandRevenue.gstToday":0,
                    "brandRevenue.cgstToday":0,
                    "brandRevenue.sgstToday":0,
                    "brandRevenue.igstToday":0,
                    "adminSeshActions.productAdded":0,
                    "adminSeshActions.productDeleted":0,
                    "adminSeshActions.productUpdated":0,
                    "adminSeshActions.message":"",
                    "adminSeshActions.messageHead":"",
                    currentDate : today
                }
            })

            dashData.currentDate = today
        }

        // ---- Monthly Reset ----
        if(dashData.currentMonth !== thisMonth){

            await dash_model.updateOne({},{
                $set:{
                    "brandOrders.ordersMonth":0,
                    "brandRevenue.revenueMonth":0,
                    "brandRevenue.gstMonth":0,
                    currentMonth : thisMonth
                }
            })

            dashData.currentMonth = thisMonth
        }

        // ---- Stock Counts ----
        dashData.brandStock.total = await product_model.countDocuments()
        dashData.brandStock.inStock = await product_model.countDocuments({stock:{$gt:0}})
        dashData.brandStock.outStock = await product_model.countDocuments({stock:0})

        return res.render("admin/dashboard",{
            display:" Dashboard",
            dashData,
            user:req.session.admin,
            userDP:req.session.adminDP,
            loginType:req.session.loginType
        })

    }catch(err){
        console.error("Error : Get-Dashboard Request",err)
        return res.status(500).send("Internal Server Error")
    }
})

//Exports - 
module.exports = router