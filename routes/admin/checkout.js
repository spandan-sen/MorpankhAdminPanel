const express = require("express")
const {product_model,tax_model,invoice_model,draft_model} = require("../../config/database")
const router = express.Router()
router.get("/", async (req,res)=>{
    
    const data = await product_model.find().lean()
    const tax_data = await tax_model.find().lean()
    const invoice_data = await invoice_model.find()
    console.log(tax_data)
    console.log(data)
    res.render("admin/checkout",{"display":"Checkout",data,tax_data,invoice_data, userDP:req.session.adminDP})
})

router.post("/orderConfirmation/:order_id", async (req, res) => {
    try {
        await draft_model.deleteMany({})
        await draft_model.create({ orderObject: req.body })
        req.session.whatsappInvoiceConf = req.body.whatsappConf

        console.log(`Draft Order Object Created for Order ID : ${req.params.order_id} `)
        console.log(`Order data received for id : ${req.params.order_id}`, req.body)

        res.json({ success: true, message: "Order completed successfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Error processing order" })
    }
})

module.exports = router
