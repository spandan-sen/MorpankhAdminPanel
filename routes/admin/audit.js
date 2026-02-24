const express = require("express")
const {product_model,dash_model} = require("../../config/database")
const router = express.Router()
router.get("/",(req,res)=>{
    res.render("admin/audit",{
        "display":"Audit Log",
    userDP:req.session.adminDP})
})
module.exports=router